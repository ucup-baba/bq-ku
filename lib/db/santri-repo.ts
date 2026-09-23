import type { SupabaseClient } from '@supabase/supabase-js';
import { signPaths } from '@/lib/storage/signed';
import { storagePathFromUrl, isPathSuratDonatur } from '@/lib/storage/paths';
import { escapeOrFilterValue } from '@/lib/db/filters';

export type StatusVerifikasi = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEED_FIX';

export type SantriDocument = {
  id: string;
  santriId: string;
  kategori: string;
  nomorDokumen?: string | null;
  storagePath: string;
  /** Signed URL (1 jam); selalu disematkan oleh fungsi baca repo. */
  fileUrl: string;
  rawOcrText?: string | null;
  extractedFields?: string | null;
  statusVerifikasi: StatusVerifikasi;
  catatanVerifikasi?: string | null;
  createdAt?: string | null;
};

export type UploadToken = {
  id: string; santriId: string; token: string; expiresAt: string; usedCount: number; createdAt?: string | null;
};

export type Santri = {
  id: string;
  namaLengkap: string;
  namaPanggilan?: string | null;
  nik: string;
  noKk?: string | null;
  nisn?: string | null;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'IKHWAN' | 'AKHWAT';
  tahunMasuk?: number | null;
  jenjang: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
  kelas: string;
  sekolahSekarang: string;
  asalSekolahSebelumnya?: string | null;
  namaAyah?: string | null;
  namaIbu?: string | null;
  statusSosial?: 'REGULER' | 'YATIM' | 'PIATU' | 'YATIM_PIATU' | 'DHUAFA' | null;
  kontakWali?: string | null;
  pekerjaanOrtu?: string | null;
  alamat?: string | null;
  ringkasanTentang?: string | null;
  riwayatTahfidz?: string | null;
  keahlian?: string | null;
  fotoFormalPath?: string | null;
  fotoProfilPath?: string | null;
  /** Signed URL, hanya di respons baca. */
  fotoFormalUrl?: string | null;
  fotoProfilUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  documents?: SantriDocument[];
};

export type SantriInput = Omit<Santri, 'id' | 'createdAt' | 'updatedAt' | 'documents' | 'fotoFormalUrl' | 'fotoProfilUrl' | 'keahlian'> & {
  keahlian?: string[] | string | null;
};

export type DocumentInput = {
  santriId: string;
  kategori: string;
  nomorDokumen?: string | null;
  /** Boleh path, signed URL, atau public URL lama — dinormalisasi. */
  storagePath: string;
  rawOcrText?: string | null;
  extractedFields?: unknown;
  statusVerifikasi?: StatusVerifikasi;
  catatanVerifikasi?: string | null;
};

export type SantriFilter = {
  query?: string; q?: string;
  jenisKelamin?: 'IKHWAN' | 'AKHWAT';
  jenjang?: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
};

export class DuplicateNikError extends Error {
  constructor(public existingId: string) { super('NIK sudah terdaftar'); this.name = 'DuplicateNikError'; }
}

const generateId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const keahlianToString = (k: SantriInput['keahlian']) => Array.isArray(k) ? JSON.stringify(k) : (k ?? null);

// Lapisan kedua (defense-in-depth): meski storagePathFromUrl seharusnya
// sudah menolak path 'surat/...' saat ditulis, data lama/rusak di DB tetap
// TIDAK BOLEH ditandatangani lewat jalur santri — PNG surat donatur hanya
// boleh ditandatangani oleh ruang donatur sendiri.
const pathAmanUntukTandaTangan = (p?: string | null): p is string => !!p && !isPathSuratDonatur(p);

async function attachSignedUrls(client: SupabaseClient, rows: Santri[]): Promise<Santri[]> {
  const paths: string[] = [];
  for (const s of rows) {
    if (pathAmanUntukTandaTangan(s.fotoFormalPath)) paths.push(s.fotoFormalPath);
    if (pathAmanUntukTandaTangan(s.fotoProfilPath)) paths.push(s.fotoProfilPath);
    for (const d of s.documents || []) if (pathAmanUntukTandaTangan(d.storagePath)) paths.push(d.storagePath);
  }
  const map = await signPaths(client, paths);
  return rows.map(s => ({
    ...s,
    fotoFormalUrl: pathAmanUntukTandaTangan(s.fotoFormalPath) ? map[s.fotoFormalPath] || null : null,
    fotoProfilUrl: pathAmanUntukTandaTangan(s.fotoProfilPath) ? map[s.fotoProfilPath] || null : null,
    documents: (s.documents || []).map(d => ({ ...d, fileUrl: pathAmanUntukTandaTangan(d.storagePath) ? (map[d.storagePath] || '') : '' })),
  }));
}

export async function createSantri(client: SupabaseClient, input: SantriInput): Promise<Santri> {
  const row = {
    ...input,
    id: generateId(),
    keahlian: keahlianToString(input.keahlian),
    statusSosial: input.statusSosial ?? 'REGULER',
    tahunMasuk: input.tahunMasuk ?? new Date().getFullYear(),
    fotoFormalPath: input.fotoFormalPath ? storagePathFromUrl(input.fotoFormalPath) : null,
    fotoProfilPath: input.fotoProfilPath ? storagePathFromUrl(input.fotoProfilPath) : null,
    createdAt: now(),
    updatedAt: now(),
  };
  const { data, error } = await client.from('santri').insert(row).select().single();
  if (error) {
    if (error.code === '23505') {
      const { data: ex } = await client.from('santri').select('id').eq('nik', input.nik).maybeSingle();
      throw new DuplicateNikError(ex?.id || '');
    }
    throw new Error(`Gagal menyimpan santri: ${error.message}`);
  }
  const [withUrls] = await attachSignedUrls(client, [{ ...(data as Santri), documents: [] }]);
  return withUrls;
}

export async function getSantriById(client: SupabaseClient, id: string): Promise<(Santri & { documents: SantriDocument[] }) | null> {
  const { data, error } = await client.from('santri').select('*, documents(*)').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [s] = await attachSignedUrls(client, [data as Santri]);
  return s as Santri & { documents: SantriDocument[] };
}

export async function listSantri(client: SupabaseClient, filter?: SantriFilter): Promise<Santri[]> {
  let q = client.from('santri').select('*, documents(*)');
  const search = filter?.query || filter?.q;
  const aman = search ? escapeOrFilterValue(search) : '';
  if (aman) q = q.or(`namaLengkap.ilike.%${aman}%,nik.ilike.%${aman}%`);
  if (filter?.jenisKelamin) q = q.eq('jenisKelamin', filter.jenisKelamin);
  if (filter?.jenjang) q = q.eq('jenjang', filter.jenjang);
  const { data, error } = await q.order('createdAt', { ascending: false });
  if (error) throw new Error(`Gagal mengambil daftar santri: ${error.message}`);
  return attachSignedUrls(client, (data || []) as Santri[]);
}

export async function updateSantri(client: SupabaseClient, id: string, patch: Partial<SantriInput>): Promise<Santri> {
  const row: Record<string, unknown> = { ...patch, updatedAt: now() };
  if (patch.keahlian !== undefined) row.keahlian = keahlianToString(patch.keahlian);
  if (patch.fotoFormalPath !== undefined) row.fotoFormalPath = patch.fotoFormalPath ? storagePathFromUrl(patch.fotoFormalPath) : null;
  if (patch.fotoProfilPath !== undefined) row.fotoProfilPath = patch.fotoProfilPath ? storagePathFromUrl(patch.fotoProfilPath) : null;
  const { data, error } = await client.from('santri').update(row).eq('id', id).select('*, documents(*)').single();
  if (error) {
    if (error.code === '23505') {
      const { data: ex } = await client.from('santri').select('id').eq('nik', patch.nik!).maybeSingle();
      throw new DuplicateNikError(ex?.id || '');
    }
    throw new Error(`Gagal memperbarui santri: ${error.message}`);
  }
  const [s] = await attachSignedUrls(client, [data as Santri]);
  return s;
}

export async function deleteSantri(client: SupabaseClient, id: string): Promise<boolean> {
  const { data: docs } = await client.from('documents').select('storagePath').eq('santriId', id);
  const { data: s } = await client.from('santri').select('fotoFormalPath, fotoProfilPath').eq('id', id).maybeSingle();
  const { error, count } = await client.from('santri').delete({ count: 'exact' }).eq('id', id);
  if (error) throw new Error(`Gagal menghapus santri: ${error.message}`);
  // Lapisan kedua: jangan pernah menghapus berkas di folder surat/ (aset
  // donatur) lewat jalur penghapusan santri, walau data storagePath di DB
  // sudah rusak/lama.
  const paths = [...(docs || []).map(d => d.storagePath), s?.fotoFormalPath, s?.fotoProfilPath]
    .filter((p): p is string => !!p && !isPathSuratDonatur(p));
  if (paths.length) await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').remove(paths);
  return (count ?? 0) > 0;
}

export async function saveDocument(client: SupabaseClient, input: DocumentInput): Promise<SantriDocument> {
  const storagePath = storagePathFromUrl(input.storagePath);
  const extracted = typeof input.extractedFields === 'object' && input.extractedFields !== null
    ? JSON.stringify(input.extractedFields) : (input.extractedFields as string | null | undefined) ?? null;
  const base = {
    nomorDokumen: input.nomorDokumen ?? null,
    storagePath,
    rawOcrText: input.rawOcrText ?? null,
    extractedFields: extracted,
    statusVerifikasi: input.statusVerifikasi || 'PENDING',
    catatanVerifikasi: input.catatanVerifikasi ?? null,
  };
  const { data: existing } = await client.from('documents').select('id, storagePath')
    .eq('santriId', input.santriId).eq('kategori', input.kategori).maybeSingle();

  let saved: SantriDocument;
  if (existing) {
    const { data, error } = await client.from('documents').update(base).eq('id', existing.id).select().single();
    if (error) throw new Error(`Gagal memperbarui dokumen: ${error.message}`);
    saved = data as SantriDocument;
    // Lapisan kedua: storagePath baru tidak pernah 'surat/...' (ditolak oleh
    // storagePathFromUrl di atas), tapi existing.storagePath berasal dari DB
    // dan bisa saja data lama/rusak — jangan hapus berkas surat donatur.
    if (existing.storagePath && existing.storagePath !== storagePath && !isPathSuratDonatur(existing.storagePath)) {
      await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').remove([existing.storagePath]);
    }
  } else {
    const { data, error } = await client.from('documents')
      .insert({ id: generateId(), santriId: input.santriId, kategori: input.kategori, createdAt: now(), ...base }).select().single();
    if (error) throw new Error(`Gagal menyimpan dokumen: ${error.message}`);
    saved = data as SantriDocument;
  }
  const map = pathAmanUntukTandaTangan(saved.storagePath) ? await signPaths(client, [saved.storagePath]) : {};
  return { ...saved, fileUrl: pathAmanUntukTandaTangan(saved.storagePath) ? (map[saved.storagePath] || '') : '' };
}

export async function getDocumentById(client: SupabaseClient, id: string): Promise<SantriDocument | null> {
  const { data, error } = await client.from('documents').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as SantriDocument;
}

export async function listDocumentsBySantri(client: SupabaseClient, santriId: string): Promise<SantriDocument[]> {
  const { data, error } = await client.from('documents').select('*').eq('santriId', santriId);
  if (error) return [];
  const rows = (data || []) as SantriDocument[];
  const map = await signPaths(client, rows.map(d => d.storagePath).filter(pathAmanUntukTandaTangan));
  return rows.map(d => ({ ...d, fileUrl: pathAmanUntukTandaTangan(d.storagePath) ? (map[d.storagePath] || '') : '' }));
}

export async function updateDocumentStatus(client: SupabaseClient, id: string, status: StatusVerifikasi, catatan?: string): Promise<boolean> {
  const { error } = await client.from('documents').update({ statusVerifikasi: status, catatanVerifikasi: catatan ?? null }).eq('id', id);
  return !error;
}

export async function deleteDocument(client: SupabaseClient, id: string): Promise<boolean> {
  const doc = await getDocumentById(client, id);
  const { error } = await client.from('documents').delete().eq('id', id);
  // Lapisan kedua: jangan hapus berkas surat donatur lewat jalur dokumen santri.
  if (!error && doc?.storagePath && !isPathSuratDonatur(doc.storagePath)) {
    await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').remove([doc.storagePath]);
  }
  return !error;
}

export async function createUploadTokenRecord(client: SupabaseClient, santriId: string, token: string, expiresAt: string): Promise<UploadToken> {
  const record: UploadToken = { id: 'tok_' + generateId().slice(0, 8), santriId, token, expiresAt, usedCount: 0, createdAt: now() };
  const { data, error } = await client.from('upload_tokens').insert(record).select().single();
  if (error) throw new Error(`Gagal membuat token upload: ${error.message}`);
  return data as UploadToken;
}

export async function getUploadTokenRecord(client: SupabaseClient, token: string): Promise<UploadToken | null> {
  const { data, error } = await client.from('upload_tokens').select('*').eq('token', token).maybeSingle();
  if (error || !data) return null;
  return data as UploadToken;
}

export async function incrementUploadTokenUsage(client: SupabaseClient, token: string): Promise<void> {
  const rec = await getUploadTokenRecord(client, token);
  if (!rec) return;
  await client.from('upload_tokens').update({ usedCount: rec.usedCount + 1 }).eq('token', token);
}
