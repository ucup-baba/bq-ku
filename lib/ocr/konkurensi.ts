/**
 * Menjalankan `fn` untuk setiap elemen dengan paling banyak `batas` tugas berjalan bersamaan.
 * Urutan hasil mengikuti urutan masukan.
 */
export async function petakanTerbatas<T, R>(daftar: T[], batas: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const hasil = new Array<R>(daftar.length);
  let berikut = 0;
  const pekerja = Array.from({ length: Math.max(1, Math.min(batas, daftar.length)) }, async () => {
    while (berikut < daftar.length) {
      const i = berikut++;
      hasil[i] = await fn(daftar[i], i);
    }
  });
  await Promise.all(pekerja);
  return hasil;
}
