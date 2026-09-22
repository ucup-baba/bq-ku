// Daftarkan email Google sebagai SUPERADMIN (masuk hanya via Google). Jalankan:
// node --env-file=.env.local scripts/seed-admin.mjs --email nama@gmail.com --nama "Nama"
import { createClient } from '@supabase/supabase-js';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const email = arg('email')?.toLowerCase(), nama = arg('nama') || 'Superadmin';
if (!email) { console.error('Wajib: --email (opsional --nama)'); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset'); process.exit(1); }

const admin = createClient(url, key, { auth: { persistSession: false } });
const { error } = await admin.from('allowed_emails').upsert({ email, nama, role: 'SUPERADMIN' });
if (error) { console.error('Gagal:', error.message); process.exit(1); }
console.log(`SUPERADMIN diizinkan: ${email}. Masuk dengan akun Google tersebut di /login.`);
