export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variabel lingkungan ${name} belum diset. Lihat .env.example.`);
  return v;
}

/** Hanya untuk kode server. Klien browser membaca process.env.NEXT_PUBLIC_* langsung agar di-inline oleh bundler. */
export const env = {
  get SUPABASE_URL() { return requireEnv('NEXT_PUBLIC_SUPABASE_URL'); },
  get SUPABASE_ANON_KEY() { return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); },
  get SUPABASE_SERVICE_ROLE_KEY() { return requireEnv('SUPABASE_SERVICE_ROLE_KEY'); },
  get STORAGE_BUCKET() { return process.env.SUPABASE_STORAGE_BUCKET || 'berkas'; },
  get APP_URL() { return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; },
};
