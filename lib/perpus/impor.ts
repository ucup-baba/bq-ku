/**
 * Urai ekspor CSV Google Sheets "Daftar Buku" menjadi rencana impor Perpus BQ.
 * Murni (tanpa I/O): pemanggil mengambil CSV, modul ini menyusun baris siap simpan.
 */
import { uraiNomorPanggil, susunNomorPanggil, type BagianNomor } from '@/lib/perpus/nomor-panggil';

/** CSV RFC 4180: kutip ganda, "" di dalam kutip, sel bisa memuat baris baru. */
export function uraiCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let sel = '', kini: string[] = [], dalamKutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
      else if (c === '"') dalamKutip = false;
      else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === ',') { kini.push(sel); sel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i++;
      kini.push(sel); baris.push(kini); kini = []; sel = '';
    } else sel += c;
  }
  if (sel !== '' || kini.length) { kini.push(sel); baris.push(kini); }
  return baris;
}

export const rapikan = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** Kunci pencocokan judul: huruf kecil, tanpa artikel Inggris di depan, hanya huruf & angka. */
export const kunciJudul = (s: string) =>
  rapikan(s).toLowerCase().normalize('NFD').replace(/^(the|a|an) /, '').replace(/[^a-z0-9]/g, '');

/** "Rp1.384.000" / " Rp 256.015 " → 1384000; bukan rupiah → null. */
export function uraiRupiah(s: string): number | null {
  const m = rapikan(s).match(/^Rp\s*([\d.]+)$/i);
  return m ? Number(m[1].replace(/\./g, '')) : null;
}

const BULAN: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};
/** "14/03/2025" → "2025-03-14"; "07 Juni" + tahun cadangan → "2025-06-07"; selain itu null. 1899 = sel kosong di Sheets. */
export function uraiTanggal(s: string, tahunCadangan: number | null): string | null {
  const t = rapikan(s);
  const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return Number(m[3]) < 2000 ? null : iso(Number(m[3]), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{1,2}) ([A-Za-z]+)$/);
  if (m && tahunCadangan && BULAN[m[2].toLowerCase()]) return iso(tahunCadangan, BULAN[m[2].toLowerCase()], Number(m[1]));
  return null;
}

export type BukuSheet = { no: number; penulis: string; judul: string; kodeLama: string };
export type DonasiSheet = {
  kunci: string; tanggal: string | null; tanggalTeks: string; nama: string;
  jenis: 'uang' | 'buku'; jumlah: number | null; jumlahBuku: number | null;
};
export type PengadaanSheet = { kunci: string; tanggal: string | null; tanggalTeks: string; total: number; judul: string[] };

/** Sheet "Copy of Daftar Buku": A=NO, B=Penulis (hanya baris pertama tiap kelompok), C=Judul, D=Kode. */
export function uraiBuku(baris: string[][]): BukuSheet[] {
  const awal = baris.findIndex(r => rapikan(r[0]).toUpperCase() === 'NO');
  const hasil: BukuSheet[] = [];
  let penulis = '';
  for (const r of baris.slice(awal + 1)) {
    const judul = rapikan(r[2]);
    if (!/^\d+$/.test(rapikan(r[0])) || !judul) continue;
    if (rapikan(r[1])) penulis = rapikan(r[1]).replace(/^\(|\)$|;$/g, '').trim();
    hasil.push({ no: Number(rapikan(r[0])), penulis, judul, kodeLama: rapikan(r[3]) });
  }
  return hasil;
}

/**
 * Sheet "Infaq": A–D = No, Tanggal, Nama, Jumlah ("Rp…" = uang, "19 BUKU" = buku).
 * G = donatur wakaf (berlaku sampai nama berikutnya), I = judul buku wakaf (mulai setelah sel "Judul Buku").
 */
export function uraiInfaq(baris: string[][]): { donasi: DonasiSheet[]; wakaf: { donatur: string; judul: string }[] } {
  const donasi: DonasiSheet[] = [];
  const wakaf: { donatur: string; judul: string }[] = [];
  let tahun: number | null = null;
  let donaturWakaf = '';
  let mulaiWakaf = false;
  for (const r of baris) {
    const no = rapikan(r[0]);
    if (/^\d+$/.test(no) && rapikan(r[2])) {
      const tanggal = uraiTanggal(r[1], tahun);
      if (tanggal) tahun = Number(tanggal.slice(0, 4));
      const jumlahTeks = rapikan(r[3]);
      const buku = jumlahTeks.match(/^(\d+)\s*buku$/i);
      donasi.push({
        kunci: `infaq-${no}`, tanggal, tanggalTeks: rapikan(r[1]), nama: rapikan(r[2]),
        jenis: buku ? 'buku' : 'uang', jumlah: buku ? null : uraiRupiah(jumlahTeks) ?? 0, jumlahBuku: buku ? Number(buku[1]) : null,
      });
    }
    if (rapikan(r[8]).toLowerCase() === 'judul buku') { mulaiWakaf = true; continue; }
    if (!mulaiWakaf) continue;
    if (rapikan(r[6])) donaturWakaf = rapikan(r[6]);
    if (rapikan(r[8]) && donaturWakaf) wakaf.push({ donatur: donaturWakaf, judul: rapikan(r[8]) });
  }
  return { donasi, wakaf };
}

/** Sheet "Pengadaan Buku": B=Tanggal & E=Harga hanya di baris pertama tiap pembelian; C=Nama Buku. */
export function uraiPengadaan(baris: string[][]): PengadaanSheet[] {
  const awal = baris.findIndex(r => rapikan(r[0]).toLowerCase() === 'no');
  const hasil: PengadaanSheet[] = [];
  let tahun: number | null = null;
  for (const r of baris.slice(awal + 1)) {
    const judul = rapikan(r[2]);
    if (!judul) continue;
    const tanggalTeks = rapikan(r[1]);
    if (tanggalTeks || !hasil.length) {
      const tanggal = uraiTanggal(tanggalTeks, tahun);
      if (tanggal) tahun = Number(tanggal.slice(0, 4));
      hasil.push({ kunci: `pengadaan-${hasil.length + 1}`, tanggal, tanggalTeks, total: uraiRupiah(r[4]) ?? 0, judul: [] });
    }
    hasil.at(-1)!.judul.push(judul);
  }
  return hasil;
}

export type BukuRencana = BagianNomor & {
  judul: string; penulis: string; nomorPanggil: string; nomorPanggilLama: string | null;
  eksemplar: number; asal: 'koleksi_awal' | 'wakaf' | 'pengadaan';
  donasiKunci: string | null; pengadaanKunci: string | null; catatanAudit: string | null;
};
export type RencanaImpor = {
  buku: BukuRencana[]; donasi: DonasiSheet[]; pengadaan: Omit<PengadaanSheet, 'judul'>[];
  tidakCocok: { sumber: 'wakaf' | 'pengadaan'; judul: string }[];
};

/**
 * Gabungkan ketiga sheet. Baris buku dengan judul+penulis sama → satu buku, eksemplar bertambah.
 * Kode lama yang kosong, tak terurai, atau kembar → nomor sementara TMP-<no> + catatan audit.
 * Judul wakaf diisi berurutan ke donasi buku donatur yang sama (sesuai jumlahBuku, urut tanggal).
 */
export function susunRencana(input: { buku: BukuSheet[]; infaq: ReturnType<typeof uraiInfaq>; pengadaan: PengadaanSheet[] }): RencanaImpor {
  const perKunci = new Map<string, BukuRencana>();
  const terpakai = new Set<string>();
  for (const b of input.buku) {
    const kunci = `${kunciJudul(b.judul)}|${kunciJudul(b.penulis)}`;
    const ada = perKunci.get(kunci);
    if (ada) { ada.eksemplar++; continue; }
    const urai = b.kodeLama ? uraiNomorPanggil(b.kodeLama) : null;
    let nomorPanggil = urai ? susunNomorPanggil(urai) : '';
    let catatanAudit: string | null = null;
    if (!urai) catatanAudit = b.kodeLama ? `Kode lama tak terbaca: "${b.kodeLama}"` : 'Belum berkode';
    else if (terpakai.has(nomorPanggil)) catatanAudit = `Kode kembar: ${nomorPanggil}`;
    if (catatanAudit) nomorPanggil = `TMP-${String(b.no).padStart(4, '0')}`;
    terpakai.add(nomorPanggil);
    perKunci.set(kunci, {
      kelasDdc: urai?.kelasDdc ?? '', kodePengarang: urai?.kodePengarang ?? '', kodeJudul: urai?.kodeJudul ?? '',
      noSeri: urai?.noSeri ?? null, judul: b.judul, penulis: b.penulis, nomorPanggil,
      nomorPanggilLama: b.kodeLama || null, eksemplar: 1, asal: 'koleksi_awal',
      donasiKunci: null, pengadaanKunci: null, catatanAudit,
    });
  }
  const buku = [...perKunci.values()];
  const cariBuku = (judul: string) => buku.find(b => kunciJudul(b.judul) === kunciJudul(judul));
  const tidakCocok: RencanaImpor['tidakCocok'] = [];

  const sisaPerDonatur = new Map<string, { kunci: string; sisa: number }[]>();
  for (const d of input.infaq.donasi.filter(d => d.jenis === 'buku')) {
    const k = kunciJudul(d.nama);
    sisaPerDonatur.set(k, [...(sisaPerDonatur.get(k) ?? []), { kunci: d.kunci, sisa: d.jumlahBuku ?? 0 }]);
  }
  for (const w of input.infaq.wakaf) {
    const antre = sisaPerDonatur.get(kunciJudul(w.donatur)) ?? [];
    const slot = antre.find(s => s.sisa > 0) ?? antre.at(-1);
    if (slot) slot.sisa--; // judul tak cocok tetap memakai jatah agar urutan judul berikutnya tidak bergeser
    const b = cariBuku(w.judul);
    if (!b || !slot) { tidakCocok.push({ sumber: 'wakaf', judul: w.judul }); continue; }
    b.asal = 'wakaf'; b.donasiKunci = slot.kunci;
  }
  for (const p of input.pengadaan) {
    for (const judul of p.judul) {
      const b = cariBuku(judul);
      if (!b) { tidakCocok.push({ sumber: 'pengadaan', judul }); continue; }
      b.pengadaanKunci = p.kunci;
      if (b.asal === 'wakaf') tidakCocok.push({ sumber: 'pengadaan', judul: `${judul} (juga tercatat wakaf)` });
      else b.asal = 'pengadaan';
    }
  }
  return {
    buku, donasi: input.infaq.donasi,
    pengadaan: input.pengadaan.map(({ judul: _judul, ...p }) => p), tidakCocok,
  };
}
