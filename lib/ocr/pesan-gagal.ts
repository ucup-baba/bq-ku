/** Pesan galat pindai yang bisa dipahami panitia, dari status & isi respons server. */
export function pesanGagalPindai(status: number, isi: string): string {
  if (status === 504 || /FUNCTION_INVOCATION_TIMEOUT|timed? ?out/i.test(isi)) {
    return 'Waktu habis — layanan AI sedang lambat. Coba lagi sebentar lagi.';
  }
  if (status === 413 || /Request Entity Too Large/i.test(isi)) return 'Ukuran berkas terlalu besar untuk dipindai.';
  if (status === 401) return 'Sesi berakhir. Silakan masuk lagi.';
  if (status === 403) return 'Anda tidak memiliki izin memindai berkas.';
  try {
    const json = JSON.parse(isi);
    if (json?.error) return String(json.error);
  } catch { /* bukan JSON */ }
  return `Gagal memindai berkas (status ${status}).`;
}
