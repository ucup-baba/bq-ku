/**
 * Domain berkas lembaga: jenis tetap, status masa berlaku, dan validasi unggah.
 * Dipakai bersama klien & server (tanpa dependensi server).
 */
export type JenisBerkas =
  | 'SK_KEMENKUMHAM' | 'AKTA_PENDIRIAN' | 'AKTA_PERUBAHAN' | 'NPWP' | 'IZIN_OPERASIONAL'
  | 'AKREDITASI' | 'REKENING_BANK' | 'CAP' | 'TANDA_TANGAN' | 'LAINNYA';

export const JENIS_BERKAS: ReadonlyArray<{ kunci: JenisBerkas; label: string; rahasia: boolean }> = [
  { kunci: 'SK_KEMENKUMHAM', label: 'SK Kemenkumham', rahasia: false },
  { kunci: 'AKTA_PENDIRIAN', label: 'Akta pendirian', rahasia: false },
  { kunci: 'AKTA_PERUBAHAN', label: 'Akta perubahan', rahasia: false },
  { kunci: 'NPWP', label: 'NPWP', rahasia: false },
  { kunci: 'IZIN_OPERASIONAL', label: 'Izin operasional', rahasia: false },
  { kunci: 'AKREDITASI', label: 'Sertifikat akreditasi', rahasia: false },
  { kunci: 'REKENING_BANK', label: 'Rekening bank', rahasia: false },
  { kunci: 'CAP', label: 'Cap / stempel', rahasia: true },
  { kunci: 'TANDA_TANGAN', label: 'Tanda tangan ketua', rahasia: true },
  { kunci: 'LAINNYA', label: 'Lainnya', rahasia: false },
];

const PETA = new Map(JENIS_BERKAS.map(j => [j.kunci as string, j]));

export const jenisDikenal = (j: string): j is JenisBerkas => PETA.has(j);
export const jenisRahasia = (j: string) => PETA.get(j)?.rahasia ?? false;
export const labelJenisBerkas = (j: string) => PETA.get(j)?.label ?? j;

export type StatusMasaBerlaku = 'tanpa-batas' | 'berlaku' | 'segera' | 'mendesak' | 'kedaluwarsa';

/** Selisih hari kalender (lokal) dari hariIni ke tanggal 'YYYY-MM-DD'. */
export function sisaHari(berlakuSampai: string, hariIni: Date): number {
  const [y, m, d] = berlakuSampai.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const kini = Date.UTC(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate());
  return Math.round((target - kini) / 86_400_000);
}

/** ≤ 90 hari "segera urus", ≤ 30 hari "mendesak", lewat hari ini "kedaluwarsa". */
export function statusMasaBerlaku(berlakuSampai: string | null | undefined, hariIni: Date): StatusMasaBerlaku {
  if (!berlakuSampai) return 'tanpa-batas';
  const sisa = sisaHari(berlakuSampai, hariIni);
  if (sisa < 0) return 'kedaluwarsa';
  if (sisa <= 30) return 'mendesak';
  if (sisa <= 90) return 'segera';
  return 'berlaku';
}

export const UKURAN_MAKS = 10 * 1024 * 1024;
export const MIME_DIIZINKAN: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Pesan galat, atau null bila berkas boleh diunggah. */
export function validasiUnggah({ jenis, mime, ukuran }: { jenis: string; mime: string; ukuran: number }): string | null {
  if (!jenisDikenal(jenis)) return 'Jenis berkas tidak dikenal';
  if (jenisRahasia(jenis) && mime !== 'image/png') return 'Cap dan tanda tangan harus berupa PNG berlatar transparan';
  if (!MIME_DIIZINKAN[mime]) return 'Format berkas harus PDF, JPG, atau PNG';
  if (ukuran <= 0) return 'Berkas kosong';
  if (ukuran > UKURAN_MAKS) return 'Ukuran berkas maksimal 10 MB';
  return null;
}

export type StatusTautan = 'aktif' | 'kedaluwarsa' | 'dicabut' | 'batas-habis';

export function statusTautan(
  t: { dicabutAt: string | null; kedaluwarsaAt: string; batasBuka: number | null; jumlahBuka: number }, sekarang = Date.now(),
): StatusTautan {
  if (t.dicabutAt) return 'dicabut';
  if (Date.parse(t.kedaluwarsaAt) <= sekarang) return 'kedaluwarsa';
  if (t.batasBuka !== null && t.jumlahBuka >= t.batasBuka) return 'batas-habis';
  return 'aktif';
}

const KATA_AKSI: Record<string, string> = {
  LIHAT: 'membuka', UNDUH: 'mengunduh', UNGGAH: 'mengunggah', VERSI_BARU: 'mengganti versi', UBAH_DATA: 'mengubah data',
  HAPUS: 'menghapus', BUAT_TAUTAN: 'membuat tautan', CABUT_TAUTAN: 'mencabut tautan', BUKA_TAUTAN: 'membuka tautan',
  UNDUH_TAUTAN: 'mengunduh lewat tautan', PIN_SALAH: 'salah memasukkan PIN',
};

/**
 * Kalimat catatan akses, mis. "CSR Bank X mengunduh lewat tautan NPWP (diunduh)".
 * Pelaku: nama akun, atau penerima tautan untuk akses publik.
 */
export function kalimatLog(
  l: { aksi: string; userId: string | null; namaPengguna?: string | null; berkasId: string | null; tautanId: string | null; rincian: string | null },
  labelBerkas: Record<string, string>, penerimaTautan: Record<string, string>,
): string {
  const pelaku = l.userId ? (l.namaPengguna || 'Pengguna') : (l.tautanId && penerimaTautan[l.tautanId]) || 'Penerima tautan';
  const objek = l.berkasId ? (labelBerkas[l.berkasId] ?? 'berkas terhapus') : l.tautanId && l.userId ? `untuk ${penerimaTautan[l.tautanId] ?? '—'}` : '';
  return [pelaku, KATA_AKSI[l.aksi] ?? l.aksi.toLowerCase(), objek, l.rincian ? `(${l.rincian})` : ''].filter(Boolean).join(' ');
}
