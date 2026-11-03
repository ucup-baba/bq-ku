import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeOrFilterValue } from '@/lib/db/filters';
import { kodePengarang, selesaikanBentrok, NomorBentrokError } from '@/lib/perpus/nomor-panggil';
import { rencanakanNomorBaru } from '@/lib/perpus/audit';
import { hitungRingkasan } from '@/lib/perpus/ringkasan';
import { BUCKET_SAMPUL, pathSampul } from '@/lib/perpus/sampul';
import type { RencanaImpor } from '@/lib/perpus/impor';
import type { Buku, DonasiPerpus, Pengadaan, RingkasanPerpus, StatusKode } from '@/lib/perpus/tipe';
import type { BukuInput, BukuUbahInput, DonasiPerpusInput, PengadaanInput } from '@/lib/validation/perpus';

const now = () => new Date().toISOString();
const UNIK_DILANGGAR = '23505';
/** PostgREST menolak delete tanpa filter; id ini tidak pernah ada. */
const ID_MUSTAHIL = '00000000-0000-0000-0000-000000000000';

export async function listBuku(c: SupabaseClient, opsi: { q?: string; statusKode?: StatusKode } = {}): Promise<Buku[]> {
  let query = c.from('perpus_buku').select('*').order('nomorPanggil');
  if (opsi.statusKode) query = query.eq('statusKode', opsi.statusKode);
  const aman = opsi.q ? escapeOrFilterValue(opsi.q) : '';
  if (aman) query = query.or(`judul.ilike.%${aman}%,penulis.ilike.%${aman}%,nomorPanggil.ilike.%${aman}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat buku: ${error.message}`);
  return (data || []) as Buku[];
}

async function nomorTerpakai(c: SupabaseClient, kecualiId?: string): Promise<Set<string>> {
  const { data, error } = await c.from('perpus_buku').select('id, nomorPanggil');
  if (error) throw new Error(`Gagal memuat nomor panggil: ${error.message}`);
  return new Set((data || [])
    .filter((b: { id: string }) => !kecualiId || b.id !== kecualiId)
    .map((b: { nomorPanggil: string }) => b.nomorPanggil));
}

export async function tambahBuku(c: SupabaseClient, input: BukuInput, oleh: string): Promise<Buku> {
  const { seri, kodePengarang: kodeManual, ...isi } = input;
  const nomor = selesaikanBentrok(
    { kelasDdc: input.kelasDdc, kodePengarang: kodeManual || kodePengarang(input.penulis) || 'XXX', judul: input.judul, seri },
    await nomorTerpakai(c),
  );
  const { data, error } = await c.from('perpus_buku')
    .insert({ ...isi, ...nomor, statusKode: 'baku', createdBy: oleh, createdAt: now(), updatedAt: now() })
    .select('*').single();
  if (error?.code === UNIK_DILANGGAR) throw new NomorBentrokError(nomor.nomorPanggil);
  if (error) throw new Error(`Gagal menyimpan buku: ${error.message}`);
  return data as Buku;
}

/** Ubah buku; bila judul/penulis/kelas/kode pengarang berubah, nomor panggil disusun ulang (seri dipertahankan). */
export async function ubahBuku(c: SupabaseClient, id: string, input: BukuUbahInput): Promise<Buku> {
  const { data: lama, error: galatBaca } = await c.from('perpus_buku').select('*').eq('id', id).single();
  if (galatBaca || !lama) throw new Error('Buku tidak ditemukan');
  const b = lama as Buku;
  const { kodePengarang: kodeManual, ...isi } = input;
  const susunUlang = (['judul', 'penulis', 'kelasDdc'] as const).some(k => input[k] !== undefined && input[k] !== b[k])
    || (kodeManual !== undefined && kodeManual !== b.kodePengarang);
  let nomor = {};
  if (susunUlang) {
    const penulis = input.penulis ?? b.penulis;
    nomor = selesaikanBentrok({
      kelasDdc: input.kelasDdc ?? b.kelasDdc,
      kodePengarang: kodeManual || kodePengarang(penulis) || b.kodePengarang || 'XXX',
      judul: input.judul ?? b.judul,
      seri: b.noSeri != null && b.kodeJudul ? { kode: b.kodeJudul, nomor: b.noSeri } : null,
    }, await nomorTerpakai(c, id));
  }
  const { data, error } = await c.from('perpus_buku')
    .update({ ...isi, ...nomor, ...(susunUlang ? { statusKode: 'baku', catatanAudit: null } : {}), updatedAt: now() })
    .eq('id', id).select('*').single();
  if (error?.code === UNIK_DILANGGAR) throw new NomorBentrokError((nomor as { nomorPanggil?: string }).nomorPanggil ?? '');
  if (error) throw new Error(`Gagal mengubah buku: ${error.message}`);
  return data as Buku;
}

export async function unggahSampulBuku(c: SupabaseClient, id: string, webp: Buffer): Promise<Buku> {
  const { data: lama, error: galatBaca } = await c.from('perpus_buku').select('sampulPath').eq('id', id).single();
  if (galatBaca) throw new Error(`Gagal memuat buku: ${galatBaca.message}`);
  const path = pathSampul(id, Date.now());
  const { error: galatUnggah } = await c.storage.from(BUCKET_SAMPUL).upload(path, webp, { contentType: 'image/webp' });
  if (galatUnggah) throw new Error(`Gagal mengunggah sampul: ${galatUnggah.message}`);
  const { data, error } = await c.from('perpus_buku').update({ sampulPath: path, updatedAt: now() }).eq('id', id).select('*').single();
  if (error) throw new Error(`Gagal menyimpan sampul: ${error.message}`);
  // File lama yatim tidak merugikan siapa pun, jadi kegagalan hapus diabaikan.
  if (lama.sampulPath) await c.storage.from(BUCKET_SAMPUL).remove([lama.sampulPath]);
  return data as Buku;
}

export async function listDonasi(c: SupabaseClient): Promise<DonasiPerpus[]> {
  const { data, error } = await c.from('perpus_donasi').select('*').order('tanggal', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Gagal memuat donasi: ${error.message}`);
  return (data || []) as DonasiPerpus[];
}

export async function tambahDonasi(c: SupabaseClient, input: DonasiPerpusInput, oleh: string): Promise<DonasiPerpus> {
  const baris = { ...input, jumlah: input.jenis === 'uang' ? input.jumlah : null, jumlahBuku: input.jenis === 'buku' ? input.jumlahBuku : null };
  const { data, error } = await c.from('perpus_donasi').insert({ ...baris, createdBy: oleh }).select('*').single();
  if (error) throw new Error(`Gagal menyimpan donasi: ${error.message}`);
  return data as DonasiPerpus;
}

export async function listPengadaan(c: SupabaseClient): Promise<Pengadaan[]> {
  const { data, error } = await c.from('perpus_pengadaan').select('*').order('tanggal', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Gagal memuat pengadaan: ${error.message}`);
  return (data || []) as Pengadaan[];
}

export async function tambahPengadaan(c: SupabaseClient, input: PengadaanInput, oleh: string): Promise<Pengadaan> {
  const { data, error } = await c.from('perpus_pengadaan').insert({ ...input, createdBy: oleh }).select('*').single();
  if (error) throw new Error(`Gagal menyimpan pengadaan: ${error.message}`);
  return data as Pengadaan;
}

export async function ambilRingkasan(c: SupabaseClient): Promise<RingkasanPerpus> {
  const [buku, donasi, pengadaan] = await Promise.all([
    c.from('perpus_buku').select('eksemplar, statusKode, aktif'),
    c.from('perpus_donasi').select('jenis, jumlah, nama'),
    c.from('perpus_pengadaan').select('total'),
  ]);
  const galat = buku.error ?? donasi.error ?? pengadaan.error;
  if (galat) throw new Error(`Gagal memuat ringkasan: ${galat.message}`);
  return hitungRingkasan(buku.data || [], donasi.data || [], pengadaan.data || []);
}

export async function kosongkanPerpus(c: SupabaseClient): Promise<void> {
  for (const t of ['perpus_buku', 'perpus_donasi', 'perpus_pengadaan']) {
    const { error } = await c.from(t).delete().neq('id', ID_MUSTAHIL);
    if (error) throw new Error(`Gagal mengosongkan ${t}: ${error.message}`);
  }
}

/** Simpan hasil impor. Id dibuat di sini agar tautan buku → donasi/pengadaan tidak bergantung urutan hasil insert. */
export async function simpanRencana(c: SupabaseClient, r: RencanaImpor, oleh: string): Promise<{ buku: number; donasi: number; pengadaan: number }> {
  const idDonasi = new Map(r.donasi.map(d => [d.kunci, crypto.randomUUID()]));
  const idPengadaan = new Map(r.pengadaan.map(p => [p.kunci, crypto.randomUUID()]));
  const sisipkan = async (tabel: string, baris: object[]) => {
    for (let i = 0; i < baris.length; i += 100) {
      const { error } = await c.from(tabel).insert(baris.slice(i, i + 100));
      if (error) throw new Error(`Gagal menyimpan ${tabel}: ${error.message}`);
    }
  };
  if (r.donasi.length) await sisipkan('perpus_donasi', r.donasi.map(({ kunci, ...d }) => ({ ...d, id: idDonasi.get(kunci), createdBy: oleh })));
  if (r.pengadaan.length) await sisipkan('perpus_pengadaan', r.pengadaan.map(({ kunci, ...p }) => ({ ...p, id: idPengadaan.get(kunci), createdBy: oleh })));
  await sisipkan('perpus_buku', r.buku.map(({ donasiKunci, pengadaanKunci, ...b }) => ({
    ...b,
    statusKode: 'perlu_audit',
    donasiId: donasiKunci ? idDonasi.get(donasiKunci) ?? null : null,
    pengadaanId: pengadaanKunci ? idPengadaan.get(pengadaanKunci) ?? null : null,
    createdBy: oleh,
  })));
  return { buku: r.buku.length, donasi: r.donasi.length, pengadaan: r.pengadaan.length };
}

export async function terapkanAudit(c: SupabaseClient, items: { id: string; kelasDdc: string }[]): Promise<{ id: string; nomorPanggil: string }[]> {
  const { data, error } = await c.from('perpus_buku').select('id, judul, penulis, kodePengarang, kodeJudul, noSeri, nomorPanggil');
  if (error) throw new Error(`Gagal memuat buku: ${error.message}`);
  const perubahan = rencanakanNomorBaru(data || [], items);
  const { error: galatRpc } = await c.rpc('perpus_terapkan_nomor', { perubahan });
  if (galatRpc) throw new Error(`Gagal menerapkan nomor: ${galatRpc.message}`);
  return perubahan.map(p => ({ id: p.id, nomorPanggil: p.nomorPanggil }));
}
