import 'server-only';
import sharp from 'sharp';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { SuratAssets } from '@/lib/surat/assets';

/**
 * Cap & tanda tangan terbaru dari Berkas lembaga untuk surat donatur. Dibaca dengan kunci admin
 * (Admin Donatur tidak punya akses ke berkas rahasia) dan file-nya tidak pernah dikirim ke browser
 * kecuali sebagai bagian PNG surat / pratinjau di ruang donatur. Bila belum ada atau gagal dimuat,
 * nilai null → surat memakai aset bawaan di assets/surat.
 */
export type AsetPengesahan = { stempel: string | null; ttd: string | null; namaPenandatangan: string | null };

const KOSONG: AsetPengesahan = { stempel: null, ttd: null, namaPenandatangan: null };
const UMUR_CACHE_MS = 5 * 60_000;
let cache: { nilai: Promise<AsetPengesahan>; sampai: number } | null = null;

type Baris = { jenis: 'CAP' | 'TANDA_TANGAN'; namaPenandatangan: string | null; versi: Array<{ versi: number; storagePath: string }> };

async function muat(): Promise<AsetPengesahan> {
  const admin = createAdminSupabase();
  const { data, error } = await admin.from('berkas_lembaga')
    .select('jenis, namaPenandatangan, versi:berkas_lembaga_versi(versi, storagePath)').in('jenis', ['CAP', 'TANDA_TANGAN']);
  if (error || !data) return KOSONG;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
  const ambil = async (b: Baris | undefined, pangkas: boolean): Promise<string | null> => {
    const terbaru = b?.versi.reduce<Baris['versi'][number] | null>((m, v) => (!m || v.versi > m.versi ? v : m), null);
    if (!terbaru) return null;
    const { data: blob, error: dErr } = await admin.storage.from(bucket).download(terbaru.storagePath);
    if (dErr || !blob) return null;
    let gambar = sharp(Buffer.from(await blob.arrayBuffer()));
    if (pangkas) gambar = gambar.trim(); // buang pinggiran transparan agar tanda tangan mengisi kotaknya
    return `data:image/png;base64,${(await gambar.png().toBuffer()).toString('base64')}`;
  };
  const baris = data as Baris[];
  const ttd = baris.find(b => b.jenis === 'TANDA_TANGAN');
  const [stempel, ttdUri] = await Promise.all([ambil(baris.find(b => b.jenis === 'CAP'), false), ambil(ttd, true)]);
  return { stempel, ttd: ttdUri, namaPenandatangan: ttd?.namaPenandatangan?.trim() || null };
}

export function ambilAsetPengesahan(): Promise<AsetPengesahan> {
  if (!cache || cache.sampai < Date.now()) {
    const nilai = muat().catch((e) => { console.error('Gagal memuat cap/tanda tangan lembaga', e); cache = null; return KOSONG; });
    cache = { nilai, sampai: Date.now() + UMUR_CACHE_MS };
  }
  return cache.nilai;
}

/** Dipanggil setelah cap/tanda tangan/nama penandatangan berubah (di instans ini). */
export function lupakanAsetPengesahan(): void { cache = null; }

export function gabungPengesahan(bawaan: SuratAssets, p: AsetPengesahan): SuratAssets {
  return {
    ...bawaan,
    ...(p.stempel ? { stempel: p.stempel } : {}),
    ...(p.ttd ? { ttd: p.ttd } : {}),
    ...(p.namaPenandatangan ? { namaPenandatangan: p.namaPenandatangan } : {}),
  };
}
