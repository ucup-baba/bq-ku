import type { SupabaseClient } from '@supabase/supabase-js';
import type { DonaturInput, DonasiInput, SuratInput } from '@/lib/validation/donatur';
import { escapeOrFilterValue } from '@/lib/db/filters';

export type Sapaan = 'BAPAK' | 'IBU' | 'SDR' | 'SDRI' | 'BAPAK_IBU';
export type JenisDonasi = 'ZAKAT' | 'INFAQ' | 'SHADAQAH' | 'LAINNYA';
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
};

export class NomorSuratDipakaiError extends Error {
  constructor(public nomor: string) { super('Nomor surat sudah dipakai'); this.name = 'NomorSuratDipakaiError'; }
}

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export async function listDonatur(client: SupabaseClient, q?: string): Promise<Donatur[]> {
  let query = client.from('donatur').select('*').order('nama');
  const aman = q ? escapeOrFilterValue(q) : '';
  if (aman) query = query.or(`nama.ilike.%${aman}%,noWa.ilike.%${aman}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat donatur: ${error.message}`);
  return (data || []) as Donatur[];
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
  return data as Donatur;
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
  let q = client.from('surat').select('*, donasi(*, donatur(*))').order('tanggalSurat', { ascending: false });
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
  return {
    totalUang: uang.reduce((s, r) => s + (r.nominal ?? 0), 0),
    jumlahDonasiUang: uang.length,
    perBulan: Array.from(perBulanMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([bulan, total]) => ({ bulan, total })),
    barang: rows.filter(r => r.bentuk === 'BARANG').map(r => ({
      tanggal: r.tanggal, donatur: r.donatur?.nama ?? '-', deskripsi: r.deskripsiBarang ?? '-',
    })),
  };
}
