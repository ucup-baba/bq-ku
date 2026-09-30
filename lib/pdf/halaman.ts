import { PDFDocument } from 'pdf-lib';

/** PDF baru berisi `halaman` terpilih (nomor mulai 1) dalam urutan naik — dipakai sebelum unggah agar halaman lain tidak dipindai. */
export async function ambilHalamanPdf(sumber: ArrayBuffer | Uint8Array, halaman: number[]): Promise<Uint8Array> {
  if (halaman.length === 0) throw new Error('Pilih minimal satu halaman.');
  const asal = await PDFDocument.load(sumber, { ignoreEncryption: true });
  const baru = await PDFDocument.create();
  const urut = [...new Set(halaman)].sort((a, b) => a - b).map(n => n - 1);
  for (const p of await baru.copyPages(asal, urut)) baru.addPage(p);
  return baru.save();
}

/** [1,2,3,5] → "1–3, 5" */
export function ringkasHalaman(halaman: number[]): string {
  const urut = [...new Set(halaman)].sort((a, b) => a - b);
  const bagian: string[] = [];
  for (let i = 0; i < urut.length; i++) {
    let j = i;
    while (j + 1 < urut.length && urut[j + 1] === urut[j] + 1) j++;
    bagian.push(j > i ? `${urut[i]}–${urut[j]}` : String(urut[i]));
    i = j;
  }
  return bagian.join(', ');
}

/** "berkas.pdf" → "berkas (hal 4–5 dari 6).pdf"; semua halaman terpilih → nama asli. */
export function namaBerkasTerpilih(nama: string, halaman: number[], total: number): string {
  if (new Set(halaman).size >= total) return nama;
  const dasar = nama.replace(/\.pdf$/i, '');
  return `${dasar} (hal ${ringkasHalaman(halaman)} dari ${total}).pdf`;
}
