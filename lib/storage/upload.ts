import type { SupabaseClient } from '@supabase/supabase-js';
import { signPaths } from './signed';

export async function uploadToBucket(
  client: SupabaseClient, storagePath: string, body: Buffer | Blob | File, contentType: string,
  bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas',
): Promise<{ storagePath: string; fileUrl: string }> {
  const { error } = await client.storage.from(bucket).upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`Gagal mengunggah ke storage: ${error.message}`);
  const map = await signPaths(client, [storagePath], bucket);
  return { storagePath, fileUrl: map[storagePath] || '' };
}
