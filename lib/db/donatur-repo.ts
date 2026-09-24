import type { SupabaseClient } from '@supabase/supabase-js';
import type { DonaturInput, DonasiInput, SuratInput } from '@/lib/validation/donatur';
import { escapeOrFilterValue } from '@/lib/db/filters';
import { parseNomorSurat } from '@/lib/utils/nomor-surat';

export type Sapaan = 'BAPAK' | 'IBU' | 'SDR' | 'SDRI' | 'BAPAK_IBU';
export type JenisDonasi = 'ZIS' | 'WAKAF' | 'LAINNYA' | 'ZAKAT' | 'INFAQ' | 'SHADAQAH';
export type BentukDonasi = 'UANG' | 'BARANG';
/** Gaya font tulisan tangan untuk isian di PNG surat ucapan terima kasih. */
export type GayaTulisan = 'KALAM' | 'PATRICK';

export type Donatur = {
  id: string; nama: string; sapaan: Sapaan; noWa: string | null;
  alamat: string | null; catatan: string | null; createdAt: string; updatedAt: string;
};
export type Donasi = {
  id: string; donaturId: string; tanggal: string; jenis: JenisDonasi; bentuk: BentukDonasi;
  nominal: number | null; deskripsiBarang: string | null; keterangan: string | null;
  createdAt: string; createdBy: string | null;
};
export type Surat = {
  id: string; donasiId: string; nomorSurat: string; tanggalSurat: string;
  gayaTulisan: GayaTulisan;
  storagePath: string | null; terkirimWa: boolean; dikirimAt: string | null;
  createdAt: string; createdBy: string | null;
};
export type DonasiWithDonatur = Donasi & { donatur: Donatur; surat?: Surat | null };
export type SuratWithRelasi = Surat & { donasi: Donasi & { donatur: Donatur } };
export type Rekap = {
  totalUang: number;
  jumlahDonasiUang: number;
  perBulan: Array<{ bulan: string; total: number }>;   // bulan = 'YYYY-MM'
  barang: Array<{ tanggal: string; donatur: string; deskripsi: string }>;
  perJenis?: Array<{ jenis: JenisDonasi; total: number; jumlah: number }>;
};

export class NomorSuratDipakaiError extends Error {
  constructor(public nomor: string) { super('Nomor surat sudah dipakai'); this.name = 'NomorSuratDipakaiError'; }
}

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export type DonaturWithDonasi = Donatur & {
  donasi?: Array<{ id: string; nominal: number | null; bentuk: BentukDonasi; tanggal: string }>;
};

export async function listDonatur(client: SupabaseClient, q?: string): Promise<DonaturWithDonasi[]> {
  let query = client.from('donatur').select('*, donasi(id, nominal, bentuk, tanggal)').order('nama');
  const aman = q ? escapeOrFilterValue(q) : '';
  if (aman) query = query.or(`nama.ilike.%${aman}%,noWa.ilike.%${aman}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat donatur: ${error.message}`);
  return (data || []) as DonaturWithDonasi[];
}

export async function getDonatur(client: SupabaseClient, donaturId: string): Promise<(Donatur & { donasi: Donasi[] }) | null> {
  const { data, error } = await client.from('donatur').select('*, donasi(*)').eq('id', donaturId).maybeSingle();
  if (error || !data) return null;
  const row = data as Donatur & { donasi: Donasi[] };
  row.donasi = (row.donasi || []).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return row;
}

export async function createDonatur(client: SupabaseClient, input: DonaturInput): Promise<Donatur> {
  const row = { ...input, id: id(), createdAt: now(), updatedAt: now() };
  const { data, error } = await client.from('donatur').insert(row).select().single();
  if (error) throw new Error(`Gagal menyimpan donatur: ${error.message}`);
  return data as Donatur;
}

export async function updateDonatur(client: SupabaseClient, donaturId: string, patch: Partial<DonaturInput>): Promise<Donatur> {
  const { data, error } = await client.from('donatur')
    .update({ ...patch, updatedAt: now() }).eq('id', donaturId).select().single();
  if (error) throw new Error(`Gagal memperbarui donatur: ${error.message}`);
  if (patch.nama !== undefined || patch.sapaan !== undefined) await segarkanPngSuratBelumTerkirim(client, donaturId);
  return data as Donatur;
}

/**
 * Nama/sapaan di surat ikut berubah: kosongkan storagePath surat yang BELUM terkirim agar
 * PNG-nya dirender ulang. Surat yang sudah terkirim dibiarkan sesuai yang diterima donatur.
 */
async function segarkanPngSuratBelumTerkirim(client: SupabaseClient, donaturId: string): Promise<void> {
  const { data: donasi, error } = await client.from('donasi').select('id').eq('donaturId', donaturId);
  if (error) throw new Error(`Gagal memuat donasi: ${error.message}`);
  const ids = (donasi || []).map(d => d.id as string);
  if (ids.length === 0) return;
  const { error: uErr } = await client.from('surat').update({ storagePath: null })
    .in('donasiId', ids).eq('terkirimWa', false);
  if (uErr) console.error('Gagal menyegarkan PNG surat donatur:', uErr.message);
}

export async function listDonasi(
  client: SupabaseClient,
  filter: { dari?: string; sampai?: string; donaturId?: string; limit?: number } = {},
): Promise<DonasiWithDonatur[]> {
  let q = client.from('donasi').select('*, donatur(*), surat(*)').order('tanggal', { ascending: false });
  if (filter.dari) q = q.gte('tanggal', filter.dari);
  if (filter.sampai) q = q.lte('tanggal', filter.sampai);
  if (filter.donaturId) q = q.eq('donaturId', filter.donaturId);
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal memuat donasi: ${error.message}`);
  return (data || []).map((d: any) => ({ ...d, surat: Array.isArray(d.surat) ? d.surat[0] ?? null : d.surat ?? null })) as DonasiWithDonatur[];
}

export async function createDonasi(client: SupabaseClient, input: DonasiInput, userId: string): Promise<Donasi> {
  const row = {
    id: id(),
    donaturId: input.donaturId,
    tanggal: input.tanggal,
    jenis: input.jenis,
    bentuk: input.bentuk,
    nominal: input.bentuk === 'UANG' ? input.nominal! : null,
    deskripsiBarang: input.bentuk === 'BARANG' ? input.deskripsiBarang! : null,
    keterangan: input.keterangan ?? null,
    createdAt: now(),
    createdBy: userId,
  };
  const { data, error } = await client.from('donasi').insert(row).select().single();
  if (error) throw new Error(`Gagal menyimpan donasi: ${error.message}`);
  return data as Donasi;
}

/** Hanya mengintip nomor urut berikutnya tanpa menaikkan counter di database. */
export async function peekNomorUrut(client: SupabaseClient, tahun: number, bulan: number): Promise<number> {
  const { data, error } = await client.from('nomor_surat_counter')
    .select('urutanTerakhir').eq('tahun', tahun).eq('bulan', bulan).maybeSingle();
  if (error) throw new Error(`Gagal mengambil nomor surat: ${error.message}`);
  return (data?.urutanTerakhir ?? 0) + 1;
}

export async function bumpNomorUrut(client: SupabaseClient, tahun: number, bulan: number, urut: number): Promise<void> {
  const { error } = await client.rpc('bump_nomor_surat', { p_tahun: tahun, p_bulan: bulan, p_urut: urut });
  if (error) throw new Error(`Gagal memperbarui nomor surat: ${error.message}`);
}

export async function createSurat(client: SupabaseClient, input: SuratInput, userId: string): Promise<Surat> {
  const row = { id: id(), ...input, storagePath: null, terkirimWa: false, dikirimAt: null, createdAt: now(), createdBy: userId };
  const { data, error } = await client.from('surat').insert(row).select().single();
  if (error) {
    if (error.code === '23505') throw new NomorSuratDipakaiError(input.nomorSurat);
    throw new Error(`Gagal menyimpan surat: ${error.message}`);
  }
  return data as Surat;
}

export async function getSurat(client: SupabaseClient, suratId: string): Promise<SuratWithRelasi | null> {
  const { data, error } = await client.from('surat').select('*, donasi(*, donatur(*))').eq('id', suratId).maybeSingle();
  if (error || !data) return null;
  return data as SuratWithRelasi;
}

export async function listSurat(
  client: SupabaseClient,
  filter: { dari?: string; sampai?: string; terkirim?: boolean; limit?: number } = {},
): Promise<SuratWithRelasi[]> {
  let q = client.from('surat').select('*, donasi(*, donatur(*))')
    .order('tanggalSurat', { ascending: false })
    .order('createdAt', { ascending: false });
  if (filter.dari) q = q.gte('tanggalSurat', filter.dari);
  if (filter.sampai) q = q.lte('tanggalSurat', filter.sampai);
  if (filter.terkirim !== undefined) q = q.eq('terkirimWa', filter.terkirim);
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal memuat surat: ${error.message}`);
  return (data || []) as SuratWithRelasi[];
}

export async function setSuratStoragePath(client: SupabaseClient, suratId: string, path: string): Promise<void> {
  const { error } = await client.from('surat').update({ storagePath: path }).eq('id', suratId);
  if (error) throw new Error(`Gagal menyimpan berkas surat: ${error.message}`);
}

export async function markSuratTerkirim(client: SupabaseClient, suratId: string): Promise<Surat> {
  const { data, error } = await client.from('surat')
    .update({ terkirimWa: true, dikirimAt: now() }).eq('id', suratId).select().single();
  if (error) throw new Error(`Gagal menandai surat: ${error.message}`);
  return data as Surat;
}

export async function rekap(client: SupabaseClient, dari: string, sampai: string): Promise<Rekap> {
  const rows = await listDonasi(client, { dari, sampai });
  const uang = rows.filter(r => r.bentuk === 'UANG');
  const perBulanMap = new Map<string, number>();
  for (const r of uang) {
    const key = r.tanggal.slice(0, 7);
    perBulanMap.set(key, (perBulanMap.get(key) ?? 0) + (r.nominal ?? 0));
  }
  const perJenisMap = new Map<JenisDonasi, { total: number; jumlah: number }>();
  for (const r of rows) {
    const curr = perJenisMap.get(r.jenis) ?? { total: 0, jumlah: 0 };
    curr.jumlah += 1;
    if (r.bentuk === 'UANG' && r.nominal) {
      curr.total += r.nominal;
    }
    perJenisMap.set(r.jenis, curr);
  }
  const perJenis = Array.from(perJenisMap.entries()).map(([jenis, d]) => ({
    jenis,
    total: d.total,
    jumlah: d.jumlah,
  })).sort((a, b) => b.total - a.total);

  return {
    totalUang: uang.reduce((s, r) => s + (r.nominal ?? 0), 0),
    jumlahDonasiUang: uang.length,
    perBulan: Array.from(perBulanMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([bulan, total]) => ({ bulan, total })),
    barang: rows.filter(r => r.bentuk === 'BARANG').map(r => ({
      tanggal: r.tanggal, donatur: r.donatur?.nama ?? '-', deskripsi: r.deskripsiBarang ?? '-',
    })),
    perJenis,
  };
}


/** Surat sudah terkirim sehingga tidak boleh diubah lagi. */
export class SuratTerkunciError extends Error {
  constructor() { super('Surat sudah terkirim sehingga tidak bisa diubah'); this.name = 'SuratTerkunciError'; }
}

/** Penghapusan ditolak RLS (Supabase tidak melempar galat, hanya 0 baris terhapus). */
export class HapusDitolakError extends Error {
  constructor() { super('Anda tidak memiliki izin menghapus surat ini'); this.name = 'HapusDitolakError'; }
}

/**
 * Menghapus surat beserta catatan donasinya (surat ikut terhapus lewat ON DELETE CASCADE),
 * sehingga rekap tetap benar. Bila nomornya adalah nomor terakhir bulan itu, counter
 * dikembalikan satu agar nomor bisa dipakai lagi; nomor di tengah dibiarkan kosong.
 * Mengembalikan storagePath PNG (bila ada) untuk dihapus pemanggil.
 */
export async function hapusSuratBesertaDonasi(client: SupabaseClient, surat: SuratWithRelasi): Promise<string | null> {
  const { data, error } = await client.from('donasi').delete().eq('id', surat.donasiId).select('id');
  if (error) throw new Error(`Gagal menghapus surat: ${error.message}`);
  if (!data || data.length === 0) throw new HapusDitolakError();

  const p = parseNomorSurat(surat.nomorSurat);
  if (p) {
    const { error: cErr } = await client.from('nomor_surat_counter')
      .update({ urutanTerakhir: p.urut - 1 })
      .eq('tahun', p.tahun).eq('bulan', p.bulan).eq('urutanTerakhir', p.urut);
    if (cErr) console.error('Gagal mengembalikan counter nomor surat:', cErr.message);
  }
  return surat.storagePath;
}

export type UbahSuratInput = {
  donasi: Pick<DonasiInput, 'tanggal' | 'jenis' | 'bentuk' | 'nominal' | 'deskripsiBarang' | 'keterangan'>;
  tanggalSurat: string;
  gayaTulisan: GayaTulisan;
};

/**
 * Mengubah isi surat yang BELUM terkirim. Syarat "belum terkirim" diperiksa di kueri
 * update itu sendiri (bebas balapan). storagePath dikosongkan agar PNG dirender ulang.
 */
export async function ubahSurat(client: SupabaseClient, surat: SuratWithRelasi, input: UbahSuratInput): Promise<void> {
  const { data, error } = await client.from('surat')
    .update({ tanggalSurat: input.tanggalSurat, gayaTulisan: input.gayaTulisan, storagePath: null })
    .eq('id', surat.id).eq('terkirimWa', false).select('id');
  if (error) throw new Error(`Gagal mengubah surat: ${error.message}`);
  if (!data || data.length === 0) throw new SuratTerkunciError();

  const d = input.donasi;
  const { error: dErr } = await client.from('donasi').update({
    tanggal: d.tanggal, jenis: d.jenis, bentuk: d.bentuk,
    nominal: d.bentuk === 'UANG' ? d.nominal ?? null : null,
    deskripsiBarang: d.bentuk === 'BARANG' ? d.deskripsiBarang ?? null : null,
    keterangan: d.keterangan ?? null,
  }).eq('id', surat.donasiId);
  if (dErr) throw new Error(`Gagal mengubah donasi: ${dErr.message}`);
}

/** Donatur masih punya donasi: hapus ditolak agar surat bernomor & rekap tidak ikut hilang. */
export class DonaturPunyaDonasiError extends Error {
  constructor(public jumlah: number) {
    super('Donatur ini masih punya catatan donasi. Gabungkan ke donatur lain dulu.');
    this.name = 'DonaturPunyaDonasiError';
  }
}

/** Penghapusan donatur ditolak RLS (0 baris terhapus). */
export class HapusDonaturDitolakError extends Error {
  constructor() { super('Anda tidak memiliki izin menghapus donatur ini'); this.name = 'HapusDonaturDitolakError'; }
}

async function hitungDonasi(client: SupabaseClient, donaturId: string): Promise<number> {
  const { count, error } = await client.from('donasi').select('id', { head: true, count: 'exact' }).eq('donaturId', donaturId);
  if (error) throw new Error(`Gagal memeriksa donasi: ${error.message}`);
  return count ?? 0;
}

async function hapusBarisDonatur(client: SupabaseClient, donaturId: string): Promise<void> {
  const { data, error } = await client.from('donatur').delete().eq('id', donaturId).select('id');
  // 23503: FK RESTRICT (migrasi 0009) — donasi baru masuk di antara pemeriksaan & penghapusan.
  if (error?.code === '23503') throw new DonaturPunyaDonasiError(await hitungDonasi(client, donaturId));
  if (error) throw new Error(`Gagal menghapus donatur: ${error.message}`);
  if (!data || data.length === 0) throw new HapusDonaturDitolakError();
}

/** Menghapus donatur yang BELUM punya donasi. */
export async function hapusDonatur(client: SupabaseClient, donaturId: string): Promise<void> {
  const jumlah = await hitungDonasi(client, donaturId);
  if (jumlah > 0) throw new DonaturPunyaDonasiError(jumlah);
  await hapusBarisDonatur(client, donaturId);
}

/**
 * Menggabungkan donatur dobel: semua donasi `dariId` dipindah ke `keId` (surat ikut, karena
 * surat menempel ke donasi), lalu `dariId` dihapus. Mengembalikan jumlah donasi yang dipindah.
 */
export async function gabungDonatur(client: SupabaseClient, dariId: string, keId: string): Promise<number> {
  if (dariId === keId) throw new Error('Pilih donatur lain sebagai tujuan');
  const { data, error } = await client.from('donasi')
    .update({ donaturId: keId }).eq('donaturId', dariId).select('id');
  if (error) throw new Error(`Gagal memindahkan donasi: ${error.message}`);
  await hapusBarisDonatur(client, dariId);
  if (data && data.length > 0) await segarkanPngSuratBelumTerkirim(client, keId);
  return data?.length ?? 0;
}
