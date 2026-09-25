import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { hashToken, kunciSesi, tandaiSesi, bacaSesi, samarkanIp, ringkasPerangkat } from '@/lib/bagikan/keamanan';
import { labelJenisBerkas, type JenisBerkas } from '@/lib/lembaga/berkas';
import type { AksiLog, VersiBerkas } from '@/lib/db/berkas-lembaga-repo';

/**
 * Halaman bagikan publik (penerima tidak login) → memakai kunci admin di server.
 * Setiap pintu masuk memeriksa ulang token, status tautan, dan cookie sesi.
 */
export type BerkasPublik = {
  id: string; jenis: JenisBerkas; namaLainnya: string | null; nomorDokumen: string | null;
  versi: Pick<VersiBerkas, 'id' | 'versi' | 'storagePath' | 'namaFile' | 'mime' | 'ukuran'> | null;
};
export type TautanPublik = {
  id: string; penerima: string; kedaluwarsaAt: string; dicabutAt: string | null; pinHash: string | null;
  pinTerkunciSampai: string | null; batasBuka: number | null; jumlahBuka: number; tandaAir: boolean;
  berkas: BerkasPublik[];
};

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
const UMUR_SESI_MS = 60 * 60_000;

type Baris = Omit<TautanPublik, 'berkas'> & {
  isi: Array<{ berkas: (Omit<BerkasPublik, 'versi'> & { versi: NonNullable<BerkasPublik['versi']>[] }) | null }>;
};

export async function cariTautan(token: string): Promise<TautanPublik | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await createAdminSupabase().from('tautan_bagikan')
    .select('id, penerima, kedaluwarsaAt, dicabutAt, pinHash, pinTerkunciSampai, batasBuka, jumlahBuka, tandaAir, isi:tautan_bagikan_berkas(berkas:berkas_lembaga(id, jenis, namaLainnya, nomorDokumen, versi:berkas_lembaga_versi(id, versi, storagePath, namaFile, mime, ukuran)))')
    .eq('tokenHash', hashToken(token)).maybeSingle();
  if (error || !data) return null;
  const { isi, ...t } = data as unknown as Baris;
  const berkas = (isi ?? []).map(x => x.berkas).filter((b): b is NonNullable<typeof b> => !!b)
    // Pertahanan berlapis: berkas rahasia tak pernah dilayani walau entah bagaimana masuk relasi.
    .filter(b => b.jenis !== 'CAP' && b.jenis !== 'TANDA_TANGAN')
    .map(b => ({ ...b, versi: (b.versi ?? []).reduce<BerkasPublik['versi']>((m, v) => (!m || v.versi > m.versi ? v : m), null) }));
  return { ...t, berkas };
}

/** Belum dicabut & belum kedaluwarsa (batas buka diperiksa terpisah karena sesi yang sudah terbuka tetap boleh). */
export const masihBerlaku = (t: TautanPublik, sekarang = Date.now()) => !t.dicabutAt && Date.parse(t.kedaluwarsaAt) > sekarang;
export const batasHabis = (t: TautanPublik) => t.batasBuka !== null && t.jumlahBuka >= t.batasBuka;
export const terkunciPin = (t: TautanPublik, sekarang = Date.now()) => !!t.pinTerkunciSampai && Date.parse(t.pinTerkunciSampai) > sekarang;

export const namaCookie = (tautanId: string) => `bq_bagikan_${tautanId}`;

export function sesiValid(t: TautanPublik, nilaiCookie: string | undefined, sekarang = Date.now()): boolean {
  return bacaSesi(nilaiCookie, kunciSesi(), t.id, sekarang);
}

/** Pasang cookie sesi (1 jam, tidak melewati kedaluwarsa tautan). */
export function pasangSesi(res: NextResponse, t: TautanPublik, sekarang = Date.now()): void {
  const sampai = Math.min(sekarang + UMUR_SESI_MS, Date.parse(t.kedaluwarsaAt));
  res.cookies.set(namaCookie(t.id), tandaiSesi({ tautanId: t.id, sampai }, kunciSesi()), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
    maxAge: Math.max(1, Math.floor((sampai - sekarang) / 1000)),
  });
}

export async function bukaTautan(tautanId: string): Promise<boolean> {
  const { data, error } = await createAdminSupabase().rpc('buka_tautan', { p_id: tautanId });
  return !error && data === true;
}

export async function catatPinGagal(tautanId: string): Promise<number> {
  const { data } = await createAdminSupabase().rpc('catat_pin_gagal', { p_id: tautanId });
  return typeof data === 'number' ? data : 0;
}

export async function resetPinGagal(tautanId: string): Promise<void> {
  await createAdminSupabase().from('tautan_bagikan').update({ pinGagal: 0 }).eq('id', tautanId);
}

/** Catatan akses dari halaman publik (tanpa akun). Service role boleh insert; ubah/hapus tetap ditolak trigger. */
export async function catatPublik(
  req: Pick<NextRequest, 'headers'>, aksi: AksiLog, o: { tautanId: string; berkasId?: string; versiId?: string; rincian?: string },
): Promise<void> {
  const { error } = await createAdminSupabase().from('log_akses_berkas').insert({
    aksi, tautanId: o.tautanId, berkasId: o.berkasId ?? null, versiId: o.versiId ?? null, rincian: o.rincian ?? null,
    ip: samarkanIp(req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip')),
    perangkat: ringkasPerangkat(req.headers.get('user-agent')),
  });
  if (error) console.error('Gagal mencatat akses tautan', { aksi, error: error.message });
}

export async function ambilIsiBerkas(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await createAdminSupabase().storage.from(bucket()).download(storagePath);
  if (error || !data) throw new Error(`Berkas tidak dapat diambil: ${error?.message ?? 'kosong'}`);
  return new Uint8Array(await data.arrayBuffer());
}

const EKSTENSI: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** "NPWP - 01.234.567.pdf" — hanya karakter aman untuk header & sistem berkas. */
export function namaUnduhan(b: BerkasPublik): string {
  const dasar = [b.jenis === 'LAINNYA' ? b.namaLainnya : labelJenisBerkas(b.jenis), b.nomorDokumen].filter(Boolean).join(' - ');
  const aman = dasar.replace(/[^A-Za-z0-9 ._()-]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 100) || 'berkas';
  return `${aman}.${EKSTENSI[b.versi?.mime ?? ''] ?? 'bin'}`;
}
