/**
 * Menentukan apakah label "Donatur baru sudah tersimpan" boleh menyala pada
 * transisi donaturId dari kosong menjadi terisi.
 *
 * Label HANYA boleh menyala bila transisi ini benar-benar berasal dari alur
 * "donatur baru": pengguna sedang dalam mode tambah donatur (modeBaru) DAN
 * sudah mengetik nama SEBELUM donaturId muncul. Ini membedakannya dari alur
 * "Donasi lagi" (?donaturId=...), di mana donaturId dan nama sama-sama baru
 * terisi sekaligus (nama sebelumnya masih kosong) — donatur itu adalah
 * donatur LAMA, bukan yang baru saja disimpan.
 *
 * - Bila donaturIdSekarang kosong -> selalu false (donatur dikosongkan/diganti).
 * - Bila donaturIdSebelumnya sudah terisi -> bukan transisi baru, false
 *   (pemanggil tidak boleh mengubah state pada kasus ini, cukup pertahankan
 *   nilai sebelumnya).
 */
export function tandaiDonaturBaru(params: {
  modeBaru: boolean;
  namaSebelumnya: string;
  donaturIdSebelumnya?: string;
  donaturIdSekarang?: string;
}): boolean {
  const { modeBaru, namaSebelumnya, donaturIdSebelumnya, donaturIdSekarang } = params;
  if (!donaturIdSekarang) return false;
  if (donaturIdSebelumnya) return false;
  return modeBaru && namaSebelumnya.trim() !== '';
}
