import type { SupabaseClient } from '@supabase/supabase-js';
import { ATURAN, PinjamanError, galatDariRpc } from '@/lib/perpus/pinjaman';
import type { Anggota, AnggotaAdmin, Pinjaman, PinjamanAdmin, Pinjamanku, StatusAnggota, StatusPinjamBuku, StatusPinjaman } from '@/lib/perpus/tipe';
import type { AksiPustakawanInput, DaftarAnggotaInput } from '@/lib/validation/perpus';

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

export async function listPinjaman(c: SupabaseClient): Promise<PinjamanAdmin[]> {
  const { data, error } = await c.from('perpus_pinjaman')
    .select('*, anggota:perpus_anggota(nama,noWa,status), buku:perpus_buku(judul,penulis,nomorPanggil)')
    .order('diajukanAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat pinjaman: ${error.message}`);
  return (data || []) as unknown as PinjamanAdmin[];
}

/** ACC lewat fungsi SQL karena perlu mengunci buku; lainnya cukup update bersyarat status asal. */
export async function terapkanAksi(c: SupabaseClient, id: string, input: AksiPustakawanInput, oleh: string): Promise<Pinjaman> {
  if (input.aksi === 'acc') return panggil<Pinjaman>(c, 'perpus_acc_pinjaman', { p_id: id, p_jatuh_tempo: input.jatuhTempo });
  const { dari, ke } = ATURAN[input.aksi];
  const patch = {
    status: ke,
    diprosesOleh: oleh,
    ...(input.aksi === 'tolak' ? { catatan: input.catatan } : {}),
    ...(input.aksi === 'perpanjang' ? { jatuhTempo: input.jatuhTempo } : {}),
    ...(ke === 'dikembalikan' ? { dikembalikanAt: new Date().toISOString() } : {}),
  };
  const { data, error } = await c.from('perpus_pinjaman').update(patch).eq('id', id).eq('status', dari).select('*').maybeSingle();
  if (error) throw new Error(`Gagal memproses pinjaman: ${error.message}`);
  if (data) return data as Pinjaman;
  const { data: kini } = await c.from('perpus_pinjaman').select('status').eq('id', id).maybeSingle();
  const status = (kini as { status: StatusPinjaman } | null)?.status;
  throw status ? new PinjamanError('status_tidak_sah', status) : new PinjamanError('pinjaman_tidak_ada');
}

export async function listAnggota(c: SupabaseClient): Promise<AnggotaAdmin[]> {
  const { data, error } = await c.from('perpus_anggota').select('*, pinjaman:perpus_pinjaman(status)').order('nama');
  if (error) throw new Error(`Gagal memuat anggota: ${error.message}`);
  return (data || []) as AnggotaAdmin[];
}

export async function ubahStatusAnggota(c: SupabaseClient, id: string, status: StatusAnggota): Promise<Anggota> {
  const { data, error } = await c.from('perpus_anggota').update({ status }).eq('userId', id).select('*').single();
  if (error) throw new Error(`Gagal mengubah anggota: ${error.message}`);
  return data as Anggota;
}
