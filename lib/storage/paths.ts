const OBJECT_RE = /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/([^?]+)/;

/** Normalisasi apa pun yang dikirim client (signed URL, public URL lama, atau path) menjadi path di bucket. */
export function storagePathFromUrl(input: string, bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas'): string {
  const s = (input || '').trim();
  if (!s) throw new Error('Path berkas kosong');
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, '');
  const m = s.match(OBJECT_RE);
  if (!m || m[1] !== bucket) throw new Error('URL berkas tidak dikenal (bukan dari storage aplikasi)');
  return decodeURIComponent(m[2]);
}
