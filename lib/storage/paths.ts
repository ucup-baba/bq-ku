const OBJECT_RE = /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/([^?]+)/;

/**
 * True bila `path` (sudah dinormalisasi, tanpa slash di depan) menunjuk ke
 * folder `surat/` — PNG surat ucapan terima kasih donatur, yang hanya boleh
 * dibaca/dihapus oleh peran ruang donatur (lihat RLS storage di
 * supabase/migrations/0005_akses_ruangan.sql). Hanya segmen folder PERTAMA
 * yang dicocokkan persis 'surat', jadi 'surat-lama/x.pdf' tetap DITERIMA.
 */
export function isPathSuratDonatur(path: string): boolean {
  const firstSegment = path.split('/')[0];
  return firstSegment === 'surat';
}

/**
 * Menolak path yang berbahaya atau menabrak ruang akses lain:
 *  - segmen '..' atau '.' (traversal),
 *  - backslash (bukan pemisah folder yang dikenal storage/RLS berbasis '/'),
 *  - folder 'surat/' (aset ruang donatur; lihat isPathSuratDonatur).
 */
function assertPathAman(path: string): void {
  if (path.includes('\\')) {
    throw new Error('Path berkas tidak boleh mengandung backslash');
  }
  const segments = path.split('/');
  if (segments.some((seg) => seg === '..' || seg === '.')) {
    throw new Error('Path berkas tidak boleh mengandung segmen "." atau ".."');
  }
  if (isPathSuratDonatur(path)) {
    throw new Error('Path berkas surat donatur tidak boleh dipakai untuk dokumen/foto santri');
  }
}

/** Normalisasi apa pun yang dikirim client (signed URL, public URL lama, atau path) menjadi path di bucket. */
export function storagePathFromUrl(input: string, bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas'): string {
  const s = (input || '').trim();
  if (!s) throw new Error('Path berkas kosong');
  let result: string;
  if (!/^https?:\/\//i.test(s)) {
    result = s.replace(/^\/+/, '');
  } else {
    const m = s.match(OBJECT_RE);
    if (!m || m[1] !== bucket) throw new Error('URL berkas tidak dikenal (bukan dari storage aplikasi)');
    result = decodeURIComponent(m[2]);
  }
  assertPathAman(result);
  return result;
}
