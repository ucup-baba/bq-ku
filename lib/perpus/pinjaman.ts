import type { AksiPinjaman, Pinjaman, StatusPinjamBuku, StatusPinjaman } from '@/lib/perpus/tipe';

export const JATUH_TEMPO_BAWAAN_HARI = 14;
const GESER_WIB_MS = 7 * 3600_000;
const HARI_MS = 24 * 3600_000;

/** Sama dengan transisi di spec §3. `acc`, `batal`, `klaim` dijalankan fungsi SQL 0015; sisanya oleh repo. */
export const ATURAN: Record<AksiPinjaman, { dari: StatusPinjaman; ke: StatusPinjaman }> = {
  acc: { dari: 'diajukan', ke: 'dipinjam' },
  tolak: { dari: 'diajukan', ke: 'ditolak' },
  batal: { dari: 'diajukan', ke: 'dibatalkan' },
  klaim: { dari: 'dipinjam', ke: 'menunggu_verifikasi' },
  verifikasi: { dari: 'menunggu_verifikasi', ke: 'dikembalikan' },
  tandai_kembali: { dari: 'dipinjam', ke: 'dikembalikan' },
  perpanjang: { dari: 'dipinjam', ke: 'dipinjam' },
};

export const transisi = (status: StatusPinjaman, aksi: AksiPinjaman): StatusPinjaman | null =>
  (ATURAN[aksi].dari === status ? ATURAN[aksi].ke : null);

export const LABEL_STATUS: Record<StatusPinjaman, string> = {
  diajukan: 'Diajukan', dipinjam: 'Dipinjam', menunggu_verifikasi: 'Menunggu verifikasi',
  dikembalikan: 'Dikembalikan', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan',
};

export const hariIniWib = (sekarang = new Date()) => new Date(sekarang.getTime() + GESER_WIB_MS).toISOString().slice(0, 10);
export const tambahHari = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * HARI_MS).toISOString().slice(0, 10);
export const jatuhTempoBawaan = (sekarang = new Date()) => tambahHari(hariIniWib(sekarang), JATUH_TEMPO_BAWAAN_HARI);

export const terlambat = (p: Pick<Pinjaman, 'status' | 'jatuhTempo'>, hari: string) =>
  p.status === 'dipinjam' && p.jatuhTempo !== null && p.jatuhTempo < hari;

export function susunAntrian<T extends Pick<Pinjaman, 'status' | 'jatuhTempo'>>(rows: T[], hari: string) {
  return {
    pengajuan: rows.filter(p => p.status === 'diajukan'),
    klaim: rows.filter(p => p.status === 'menunggu_verifikasi'),
    terlambat: rows.filter(p => terlambat(p, hari)),
  };
}

export type KodeGalat = 'bukan_anggota' | 'diblokir' | 'buku_tidak_ada' | 'stok_habis' | 'sudah_diajukan'
  | 'pinjaman_tidak_ada' | 'status_tidak_sah' | 'terlarang' | 'tanggal_tidak_sah';

const PESAN_GALAT: Record<KodeGalat, string> = {
  bukan_anggota: 'Lengkapi pendaftaran anggota dahulu',
  diblokir: 'Akun anggota ini diblokir',
  buku_tidak_ada: 'Buku tidak ditemukan',
  stok_habis: 'Semua eksemplar sedang dipinjam',
  sudah_diajukan: 'Buku ini sudah ada di pinjaman aktif Anda',
  pinjaman_tidak_ada: 'Pinjaman tidak ditemukan',
  status_tidak_sah: 'Status pinjaman sudah berubah',
  terlarang: 'Anda tidak memiliki hak untuk tindakan ini',
  tanggal_tidak_sah: 'Jatuh tempo tidak boleh lewat',
};

export class PinjamanError extends Error {
  constructor(public kode: KodeGalat, public statusSaatIni?: StatusPinjaman) {
    super(PESAN_GALAT[kode]); this.name = 'PinjamanError';
  }
}

/** Fungsi SQL 0015 melempar `perpus:<kode>` atau `perpus:status_tidak_sah:<status>`. */
export function galatDariRpc(pesan: string): Error {
  const m = /^perpus:([a-z_]+)(?::([a-z_]+))?$/.exec(pesan);
  if (m && m[1] in PESAN_GALAT) return new PinjamanError(m[1] as KodeGalat, m[2] as StatusPinjaman | undefined);
  return new Error(`Gagal memproses pinjaman: ${pesan}`);
}

const tanggalPanjang = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function pesanPengingatWa(p: { nama: string; judul: string; jatuhTempo: string }, hari: string): string {
  const inti = p.jatuhTempo < hari
    ? `jatuh tempo pengembalian buku *${p.judul}* sudah terlewat sejak ${tanggalPanjang(p.jatuhTempo)}`
    : `buku *${p.judul}* dijadwalkan kembali pada ${tanggalPanjang(p.jatuhTempo)}`;
  return [
    `Assalamu'alaikum ${p.nama},`,
    ``,
    `Kami mengingatkan bahwa ${inti}. Mohon dikembalikan ke Perpustakaan Baitul Qowwam, atau kabari kami bila perlu perpanjangan.`,
    ``,
    `Jazakumullahu khairan.`,
    `Pustakawan Perpus BQ`,
  ].join('\n');
}

/** Akun nonaktif milik peminjam perpus bukan calon pengguna bq-ku. */
export const bukanPeminjam = <T extends { id: string; aktif: boolean }>(rows: T[], anggota: Set<string>) =>
  rows.filter(r => r.aktif || !anggota.has(r.id));

export type TampilanPinjam = 'memuat' | 'masuk' | 'daftar' | 'sudah_ada' | 'diblokir' | 'habis' | 'bisa';

export function tampilanPinjam(s: StatusPinjamBuku | null): TampilanPinjam {
  if (!s) return 'memuat';
  if (!s.masuk) return 'masuk';
  if (!s.anggota) return 'daftar';
  if (s.pinjamanAktif) return 'sudah_ada';
  if (s.anggota === 'diblokir') return 'diblokir';
  return (s.tersedia ?? 0) < 1 ? 'habis' : 'bisa';
}
