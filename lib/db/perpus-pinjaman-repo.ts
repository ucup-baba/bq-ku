import type { SupabaseClient } from '@supabase/supabase-js';
import { galatDariRpc } from '@/lib/perpus/pinjaman';
import type { Anggota, Pinjaman, Pinjamanku, StatusPinjamBuku } from '@/lib/perpus/tipe';
import type { DaftarAnggotaInput } from '@/lib/validation/perpus';

const STATUS_BERJALAN = ['diajukan', 'dipinjam', 'menunggu_verifikasi'];

async function panggil<T>(c: SupabaseClient, fungsi: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await c.rpc(fungsi, args);
  if (error) throw galatDariRpc(error.message);
  return data as T;
}

export const daftarAnggota = (c: SupabaseClient, input: DaftarAnggotaInput) =>
  panggil<Anggota>(c, 'perpus_daftar_anggota', { p_nama: input.nama, p_no_wa: input.noWa });

export const ajukanPinjaman = (c: SupabaseClient, bukuId: string) =>
  panggil<Pinjaman>(c, 'perpus_ajukan_pinjaman', { p_buku: bukuId });

export const aksiAnggota = (c: SupabaseClient, id: string, aksi: 'batal' | 'klaim') =>
  panggil<Pinjaman>(c, aksi === 'batal' ? 'perpus_batal_pinjaman' : 'perpus_klaim_kembali', { p_id: id });

export async function listPinjamanku(c: SupabaseClient): Promise<Pinjamanku[]> {
  const { data, error } = await c.from('perpus_pinjamanku').select('*').order('diajukanAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat pinjaman: ${error.message}`);
  return (data || []) as Pinjamanku[];
}

export async function ambilStatusPinjam(c: SupabaseClient, userId: string | null, bukuId: string): Promise<StatusPinjamBuku> {
  const { data: buku, error } = await c.from('perpus_katalog_publik').select('tersedia').eq('id', bukuId).maybeSingle();
  if (error) throw new Error(`Gagal memuat ketersediaan: ${error.message}`);
  const tersedia = (buku as { tersedia: number } | null)?.tersedia ?? null;
  if (!userId) return { masuk: false, anggota: null, pinjamanAktif: null, tersedia };
  const [anggota, pinjaman] = await Promise.all([
    c.from('perpus_anggota').select('status').eq('userId', userId).maybeSingle(),
    c.from('perpus_pinjaman').select('status').eq('anggotaId', userId).eq('bukuId', bukuId).in('status', STATUS_BERJALAN).maybeSingle(),
  ]);
  const galat = anggota.error ?? pinjaman.error;
  if (galat) throw new Error(`Gagal memuat status anggota: ${galat.message}`);
  return {
    masuk: true,
    anggota: (anggota.data as Pick<Anggota, 'status'> | null)?.status ?? null,
    pinjamanAktif: (pinjaman.data as Pick<Pinjaman, 'status'> | null)?.status ?? null,
    tersedia,
  };
}
