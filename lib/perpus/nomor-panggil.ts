/**
 * Nomor panggil DDC: `[kelas] [3 huruf pengarang] [kode judul][.seri]`, mis. `899.221 LIY b.01`.
 * Semua fungsi murni; keunikan dijamin oleh selesaikanBentrok + constraint unik di database.
 */

/** Gelar & sapaan yang tidak dipakai sebagai kode pengarang (huruf kecil, tanpa titik). */
const GELAR = new Set([
  'dr', 'prof', 'h', 'hj', 'ir', 'lc', 'ma', 'mpdi', 'mpd', 'msi', 'sag', 'spd', 'mag', 'phd', 'ssi', 'se', 'mm',
  'sir', 'kh', 'ust', 'ustadz', 'ustadzah', 'syaikh', 'syekh', 'dkk', 'penerbit',
]);
/** Awalan sandang Arab yang dilekatkan dengan tanda hubung: Al-Jauziyyah → Jauziyyah. */
const SANDANG_ARAB = /^(al|el|ats|as|an|ar|ad|az|at|asy|ash)-/i;
const ARTIKEL_INGGRIS = new Set(['the', 'a', 'an']);

const hurufSaja = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '');

/** 3 huruf kapital dari nama belakang pengarang pertama. Penulis kosong → ''. */
export function kodePengarang(penulis: string): string {
  const pertama = penulis
    .replace(/[@()[\]]/g, ' ')
    .split(/&|;|\s+dan\s+/i)[0]
    .split(',')[0];
  const kata = pertama
    .replace(/\./g, ' ')
    .split(/\s+/)
    .map(k => k.replace(SANDANG_ARAB, ''))
    .map(hurufSaja)
    .filter(k => k.length > 1 && !GELAR.has(k.toLowerCase()));
  const pilih = kata.at(-1) ?? hurufSaja(pertama);
  return pilih.slice(0, 3).toUpperCase();
}

/** Judul tanpa tag [..], awalan "Penerbit X - ", dan artikel Inggris di depan. */
function kataJudul(judul: string): string[] {
  const kata = judul
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/^\s*penerbit\s+[^-]+-\s*/i, '')
    .split(/\s+/)
    .map(hurufSaja)
    .filter(Boolean);
  if (kata.length > 1 && ARTIKEL_INGGRIS.has(kata[0].toLowerCase())) kata.shift();
  return kata;
}

/** `panjang` huruf pertama judul (lintas kata bila kata pertama terlalu pendek), huruf kecil. */
export function kodeJudul(judul: string, panjang = 1): string {
  return kataJudul(judul).join('').slice(0, panjang).toLowerCase();
}

export type BagianNomor = { kelasDdc: string; kodePengarang: string; kodeJudul: string; noSeri: number | null };

export function susunNomorPanggil(b: BagianNomor): string {
  const seri = b.noSeri != null ? `.${String(b.noSeri).padStart(2, '0')}` : '';
  return `${b.kelasDdc} ${b.kodePengarang} ${b.kodeJudul}${seri}`;
}

/** Urai kode lama dari sheet ("158 NUR  T", "813 LIY b.01"); format tak dikenal → null. */
export function uraiNomorPanggil(teks: string): BagianNomor | null {
  const m = teks.trim().replace(/\s+/g, ' ').match(/^(\d{3}(?:\.\d+)?) ([A-Za-z]{2,4}) ([A-Za-z0-9]+)(?:\.(\d+))?$/);
  if (!m) return null;
  return {
    kelasDdc: m[1], kodePengarang: m[2].toUpperCase(), kodeJudul: m[3].toLowerCase(),
    noSeri: m[4] ? Number(m[4]) : null,
  };
}

export class NomorBentrokError extends Error {
  constructor(public nomor: string) { super(`Nomor panggil ${nomor} sudah dipakai`); this.name = 'NomorBentrokError'; }
}

/**
 * Susun nomor yang belum ada di `terpakai`. Non-seri: kode judul diperpanjang (r → ra → ras),
 * lalu diberi angka (r2, r3). Seri: kode judul = kode seri, tidak diubah; bentrok → galat.
 */
export function selesaikanBentrok(
  dasar: { kelasDdc: string; kodePengarang: string; judul: string; seri: { kode: string; nomor: number } | null },
  terpakai: ReadonlySet<string>,
): BagianNomor & { nomorPanggil: string } {
  const coba = (kode: string, noSeri: number | null) => {
    const bagian = { kelasDdc: dasar.kelasDdc, kodePengarang: dasar.kodePengarang, kodeJudul: kode, noSeri };
    const nomorPanggil = susunNomorPanggil(bagian);
    return terpakai.has(nomorPanggil) ? null : { ...bagian, nomorPanggil };
  };
  if (dasar.seri) {
    const kode = dasar.seri.kode.toLowerCase();
    const hasil = coba(kode, dasar.seri.nomor);
    if (!hasil) throw new NomorBentrokError(susunNomorPanggil({ ...dasar, kodeJudul: kode, noSeri: dasar.seri.nomor }));
    return hasil;
  }
  const penuh = kodeJudul(dasar.judul, 99) || 'x';
  for (let n = 1; n <= Math.min(4, penuh.length); n++) {
    const hasil = coba(penuh.slice(0, n), null);
    if (hasil) return hasil;
  }
  const akar = penuh.slice(0, 1);
  for (let i = 2; i < 100; i++) {
    const hasil = coba(`${akar}${i}`, null);
    if (hasil) return hasil;
  }
  throw new NomorBentrokError(susunNomorPanggil({ ...dasar, kodeJudul: akar, noSeri: null }));
}
