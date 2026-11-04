export type AsalBuku = 'koleksi_awal' | 'wakaf' | 'pengadaan';
export type StatusKode = 'baku' | 'perlu_audit';
export type JenisDonasiPerpus = 'uang' | 'buku';

export type Buku = {
  id: string; judul: string; penulis: string;
  kelasDdc: string; kodePengarang: string; kodeJudul: string; noSeri: number | null;
  nomorPanggil: string; nomorPanggilLama: string | null;
  statusKode: StatusKode; catatanAudit: string | null;
  eksemplar: number; sampulPath: string | null; asal: AsalBuku;
  donasiId: string | null; pengadaanId: string | null; aktif: boolean;
  createdAt: string; updatedAt: string; createdBy: string | null;
};

export type DonasiPerpus = {
  id: string; tanggal: string | null; tanggalTeks: string | null; nama: string;
  jenis: JenisDonasiPerpus; jumlah: number | null; jumlahBuku: number | null; catatan: string | null;
  createdAt: string; createdBy: string | null;
};

export type Pengadaan = {
  id: string; tanggal: string | null; tanggalTeks: string | null; toko: string | null;
  total: number; catatan: string | null; createdAt: string; createdBy: string | null;
};

export type RingkasanPerpus = {
  judul: number; eksemplar: number; perluAudit: number;
  totalInfaq: number; totalPengadaan: number; saldo: number; donatur: number;
};

export type BukuPublik = {
  id: string; idPendek: string; judul: string; penulis: string;
  nomorPanggil: string | null; kelasDdc: string; eksemplar: number; tersedia: number;
  sampulPath: string | null; asal: AsalBuku; namaDonatur: string | null; createdAt: string;
};

export type DonasiPublik = {
  id: string; tanggal: string | null; tanggalTeks: string | null; nama: string;
  jenis: JenisDonasiPerpus; jumlahBuku: number | null;
  buku: { idPendek: string; judul: string }[];
};

export type RingkasanPublik = {
  judul: number; eksemplar: number; donatur: number;
  totalInfaq: number; totalPengadaan: number; saldo: number; sedangDipinjam: number;
};

export const LABEL_ASAL: Record<AsalBuku, string> = {
  koleksi_awal: 'Koleksi awal', wakaf: 'Wakaf', pengadaan: 'Pengadaan',
};

export type StatusPinjaman = 'diajukan' | 'dipinjam' | 'menunggu_verifikasi' | 'dikembalikan' | 'ditolak' | 'dibatalkan';
export type AksiPinjaman = 'acc' | 'tolak' | 'batal' | 'klaim' | 'verifikasi' | 'tandai_kembali' | 'perpanjang';
export type StatusAnggota = 'aktif' | 'diblokir';

export type Anggota = { userId: string; nama: string; noWa: string; status: StatusAnggota; createdAt: string };

export type Pinjaman = {
  id: string; anggotaId: string; bukuId: string; status: StatusPinjaman; jatuhTempo: string | null;
  diajukanAt: string; disetujuiAt: string | null; diserahkanAt: string | null;
  diklaimKembaliAt: string | null; dikembalikanAt: string | null;
  diprosesOleh: string | null; catatan: string | null;
};

export type PinjamanAdmin = Pinjaman & {
  anggota: Pick<Anggota, 'nama' | 'noWa' | 'status'>;
  buku: { judul: string; penulis: string; nomorPanggil: string };
};

/** Baris view `perpus_pinjamanku`. */
export type Pinjamanku = {
  id: string; status: StatusPinjaman; jatuhTempo: string | null; diajukanAt: string;
  dikembalikanAt: string | null; catatan: string | null;
  idPendek: string; judul: string; penulis: string; nomorPanggil: string | null;
};

/** Jawaban `GET /api/perpus-publik/status`. */
export type StatusPinjamBuku = {
  masuk: boolean; anggota: StatusAnggota | null; pinjamanAktif: StatusPinjaman | null; tersedia: number | null;
};

export type AnggotaAdmin = Anggota & { pinjaman: { status: StatusPinjaman }[] };
