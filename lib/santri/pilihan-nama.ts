import { toTitleCase } from '@/lib/utils/formatters';

/** Berkas yang berisi identitas orang tua, bukan santri: tidak dijadikan pilihan nama & tidak mengisi data pribadi santri. */
const BERKAS_ORTU = new Set(['KTP_ORTU']);
export const milikOrtu = (kategori: string) => BERKAS_ORTU.has(kategori);

export type PilihanNama = { nama: string; sumber: string[]; dariFormulir: boolean };
type HasilBerkas = { kategori: string; extracted?: { namaLengkap?: string } | null; error?: string };

const kunci = (nama: string) => nama.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Nama santri yang terbaca dari berkas hasil pindai (tanpa berkas orang tua), digabung per ejaan; plus nama di formulir bila berbeda. */
export function kumpulkanNama(hasil: HasilBerkas[], namaFormulir?: string): PilihanNama[] {
  const peta = new Map<string, PilihanNama>();
  for (const r of hasil) {
    const nama = r.extracted?.namaLengkap?.trim();
    if (!nama || r.error || milikOrtu(r.kategori)) continue;
    const k = kunci(nama);
    const ada = peta.get(k);
    if (ada) { if (!ada.sumber.includes(r.kategori)) ada.sumber.push(r.kategori); }
    else peta.set(k, { nama: toTitleCase(nama), sumber: [r.kategori], dariFormulir: false });
  }
  const pilihan = [...peta.values()];
  const form = namaFormulir?.trim();
  if (form) {
    const sama = peta.get(kunci(form));
    if (sama) sama.dariFormulir = true;
    else pilihan.push({ nama: form, sumber: [], dariFormulir: true });
  }
  return pilihan;
}

/** Pilihan bawaan: nama dari Akta (dokumen hukum nama), selain itu yang paling banyak sumbernya. */
export function namaBawaan(pilihan: PilihanNama[]): string {
  const akta = pilihan.find(p => p.sumber.includes('AKTA_KELAHIRAN'));
  if (akta) return akta.nama;
  const terbanyak = [...pilihan].sort((a, b) => b.sumber.length - a.sumber.length)[0];
  return terbanyak?.nama ?? '';
}
