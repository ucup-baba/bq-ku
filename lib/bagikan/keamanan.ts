import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

/**
 * Keamanan tautan bagikan: token acak (DB hanya menyimpan hash-nya), PIN ber-scrypt,
 * cookie sesi bertanda tangan HMAC, serta penyamaran data penerima untuk catatan akses.
 */
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const buatToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const buatPin = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const kunci = await scryptAsync(pin, salt, 32);
  return `${salt.toString('hex')}:${kunci.toString('hex')}`;
}

export async function cocokPin(pin: string, tersimpan: string): Promise<boolean> {
  const [saltHex, kunciHex] = tersimpan.split(':');
  if (!saltHex || !kunciHex || kunciHex.length !== 64) return false;
  const kunci = await scryptAsync(pin, Buffer.from(saltHex, 'hex'), 32);
  return timingSafeEqual(kunci, Buffer.from(kunciHex, 'hex'));
}

/** Kunci HMAC sesi diturunkan dari service role key (tidak perlu variabel lingkungan baru). */
export function kunciSesi(): string {
  const dasar = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dasar) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diset');
  return createHmac('sha256', dasar).update('bq-ku/bagikan/sesi').digest('hex');
}

const tanda = (isi: string, kunci: string) => createHmac('sha256', kunci).update(isi).digest('base64url');

/** Nilai cookie `<tautanId>.<sampaiMs>.<hmac>`. */
export function tandaiSesi(p: { tautanId: string; sampai: number }, kunci: string): string {
  const isi = `${p.tautanId}.${p.sampai}`;
  return `${isi}.${tanda(isi, kunci)}`;
}

export function bacaSesi(nilai: string | undefined, kunci: string, tautanId: string, sekarang: number): boolean {
  if (!nilai) return false;
  const i = nilai.lastIndexOf('.');
  if (i < 0) return false;
  const isi = nilai.slice(0, i);
  const hmac = Buffer.from(nilai.slice(i + 1));
  const harap = Buffer.from(tanda(isi, kunci));
  if (hmac.length !== harap.length || !timingSafeEqual(hmac, harap)) return false;
  const [id, sampai] = isi.split('.');
  return id === tautanId && Number(sampai) >= sekarang;
}

/** "182.1.xx.xx" / "2001:db8:85a3:8d3:…" — cukup untuk mengenali jaringan, tidak cukup untuk melacak orang. */
export function samarkanIp(ip: string | null | undefined): string | null {
  const x = ip?.split(',')[0].trim();
  if (!x) return null;
  if (x.includes(':')) return `${x.split(':').slice(0, 4).join(':')}:…`;
  const b = x.split('.');
  return b.length === 4 ? `${b[0]}.${b[1]}.xx.xx` : null;
}

export function ringkasPerangkat(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const peramban = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Peramban lain';
  const sistem = /Android/.test(ua) ? 'Android' : /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad'
    : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Perangkat lain';
  return `${peramban} · ${sistem}`;
}
