import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { updatePenggunaSchema } from '@/lib/validation/pengguna';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

/** id = uuid profil, atau `allowed:<email>` untuk entri yang belum pernah masuk. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { user } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const parsed = updatePenggunaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { roles, aktif } = parsed.data;
    const admin = createAdminSupabase();

    if (id.startsWith('allowed:')) {
      const email = decodeURIComponent(id.slice('allowed:'.length));
      if (aktif === false) {
        const { error } = await admin.from('allowed_emails').delete().eq('email', email);
        if (error) throw error;
        return NextResponse.json({ success: true, data: { email, dihapus: true } });
      }
      const { data, error } = await admin.from('allowed_emails').update({ roles, role: roles?.[0] }).eq('email', email).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (id === user.id && (aktif === false || (roles && !roles.includes('SUPERADMIN')))) {
      return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan atau menurunkan akun sendiri' }, { status: 400 });
    }
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (roles !== undefined) { patch.roles = roles; patch.role = roles[0]; }
    if (aktif !== undefined) patch.aktif = aktif;
    const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select().single();
    if (error) throw error;
    // Sinkronkan daftar izin agar konsisten jika akun masuk ulang
    if (roles !== undefined) await admin.from('allowed_emails').update({ roles, role: roles[0] }).eq('email', data.email);
    if (aktif === false) await admin.from('allowed_emails').delete().eq('email', data.email);
    if (aktif === true) await admin.from('allowed_emails').upsert({ email: data.email, nama: data.nama, roles: data.roles, role: data.role });
    // Lapisan kedua di sisi Auth
    if (aktif !== undefined) {
      await admin.auth.admin.updateUserById(id, { ban_duration: aktif ? 'none' : '876000h' }).catch(() => {});
    }
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memperbarui pengguna: ' + e.message }, { status: 500 });
  }
}

/** Hapus pengguna: entri izin, profil, dan akun Auth. Tidak bisa menghapus diri sendiri. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { user } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const admin = createAdminSupabase();

    if (id.startsWith('allowed:')) {
      const email = decodeURIComponent(id.slice('allowed:'.length));
      const { error } = await admin.from('allowed_emails').delete().eq('email', email);
      if (error) throw error;
      return NextResponse.json({ success: true, data: { email } });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'Anda tidak dapat menghapus akun sendiri' }, { status: 400 });
    }

    const { data: profile } = await admin.from('profiles').select('email').eq('id', id).maybeSingle();
    if (profile?.email) await admin.from('allowed_emails').delete().eq('email', profile.email);
    const { error: pErr } = await admin.from('profiles').delete().eq('id', id);
    if (pErr) throw pErr;
    const { error: aErr } = await admin.auth.admin.deleteUser(id);
    if (aErr) throw aErr;

    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menghapus pengguna: ' + e.message }, { status: 500 });
  }
}
