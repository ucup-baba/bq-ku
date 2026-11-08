import { NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { listBukuStiker, muatRiwayat } from '@/lib/db/perpus-cek-repo';
import { hilangBeruntun, type HasilCek } from '@/lib/perpus/cek';
import { galatCek } from '@/lib/perpus/cek-respon';

/** Ringkasan per bulan dan buku yang hilang di bulan-bulan terakhir berturut-turut. */
export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    const [riwayat, buku] = await Promise.all([muatRiwayat(supabase), listBukuStiker(supabase)]);
    const sesi = riwayat.map(r => ({
      id: r.id, periode: r.periode, selesaiAt: r.selesaiAt,
      dicek: r.item.length,
      ada: r.item.filter(i => i.hasil === 'ada').length,
      rusak: r.item.filter(i => i.hasil === 'rusak').length,
      hilang: r.item.filter(i => i.hasil === 'hilang').length,
    }));
    const beruntun = hilangBeruntun(riwayat.map(r => ({
      periode: r.periode, hasil: Object.fromEntries(r.item.map(i => [i.bukuId, i.hasil])) as Record<string, HasilCek>,
    })));
    const nomor = new Map(buku.map(b => [b.id, b.nomorPanggil]));
    const hilang = Object.entries(beruntun).filter(([, n]) => n >= 2).map(([bukuId, bulan]) => ({ bukuId, nomorPanggil: nomor.get(bukuId) ?? '—', bulan }));
    return NextResponse.json({ success: true, data: { sesi, hilang } });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal memuat riwayat cek');
  }
}
