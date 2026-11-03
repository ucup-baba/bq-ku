/**
 * Kelas DDC yang dipakai Perpus BQ (subset DDC baku, cukup untuk koleksi saat ini).
 * Tambah baris di sini bila perlu kelas baru; AI & form hanya boleh memilih dari daftar ini.
 */
export type Bahasa = 'id' | 'en';
export type Genre =
  | 'islam' | 'agama' | 'sastra' | 'pengembangan_diri' | 'sains' | 'teknologi' | 'ekonomi_bisnis'
  | 'sosial' | 'bahasa' | 'filsafat' | 'sejarah' | 'seni' | 'referensi' | 'lainnya';
export type KelasDdc = { kode: string; id: string; en: string; genre: Genre };

export const LABEL_GENRE: Record<Genre, Record<Bahasa, string>> = {
  islam: { id: 'Islam', en: 'Islam' },
  agama: { id: 'Agama', en: 'Religion' },
  sastra: { id: 'Sastra & fiksi', en: 'Literature & fiction' },
  pengembangan_diri: { id: 'Pengembangan diri', en: 'Self-development' },
  sains: { id: 'Sains', en: 'Science' },
  teknologi: { id: 'Teknologi & komputer', en: 'Technology & computing' },
  ekonomi_bisnis: { id: 'Ekonomi & bisnis', en: 'Economics & business' },
  sosial: { id: 'Ilmu sosial', en: 'Social sciences' },
  bahasa: { id: 'Bahasa', en: 'Language' },
  filsafat: { id: 'Filsafat', en: 'Philosophy' },
  sejarah: { id: 'Sejarah & geografi', en: 'History & geography' },
  seni: { id: 'Seni & komik', en: 'Arts & comics' },
  referensi: { id: 'Referensi', en: 'Reference' },
  lainnya: { id: 'Lainnya', en: 'Other' },
};

export const KELAS_DDC: KelasDdc[] = [
  { kode: '004', id: 'Komputer & internet', en: 'Computers & internet', genre: 'teknologi' },
  { kode: '005', id: 'Pemrograman', en: 'Programming', genre: 'teknologi' },
  { kode: '006', id: 'Desain grafis & multimedia', en: 'Graphics & multimedia', genre: 'teknologi' },
  { kode: '030', id: 'Ensiklopedia', en: 'Encyclopedias', genre: 'referensi' },
  { kode: '100', id: 'Filsafat', en: 'Philosophy', genre: 'filsafat' },
  { kode: '150', id: 'Psikologi', en: 'Psychology', genre: 'pengembangan_diri' },
  { kode: '158', id: 'Psikologi terapan & pengembangan diri', en: 'Applied psychology & self-help', genre: 'pengembangan_diri' },
  { kode: '200', id: 'Agama', en: 'Religion', genre: 'agama' },
  { kode: '297', id: 'Islam', en: 'Islam', genre: 'islam' },
  { kode: '297.1', id: "Al-Qur'an & Hadis", en: "Qur'an & Hadith", genre: 'islam' },
  { kode: '297.4', id: 'Fikih', en: 'Islamic jurisprudence', genre: 'islam' },
  { kode: '297.5', id: 'Akhlak & tasawuf', en: 'Islamic ethics & Sufism', genre: 'islam' },
  { kode: '297.9', id: 'Sejarah & tokoh Islam', en: 'Islamic history & figures', genre: 'islam' },
  { kode: '302', id: 'Komunikasi & interaksi sosial', en: 'Communication & social interaction', genre: 'sosial' },
  { kode: '320', id: 'Ilmu politik', en: 'Political science', genre: 'sosial' },
  { kode: '330', id: 'Ekonomi', en: 'Economics', genre: 'ekonomi_bisnis' },
  { kode: '332', id: 'Keuangan', en: 'Finance', genre: 'ekonomi_bisnis' },
  { kode: '370', id: 'Pendidikan', en: 'Education', genre: 'sosial' },
  { kode: '398', id: 'Cerita rakyat', en: 'Folklore', genre: 'sastra' },
  { kode: '400', id: 'Bahasa', en: 'Language', genre: 'bahasa' },
  { kode: '492.7', id: 'Bahasa Arab', en: 'Arabic language', genre: 'bahasa' },
  { kode: '499.222', id: 'Bahasa Jawa', en: 'Javanese language', genre: 'bahasa' },
  { kode: '500', id: 'Sains', en: 'Science', genre: 'sains' },
  { kode: '510', id: 'Matematika', en: 'Mathematics', genre: 'sains' },
  { kode: '520', id: 'Astronomi', en: 'Astronomy', genre: 'sains' },
  { kode: '590', id: 'Hewan', en: 'Animals', genre: 'sains' },
  { kode: '600', id: 'Teknologi', en: 'Technology', genre: 'teknologi' },
  { kode: '630', id: 'Pertanian', en: 'Agriculture', genre: 'teknologi' },
  { kode: '641', id: 'Makanan & masakan', en: 'Food & cooking', genre: 'teknologi' },
  { kode: '649', id: 'Pengasuhan anak', en: 'Parenting', genre: 'pengembangan_diri' },
  { kode: '650', id: 'Bisnis & manajemen', en: 'Business & management', genre: 'ekonomi_bisnis' },
  { kode: '700', id: 'Seni', en: 'Arts', genre: 'seni' },
  { kode: '741.5', id: 'Komik', en: 'Comics', genre: 'seni' },
  { kode: '800', id: 'Sastra', en: 'Literature', genre: 'sastra' },
  { kode: '808', id: 'Retorika & menulis', en: 'Rhetoric & writing', genre: 'sastra' },
  { kode: '813', id: 'Sastra Amerika', en: 'American literature', genre: 'sastra' },
  { kode: '823', id: 'Sastra Inggris', en: 'English literature', genre: 'sastra' },
  { kode: '839.82', id: 'Sastra Norwegia', en: 'Norwegian literature', genre: 'sastra' },
  { kode: '869', id: 'Sastra Portugis', en: 'Portuguese literature', genre: 'sastra' },
  { kode: '892.7', id: 'Sastra Arab', en: 'Arabic literature', genre: 'sastra' },
  { kode: '895.6', id: 'Sastra Jepang', en: 'Japanese literature', genre: 'sastra' },
  { kode: '899.221', id: 'Sastra Indonesia', en: 'Indonesian literature', genre: 'sastra' },
  { kode: '900', id: 'Sejarah & geografi', en: 'History & geography', genre: 'sejarah' },
  { kode: '912', id: 'Atlas & peta', en: 'Atlases & maps', genre: 'sejarah' },
  { kode: '920', id: 'Biografi', en: 'Biography', genre: 'sejarah' },
  { kode: '959.8', id: 'Sejarah Indonesia', en: 'History of Indonesia', genre: 'sejarah' },
];

const PER_KODE = new Map(KELAS_DDC.map(k => [k.kode, k]));

export function kelasSah(kode: string): boolean {
  return PER_KODE.has(kode);
}

/** Kelas terdaftar dengan kode persis, atau awalan terpanjang (297.12 → 297.1). */
function cariKelas(kode: string): KelasDdc | undefined {
  if (!kode) return undefined;
  return PER_KODE.get(kode)
    ?? KELAS_DDC.filter(k => kode.startsWith(k.kode)).sort((a, b) => b.kode.length - a.kode.length)[0];
}

export function genreDari(kode: string): Genre {
  return cariKelas(kode)?.genre ?? 'lainnya';
}

export function labelKelas(kode: string, bahasa: Bahasa): string {
  const k = cariKelas(kode);
  return k ? k[bahasa] : kode;
}
