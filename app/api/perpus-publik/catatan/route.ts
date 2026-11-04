import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { identitasDari } from '@/lib/auth/identitas';
import { authErrorResponse } from '@/lib/auth/session';
import { ambilCatatanBuku, simpanCatatan } from '@/lib/db/perpus-catatan-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { createServerSupabase } from '@/lib/supabase/server';
import { catatanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

/** Tamu juga boleh membaca: catatan publik tampil di detail buku. */
export async function GET(req: NextRequest) {
  try {
    const buku = z.string().uuid().safeParse(new URL(req.url).searchParams.get('buku'));
    if (!buku.success) return NextResponse.json({ error: 'Buku tidak valid' }, { status: 400 });
    const supabase = await createServerSupabase();
    const user = await identitasDari(supabase);
    return NextResponse.json({ success: true, data: await ambilCatatanBuku(supabase, user?.id ?? null, buku.data) });
  } catch (e: unknown) {
    console.error('Catatan buku error:', e);
    return NextResponse.json({ error: 'Gagal memuat catatan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMasuk();
    const parsed = catatanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await simpanCatatan(supabase, parsed.data) }, { status: 201 });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Simpan catatan error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan catatan' }, { status: 500 });
  }
}
