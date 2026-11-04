import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { identitasDari } from '@/lib/auth/identitas';
import { ambilStatusPinjam } from '@/lib/db/perpus-pinjaman-repo';
import { createServerSupabase } from '@/lib/supabase/server';

/** Tamu juga boleh: tombol Pinjam memakai jawaban ini untuk memilih tampilan, dan stok di halaman bisa tertinggal 5 menit. */
export async function GET(req: NextRequest) {
  try {
    const buku = z.string().uuid().safeParse(new URL(req.url).searchParams.get('buku'));
    if (!buku.success) return NextResponse.json({ error: 'Buku tidak valid' }, { status: 400 });
    const supabase = await createServerSupabase();
    const user = await identitasDari(supabase);
    return NextResponse.json({ success: true, data: await ambilStatusPinjam(supabase, user?.id ?? null, buku.data) });
  } catch (e: unknown) {
    console.error('Status pinjam error:', e);
    return NextResponse.json({ error: 'Gagal memuat status' }, { status: 500 });
  }
}
