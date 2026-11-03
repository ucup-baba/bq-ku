import { selesaikanBentrok, kodePengarang, type BagianNomor } from '@/lib/perpus/nomor-panggil';
import type { Buku } from '@/lib/perpus/tipe';

export type BukuNomor = Pick<Buku, 'id' | 'judul' | 'penulis' | 'kodePengarang' | 'kodeJudul' | 'noSeri' | 'nomorPanggil'>;
export type PerubahanNomor = BagianNomor & { id: string; nomorPanggil: string };

/**
 * Nomor panggil baru untuk buku yang diaudit. Kode pengarang dihitung ulang dari penulis (DDC baku),
 * seri lama dipertahankan. Urutan: kelas → pengarang → seri dulu → judul, supaya hasil stabil.
 * Nomor milik buku yang tidak ikut diaudit tidak boleh dipakai.
 */
export function rencanakanNomorBaru(semua: BukuNomor[], items: { id: string; kelasDdc: string }[]): PerubahanNomor[] {
  const perId = new Map(semua.map(b => [b.id, b]));
  const diubah = new Set(items.map(i => i.id));
  const terpakai = new Set(semua.filter(b => !diubah.has(b.id)).map(b => b.nomorPanggil));
  const antre = items
    .map(i => ({ item: i, buku: perId.get(i.id) }))
    .filter((x): x is { item: { id: string; kelasDdc: string }; buku: BukuNomor } => !!x.buku)
    .map(x => ({ ...x, pengarang: kodePengarang(x.buku.penulis) || x.buku.kodePengarang || 'XXX' }))
    .sort((a, b) => a.item.kelasDdc.localeCompare(b.item.kelasDdc)
      || a.pengarang.localeCompare(b.pengarang)
      || Number(b.buku.noSeri != null) - Number(a.buku.noSeri != null)
      || a.buku.judul.localeCompare(b.buku.judul, 'id'));
  return antre.map(({ item, buku, pengarang }) => {
    const seri = buku.noSeri != null && buku.kodeJudul ? { kode: buku.kodeJudul, nomor: buku.noSeri } : null;
    const hasil = selesaikanBentrok({ kelasDdc: item.kelasDdc, kodePengarang: pengarang, judul: buku.judul, seri }, terpakai);
    terpakai.add(hasil.nomorPanggil);
    return { id: buku.id, ...hasil };
  });
}

/** Label yang perlu dicetak (ulang): buku baku yang nomornya beda dari kode lama; c.N bila eksemplar > 1. */
export function barisLabel(
  buku: Pick<Buku, 'judul' | 'nomorPanggil' | 'nomorPanggilLama' | 'eksemplar' | 'statusKode'>[],
): { judul: string; lama: string; baru: string }[] {
  return buku
    .filter(b => b.statusKode === 'baku' && b.nomorPanggil !== b.nomorPanggilLama)
    .flatMap(b => Array.from({ length: b.eksemplar }, (_, i) => ({
      judul: b.judul,
      lama: b.nomorPanggilLama ?? '',
      baru: b.eksemplar > 1 ? `${b.nomorPanggil} c.${i + 1}` : b.nomorPanggil,
    })));
}

const selCsv = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export function keCsv(baris: string[][]): string {
  return baris.map(r => r.map(selCsv).join(',')).join('\r\n') + '\r\n';
}
