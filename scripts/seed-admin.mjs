// Buat/naikkan SUPERADMIN pertama. Jalankan:
// node --env-file=.env.local scripts/seed-admin.mjs --email admin@x.id --nama "Admin" --password "rahasia-awal"
import { createClient } from '@supabase/supabase-js';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const email = arg('email'), nama = arg('nama') || 'Superadmin', password = arg('password');
if (!email || !password) { console.error('Wajib: --email, --password (opsional --nama)'); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset'); process.exit(1); }

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nama, role: 'SUPERADMIN' } });
  if (error) { console.error('Gagal membuat user:', error.message); process.exit(1); }
  user = data.user; console.log('User dibuat:', user.id);
} else {
  console.log('User sudah ada:', user.id);
}
const { error: pErr } = await admin.from('profiles').upsert({ id: user.id, nama, email, role: 'SUPERADMIN', aktif: true });
if (pErr) { console.error('Gagal set profil:', pErr.message); process.exit(1); }
console.log(`SUPERADMIN siap: ${email}`);
