import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { invitePenggunaSchema } from '@/lib/validation/pengguna';
import { validationResponse } from '@/lib/validation/errors';

/**
 * Daftar pengguna = gabungan:
 *  - profiles   → sudah pernah masuk via Google (id = auth user)
 *  - allowed_emails yang belum punya profil → "Menunggu masuk pertama"
 */
export async function GET() {
  try {
    await requireUser(['SUPERADMIN']);
    const admin = createAdminSupabase();
    const [{ data: profiles, error: e1 }, { data: allowed, error: e2 }, { data: users }] = await Promise.all([
      admin.from('profiles').select('*').order('createdAt', { ascending: true }),
      admin.from('allowed_emails').select('*').order('createdAt', { ascending: true }),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (e1) throw e1; if (e2) throw e2;
    const last = new Map((users?.users || []).map(u => [u.id, u.last_sign_in_at || null]));
    const seen = new Set((profiles || []).map(p => p.email.toLowerCase()));
    const rows = [
      ...(profiles || []).map(p => ({ ...p, status: 'PROFIL' as const, lastSignInAt: last.get(p.id) ?? null })),
      ...(allowed || []).filter(a => !seen.has(a.email.toLowerCase()))
        .map(a => ({ id: `allowed:${a.email}`, nama: a.nama, email: a.email, roles: a.roles ?? [], aktif: true, createdAt: a.createdAt, status: 'MENUNGGU' as const, lastSignInAt: null })),
    ];
    return NextResponse.json({ success: true, data: rows });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat pengguna: ' + e.message }, { status: 500 });
  }
}

/**
 * Tambah email yang diizinkan masuk (upsert). Jika akun sudah pernah masuk, trigger DB langsung mengaktifkannya.
 * Kolom lama `role` tidak ditulis: trigger `sinkron_role_roles` (migrasi 0005) menurunkannya dari `roles`.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser(['SUPERADMIN']);
    const parsed = invitePenggunaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { nama, email, roles } = parsed.data;
    const admin = createAdminSupabase();
    const { error } = await admin.from('allowed_emails').upsert({ email, nama, roles });
    if (error) throw error;
    return NextResponse.json({ success: true, data: { email, nama, roles } }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menambah email: ' + e.message }, { status: 500 });
  }
}
