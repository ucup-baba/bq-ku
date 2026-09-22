import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { updatePenggunaSchema } from '@/lib/validation/pengguna';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const parsed = updatePenggunaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { role, aktif } = parsed.data;
    if (id === user.id && (aktif === false || (role && role !== 'SUPERADMIN'))) {
      return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan atau menurunkan akun sendiri' }, { status: 400 });
    }
    const admin = createAdminSupabase();
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (role !== undefined) patch.role = role;
    if (aktif !== undefined) patch.aktif = aktif;
    const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select().single();
    if (error) throw error;
    // Nonaktif = blokir login di sisi Auth juga (RLS sudah menolak lewat auth_role(), ini lapisan kedua)
    if (aktif !== undefined) {
      await admin.auth.admin.updateUserById(id, { ban_duration: aktif ? 'none' : '876000h' }).catch(() => {});
    }
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memperbarui pengguna: ' + e.message }, { status: 500 });
  }
}
