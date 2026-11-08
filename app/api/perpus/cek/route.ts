import { NextRequest, NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { ambilSesi, mulaiSesi, muatDaftar } from '@/lib/db/perpus-cek-repo';
import { periodeWib, susunDaftarCek } from '@/lib/perpus/cek';
import { galatCek } from '@/lib/perpus/cek-respon';

/** Sesi bulan berjalan (null bila belum dimulai) beserta daftar buku urut rak. */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const periode = new URL(req.url).searchParams.get('periode') ?? periodeWib();
    const sesi = await ambilSesi(supabase, periode);
    if (!sesi) return NextResponse.json({ success: true, data: { periode, sesi, baris: [] } });
    const { buku, item, dipinjam } = await muatDaftar(supabase, sesi.id);
    return NextResponse.json({ success: true, data: { periode, sesi, baris: susunDaftarCek(buku, item, dipinjam) } });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal memuat cek bulanan');
  }
}

export async function POST() {
  try {
    const { user, supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await mulaiSesi(supabase, periodeWib(), user.id) }, { status: 201 });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal memulai cek bulanan');
  }
}
