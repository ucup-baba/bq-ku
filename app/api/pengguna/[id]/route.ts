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
    const { role, aktif } = parsed.data;
    const admin = createAdminSupabase();

    if (id.startsWith('allowed:')) {
      const email = decodeURIComponent(id.slice('allowed:'.length));
      if (aktif === false) {
        const { error } = await admin.from('allowed_emails').delete().eq('email', email);
        if (error) throw error;
        return NextResponse.json({ success: true, data: { email, dihapus: true } });
      }
      const { data, error } = await admin.from('allowed_emails').update({ role }).eq('email', email).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (id === user.id && (aktif === false || (role && role !== 'SUPERADMIN'))) {
      return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan atau menurunkan akun sendiri' }, { status: 400 });
    }
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (role !== undefined) patch.role = role;
    if (aktif !== undefined) patch.aktif = aktif;
    const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select().single();
    if (error) throw error;
    // Sinkronkan daftar izin agar konsisten jika akun masuk ulang
    if (role !== undefined) await admin.from('allowed_emails').update({ role }).eq('email', data.email);
    if (aktif === false) await admin.from('allowed_emails').delete().eq('email', data.email);
    if (aktif === true) await admin.from('allowed_emails').upsert({ email: data.email, nama: data.nama, role: data.role });
    // Lapisan kedua di sisi Auth
    if (aktif !== undefined) {
      await admin.auth.admin.updateUserById(id, { ban_duration: aktif ? 'none' : '876000h' }).catch(() => {});
    }
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memperbarui pengguna: ' + e.message }, { status: 500 });
  }
}
