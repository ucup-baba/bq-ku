// Mengosongkan bucket storage (default 'berkas') memakai service role.
// Jalankan: node --env-file=.env.local scripts/empty-bucket.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset'); process.exit(1); }

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin.storage.emptyBucket(bucket);
if (error) { console.error('Gagal mengosongkan bucket:', error.message); process.exit(1); }
console.log(`Bucket '${bucket}' dikosongkan.`, data?.message ?? '');
