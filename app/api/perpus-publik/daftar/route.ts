import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { daftarAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { daftarAnggotaSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMasuk();
    const parsed = daftarAnggotaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await daftarAnggota(supabase, parsed.data) }, { status: 201 });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Daftar anggota error:', e);
    return NextResponse.json({ error: 'Gagal mendaftar' }, { status: 500 });
  }
}
