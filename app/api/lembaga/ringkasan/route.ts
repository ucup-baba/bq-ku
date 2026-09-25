import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilStatusBerkas } from '@/lib/db/lembaga-repo';
import { isTanggalIso } from '@/lib/validation/query';
import {
  hitungRingkasan, rentangLembaga, PERIODE_LEMBAGA, type PeriodeLembaga,
  type BarisSantriRingkas, type BarisDonasiRingkas, type BarisSuratRingkas,
} from '@/lib/lembaga/ringkasan';

/**
 * Semua angka beranda Ruang Lembaga dalam satu respons. `hariIni` dikirim perangkat
 * pengguna agar batas bulan mengikuti WIB, bukan jam server (UTC).
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const p = new URL(req.url).searchParams;
    const periode = (p.get('periode') || 'bulan-ini') as PeriodeLembaga;
    if (!PERIODE_LEMBAGA.includes(periode)) return NextResponse.json({ error: 'Periode tidak dikenal' }, { status: 400 });
    const hariIniParam = p.get('hariIni');
    if (hariIniParam && !isTanggalIso(hariIniParam)) return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    const hariIni = hariIniParam ? new Date(`${hariIniParam}T00:00:00`) : new Date();

    const [santri, donasi, donatur, surat, statusBerkas] = await Promise.all([
      supabase.from('santri').select('id, namaLengkap, jenjang, jenisKelamin, statusSosial'),
      supabase.from('donasi').select('donaturId, tanggal, bentuk, nominal, jenis'),
      supabase.from('donatur').select('id', { head: true, count: 'exact' }),
      supabase.from('surat').select('tanggalSurat, terkirimWa'),
      ambilStatusBerkas(supabase),
    ]);
    for (const r of [santri, donasi, donatur, surat]) if (r.error) throw r.error;

    const data = hitungRingkasan({
      hariIni,
      periode: rentangLembaga(periode, hariIni),
      santri: (santri.data ?? []) as BarisSantriRingkas[],
      statusBerkas,
      donasi: (donasi.data ?? []) as BarisDonasiRingkas[],
      jumlahDonatur: donatur.count ?? 0,
      surat: (surat.data ?? []) as BarisSuratRingkas[],
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ringkasan lembaga error:', e);
    return NextResponse.json({ error: 'Gagal memuat ringkasan' }, { status: 500 });
  }
}
