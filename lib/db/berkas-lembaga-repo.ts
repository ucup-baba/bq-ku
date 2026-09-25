import type { SupabaseClient } from '@supabase/supabase-js';
import type { JenisBerkas } from '@/lib/lembaga/berkas';
import { buatPin, buatToken, hashPin, hashToken } from '@/lib/bagikan/keamanan';

export type VersiBerkas = {
  id: string; berkasId: string; versi: number; storagePath: string; namaFile: string;
  mime: 'application/pdf' | 'image/jpeg' | 'image/png'; ukuran: number; createdAt: string; createdBy: string | null;
};
export type BerkasLembaga = {
  id: string; jenis: JenisBerkas; namaLainnya: string | null; nomorDokumen: string | null;
  tanggalTerbit: string | null; berlakuSampai: string | null; namaPenandatangan: string | null;
  createdAt: string; createdBy: string | null; updatedAt: string;
};
/** Versi diurutkan terbaru dulu. Untuk Pengurus, versi berkas rahasia kosong (disaring RLS). */
export type BerkasDenganVersi = BerkasLembaga & { versi: VersiBerkas[] };
export type DataBerkasInput = Pick<BerkasLembaga, 'jenis' | 'namaLainnya' | 'nomorDokumen' | 'tanggalTerbit' | 'berlakuSampai' | 'namaPenandatangan'>;

export type TautanBagikan = {
  id: string; penerima: string; catatan: string | null; kedaluwarsaAt: string; dicabutAt: string | null;
  batasBuka: number | null; jumlahBuka: number; tandaAir: boolean; createdAt: string; createdBy: string | null;
  pakaiPin: boolean; berkasIds: string[];
};
export type AksiLog = 'LIHAT' | 'UNDUH' | 'UNGGAH' | 'VERSI_BARU' | 'UBAH_DATA' | 'HAPUS' | 'BUAT_TAUTAN'
  | 'CABUT_TAUTAN' | 'BUKA_TAUTAN' | 'UNDUH_TAUTAN' | 'PIN_SALAH';
export type LogAkses = {
  id: number; waktu: string; aksi: AksiLog; berkasId: string | null; versiId: string | null; tautanId: string | null;
  userId: string | null; ip: string | null; perangkat: string | null; rincian: string | null;
};

const id = () => crypto.randomUUID();

export function versiTerbaru(b: Pick<BerkasDenganVersi, 'versi'>): VersiBerkas | null {
  return b.versi.reduce<VersiBerkas | null>((m, v) => (!m || v.versi > m.versi ? v : m), null);
}

const urutkan = (b: BerkasDenganVersi): BerkasDenganVersi => ({ ...b, versi: [...(b.versi ?? [])].sort((x, y) => y.versi - x.versi) });

export async function listBerkas(client: SupabaseClient): Promise<BerkasDenganVersi[]> {
  const { data, error } = await client.from('berkas_lembaga').select('*, versi:berkas_lembaga_versi(*)').order('createdAt');
  if (error) throw new Error(`Gagal memuat berkas lembaga: ${error.message}`);
  return ((data ?? []) as BerkasDenganVersi[]).map(urutkan);
}

export async function getBerkas(client: SupabaseClient, berkasId: string): Promise<BerkasDenganVersi | null> {
  const { data, error } = await client.from('berkas_lembaga').select('*, versi:berkas_lembaga_versi(*)').eq('id', berkasId).maybeSingle();
  if (error || !data) return null;
  return urutkan(data as BerkasDenganVersi);
}

export async function buatBerkas(client: SupabaseClient, input: DataBerkasInput, userId: string): Promise<BerkasLembaga> {
  const { data, error } = await client.from('berkas_lembaga').insert({ id: id(), ...input, createdBy: userId }).select().single();
  if (error?.code === '23505') throw new Error('Berkas jenis ini sudah ada — ganti versinya saja');
  if (error) throw new Error(`Gagal menyimpan berkas: ${error.message}`);
  return data as BerkasLembaga;
}

export async function tambahVersi(
  client: SupabaseClient, berkasId: string,
  file: Pick<VersiBerkas, 'storagePath' | 'namaFile' | 'mime' | 'ukuran'>, userId: string,
): Promise<VersiBerkas> {
  const { data: akhir } = await client.from('berkas_lembaga_versi').select('versi').eq('berkasId', berkasId)
    .order('versi', { ascending: false }).limit(1).maybeSingle();
  const versi = ((akhir as { versi: number } | null)?.versi ?? 0) + 1;
  const { data, error } = await client.from('berkas_lembaga_versi')
    .insert({ id: id(), berkasId, versi, ...file, createdBy: userId }).select().single();
  if (error) throw new Error(`Gagal menyimpan versi berkas: ${error.message}`);
  return data as VersiBerkas;
}

export async function ubahDataBerkas(client: SupabaseClient, berkasId: string, patch: Partial<Omit<DataBerkasInput, 'jenis'>>): Promise<BerkasLembaga> {
  const { data, error } = await client.from('berkas_lembaga').update(patch).eq('id', berkasId).select().single();
  if (error) throw new Error(`Gagal memperbarui berkas: ${error.message}`);
  return data as BerkasLembaga;
}

/** Hapus berkas (Superadmin). Mengembalikan path storage semua versinya untuk dihapus pemanggil. */
export async function hapusBerkas(client: SupabaseClient, berkasId: string): Promise<string[]> {
  const { data: versi } = await client.from('berkas_lembaga_versi').select('storagePath').eq('berkasId', berkasId);
  const { data, error } = await client.from('berkas_lembaga').delete().eq('id', berkasId).select('id');
  if (error) throw new Error(`Gagal menghapus berkas: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Anda tidak memiliki izin menghapus berkas ini');
  return ((versi ?? []) as Array<{ storagePath: string }>).map(v => v.storagePath);
}

export async function getPengaturanKelola(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.from('pengaturan').select('nilai').eq('kunci', 'pengurus_kelola_berkas').maybeSingle();
  return (data as { nilai: unknown } | null)?.nilai === true;
}

export async function setPengaturanKelola(client: SupabaseClient, nilai: boolean, userId: string): Promise<void> {
  const { data, error } = await client.from('pengaturan')
    .update({ nilai, updatedAt: new Date().toISOString(), updatedBy: userId }).eq('kunci', 'pengurus_kelola_berkas').select('kunci');
  if (error) throw new Error(`Gagal menyimpan pengaturan: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Anda tidak memiliki izin mengubah pengaturan ini');
}

type BarisTautan = Omit<TautanBagikan, 'pakaiPin' | 'berkasIds'> & { pinHash: string | null; berkas: Array<{ berkasId: string }> };

export async function listTautan(client: SupabaseClient): Promise<TautanBagikan[]> {
  const { data, error } = await client.from('tautan_bagikan')
    .select('id, penerima, catatan, kedaluwarsaAt, dicabutAt, batasBuka, jumlahBuka, tandaAir, createdAt, createdBy, pinHash, berkas:tautan_bagikan_berkas(berkasId)')
    .order('createdAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat tautan: ${error.message}`);
  return ((data ?? []) as BarisTautan[]).map(({ pinHash, berkas, ...t }) => ({ ...t, pakaiPin: !!pinHash, berkasIds: (berkas ?? []).map(b => b.berkasId) }));
}

export type InputTautan = { penerima: string; catatan?: string | null; hari: 1 | 7 | 30 | number; tandaAir: boolean; pakaiPin: boolean; batasBuka?: number | null };

/** Membuat tautan. Token & PIN asli hanya dikembalikan sekali ini; DB menyimpan hash-nya. */
export async function buatTautan(
  client: SupabaseClient, input: InputTautan, berkasIds: string[], userId: string, sekarang = new Date(),
): Promise<{ id: string; token: string; pin: string | null; kedaluwarsaAt: string }> {
  const token = buatToken();
  const pin = input.pakaiPin ? buatPin() : null;
  const kedaluwarsaAt = new Date(sekarang.getTime() + input.hari * 86_400_000).toISOString();
  const { data, error } = await client.from('tautan_bagikan').insert({
    id: id(), tokenHash: hashToken(token), penerima: input.penerima.trim(), catatan: input.catatan?.trim() || null,
    kedaluwarsaAt, pinHash: pin ? await hashPin(pin) : null, batasBuka: input.batasBuka ?? null,
    tandaAir: input.tandaAir, createdBy: userId,
  }).select('id').single();
  if (error || !data) throw new Error(`Gagal membuat tautan: ${error?.message ?? 'tanpa data'}`);
  const tautanId = (data as { id: string }).id;
  const { error: rErr } = await client.from('tautan_bagikan_berkas').insert(berkasIds.map(berkasId => ({ tautanId, berkasId })));
  if (rErr) {
    // Tautan tanpa isi yang benar tidak boleh berlaku: cabut seketika (tidak ada izin hapus).
    await client.from('tautan_bagikan').update({ dicabutAt: sekarang.toISOString() }).eq('id', tautanId);
    throw new Error(rErr.message.includes('tidak boleh dibagikan') ? 'Cap dan tanda tangan tidak boleh dibagikan' : `Gagal menyimpan isi tautan: ${rErr.message}`);
  }
  return { id: tautanId, token, pin, kedaluwarsaAt };
}

export async function cabutTautan(client: SupabaseClient, tautanId: string): Promise<boolean> {
  const { data, error } = await client.from('tautan_bagikan').update({ dicabutAt: new Date().toISOString() })
    .eq('id', tautanId).is('dicabutAt', null).select('id');
  if (error) throw new Error(`Gagal mencabut tautan: ${error.message}`);
  return !!data && data.length > 0;
}

export async function listLog(
  client: SupabaseClient, f: { berkasId?: string; tautanId?: string; sebelum?: number; limit?: number } = {},
): Promise<LogAkses[]> {
  let q = client.from('log_akses_berkas').select('*').order('id', { ascending: false }).limit(f.limit ?? 50);
  if (f.berkasId) q = q.eq('berkasId', f.berkasId);
  if (f.tautanId) q = q.eq('tautanId', f.tautanId);
  if (f.sebelum) q = q.lt('id', f.sebelum);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal memuat catatan akses: ${error.message}`);
  return (data ?? []) as LogAkses[];
}

/** Catatan akses atas nama pengguna ber-login (lewat RPC). Gagal mencatat tidak menggagalkan aksi, tapi terlihat di log server. */
export async function catatAkses(
  client: SupabaseClient, aksi: AksiLog, o: { berkasId?: string | null; versiId?: string | null; tautanId?: string | null; rincian?: string | null } = {},
): Promise<void> {
  const { error } = await client.rpc('catat_akses_berkas', {
    p_aksi: aksi, p_berkas: o.berkasId ?? null, p_versi: o.versiId ?? null, p_tautan: o.tautanId ?? null, p_rincian: o.rincian ?? null,
  });
  if (error) console.error('Gagal mencatat akses berkas', { aksi, error: error.message });
}

/** Cap/tanda tangan berganti → surat yang BELUM terkirim dirender ulang (yang terkirim tetap seperti diterima donatur). */
export async function segarkanSuratBelumTerkirim(client: SupabaseClient): Promise<void> {
  const { error } = await client.from('surat').update({ storagePath: null }).eq('terkirimWa', false);
  if (error) console.error('Gagal menyegarkan PNG surat belum terkirim', error.message);
}
