export type BerkasAi = { base64: string; mimeType: string };
export type HasilPanggil = { teks: string; tokenMasuk: number; tokenKeluar: number };

/** Potong isi galat HTTP agar log & catatan pemakaian tetap ringkas. */
export async function galatHttp(nama: string, res: Response): Promise<Error> {
  const isi = await res.text().catch(() => '');
  return new Error(`${nama} HTTP ${res.status}: ${isi.slice(0, 160)}`);
}
