import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { invitePenggunaSchema } from '@/lib/validation/pengguna';
import { validationResponse } from '@/lib/validation/errors';
import { env } from '@/lib/env';

export async function GET() {
  try {
    await requireUser(['SUPERADMIN']);
    const admin = createAdminSupabase();
    const [{ data: profiles, error }, { data: users }] = await Promise.all([
      admin.from('profiles').select('*').order('createdAt', { ascending: true }),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (error) throw error;
    const last = new Map((users?.users || []).map(u => [u.id, u.last_sign_in_at || null]));
    return NextResponse.json({ success: true, data: (profiles || []).map(p => ({ ...p, lastSignInAt: last.get(p.id) ?? null })) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat pengguna: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(['SUPERADMIN']);
    const parsed = invitePenggunaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { nama, email, role } = parsed.data;
    const admin = createAdminSupabase();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nama, role },
      redirectTo: `${env.APP_URL}/auth/callback?next=/reset-password`,
    });
    if (error) {
      const dup = /already|registered|exists/i.test(error.message);
      return NextResponse.json({ error: dup ? 'Email sudah terdaftar' : 'Gagal mengundang: ' + error.message }, { status: dup ? 409 : 500 });
    }
    // Trigger membuat profil; pastikan nama/role sesuai input (idempoten)
    await admin.from('profiles').upsert({ id: data.user.id, nama, email, role, aktif: true });
    return NextResponse.json({ success: true, data: { id: data.user.id, nama, email, role, aktif: true } }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal mengundang: ' + e.message }, { status: 500 });
  }
}
