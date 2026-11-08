import { NextRequest, NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { muatDaftar, muatRiwayat } from '@/lib/db/perpus-cek-repo';
import { susunDaftarCek } from '@/lib/perpus/cek';
import { galatCek } from '@/lib/perpus/cek-respon';
import { toCsv } from '@/lib/utils/csv';

const LABEL = { ada: 'Ada', rusak: 'Rusak', hilang: 'Hilang' } as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const sesi = (await muatRiwayat(supabase, 60)).find(r => r.id === id);
    if (!sesi) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    const { buku, item, dipinjam } = await muatDaftar(supabase, id);
    const csv = toCsv(susunDaftarCek(buku, item, dipinjam).map(b => ({
      'Nomor panggil': b.buku.nomorPanggil, Judul: b.buku.judul, Penulis: b.buku.penulis,
      Eksemplar: b.buku.eksemplar, Dipinjam: b.dipinjam, Hasil: b.item ? LABEL[b.item.hasil] : 'Belum dicek',
      'Jumlah ditemukan': b.item?.jumlahAda ?? '', Catatan: b.item?.catatan ?? '',
    })));
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="cek-perpus-${sesi.periode}.csv"` },
    });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal menyusun CSV cek');
  }
}
