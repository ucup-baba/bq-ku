import type { SupabaseClient } from '@supabase/supabase-js';

export const SIGNED_URL_TTL = 3600;

/** Membuat signed URL sekaligus. Path yang gagal ditandatangani dipetakan ke '' (jangan sampai satu berkas rusak merobohkan halaman). */
export async function signPaths(
  client: SupabaseClient,
  paths: Array<string | null | undefined>,
  bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas',
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (unique.length === 0) return {};
  const { data, error } = await client.storage.from(bucket).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return Object.fromEntries(unique.map(p => [p, '']));
  const out: Record<string, string> = {};
  for (const row of data) out[row.path ?? ''] = row.signedUrl || '';
  return out;
}
