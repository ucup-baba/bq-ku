export type FilterSantri = {
  q: string;
  gender: 'SEMUA' | 'IKHWAN' | 'AKHWAT';
  jenjang: 'SEMUA' | 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
};

type SantriCari = {
  namaLengkap: string; namaPanggilan?: string | null; nik: string;
  sekolahSekarang: string; asalSekolahSebelumnya?: string | null;
  jenisKelamin: string; jenjang: string;
};

const cocokTeks = (s: SantriCari, q: string) => {
  const k = q.trim().toLowerCase();
  if (!k) return true;
  return [s.namaLengkap, s.namaPanggilan, s.nik, s.sekolahSekarang, s.asalSekolahSebelumnya]
    .some(v => (v ?? '').toLowerCase().includes(k));
};

export function saringSantri<T extends SantriCari>(list: T[], f: FilterSantri): T[] {
  return list.filter(s =>
    (f.gender === 'SEMUA' || s.jenisKelamin === f.gender) &&
    (f.jenjang === 'SEMUA' || s.jenjang === f.jenjang) &&
    cocokTeks(s, f.q));
}

/** Jumlah per chip gender, mengikuti kata kunci & jenjang yang sedang aktif. */
export function hitungGender(list: SantriCari[], q: string, jenjang: FilterSantri['jenjang']) {
  const dasar = list.filter(s => (jenjang === 'SEMUA' || s.jenjang === jenjang) && cocokTeks(s, q));
  return {
    SEMUA: dasar.length,
    IKHWAN: dasar.filter(s => s.jenisKelamin === 'IKHWAN').length,
    AKHWAT: dasar.filter(s => s.jenisKelamin === 'AKHWAT').length,
  };
}
