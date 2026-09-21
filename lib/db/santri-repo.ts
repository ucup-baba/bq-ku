import { db } from './index';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type SantriDocument = {
  id: string;
  santriId: string;
  kategori: string;
  nomorDokumen?: string | null;
  fileUrl: string;
  rawOcrText?: string | null;
  extractedFields?: string | null; // JSON string
  statusVerifikasi: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEED_FIX';
  catatanVerifikasi?: string | null;
  createdAt?: string | null;
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
  keahlian?: string | null; // JSON string
  fotoFormalUrl?: string | null;
  fotoProfilUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  documents?: SantriDocument[];
};

export type SantriInput = Omit<Santri, 'id' | 'createdAt' | 'updatedAt' | 'documents'> & {
  keahlian?: string[] | string | null;
};

export type DocumentInput = {
  santriId: string;
  kategori: string;
  nomorDokumen?: string | null;
  fileUrl: string;
  rawOcrText?: string | null;
  extractedFields?: any;
  statusVerifikasi?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEED_FIX';
  catatanVerifikasi?: string | null;
};

export type SantriFilter = {
  query?: string;
  q?: string;
  jenisKelamin?: 'IKHWAN' | 'AKHWAT';
  jenjang?: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
};

const generateId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export async function createSantri(input: SantriInput): Promise<Santri> {
  const id = generateId();
  const createdAt = now();
  const updatedAt = createdAt;
  
  const keahlianStr = Array.isArray(input.keahlian) 
    ? JSON.stringify(input.keahlian) 
    : (input.keahlian || null);

  const santriData: Santri = {
    ...input,
    id,
    keahlian: keahlianStr,
    createdAt,
    updatedAt,
    namaPanggilan: input.namaPanggilan ?? null,
    noKk: input.noKk ?? null,
    nisn: input.nisn ?? null,
    asalSekolahSebelumnya: input.asalSekolahSebelumnya ?? null,
    namaAyah: input.namaAyah ?? null,
    namaIbu: input.namaIbu ?? null,
    statusSosial: input.statusSosial ?? 'REGULER',
    tahunMasuk: input.tahunMasuk ?? new Date().getFullYear(),
    kontakWali: input.kontakWali ?? null,
    pekerjaanOrtu: input.pekerjaanOrtu ?? null,
    alamat: input.alamat ?? null,
    ringkasanTentang: input.ringkasanTentang ?? null,
    riwayatTahfidz: input.riwayatTahfidz ?? null,
    fotoFormalUrl: input.fotoFormalUrl ?? null,
    fotoProfilUrl: input.fotoProfilUrl ?? null,
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('santri').insert(santriData).select().single();
    if (error) throw new Error(`Gagal menyimpan santri ke Supabase: ${error.message}`);
    return (data || santriData) as Santri;
  }

  // SQLite Fallback
  const stmt = db.prepare(`
    INSERT INTO santri (
      id, namaLengkap, namaPanggilan, nik, noKk, nisn, tempatLahir, tanggalLahir,
      jenisKelamin, tahunMasuk, jenjang, kelas, sekolahSekarang, asalSekolahSebelumnya,
      namaAyah, namaIbu, statusSosial, kontakWali, pekerjaanOrtu, alamat, ringkasanTentang,
      riwayatTahfidz, keahlian, fotoFormalUrl, fotoProfilUrl, createdAt, updatedAt
    ) VALUES (
      @id, @namaLengkap, @namaPanggilan, @nik, @noKk, @nisn, @tempatLahir, @tanggalLahir,
      @jenisKelamin, @tahunMasuk, @jenjang, @kelas, @sekolahSekarang, @asalSekolahSebelumnya,
      @namaAyah, @namaIbu, @statusSosial, @kontakWali, @pekerjaanOrtu, @alamat, @ringkasanTentang,
      @riwayatTahfidz, @keahlian, @fotoFormalUrl, @fotoProfilUrl, @createdAt, @updatedAt
    )
  `);

  stmt.run(santriData);
  return santriData as Santri;
}

export async function getSantriById(id: string): Promise<(Santri & { documents: SantriDocument[] }) | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data: santri, error } = await supabase.from('santri').select('*').eq('id', id).maybeSingle();
    if (error || !santri) return null;
    const { data: docs } = await supabase.from('documents').select('*').eq('santriId', id);
    return { ...santri, documents: docs || [] } as (Santri & { documents: SantriDocument[] });
  }

  // SQLite Fallback
  const santri = db.prepare('SELECT * FROM santri WHERE id = ?').get(id) as Santri | undefined;
  if (!santri) return null;

  const documents = (await listDocumentsBySantri(id)) || [];
  return { ...santri, documents };
}

export async function listSantri(filter?: SantriFilter): Promise<Santri[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let q = supabase.from('santri').select('*, documents(*)');
    const searchQuery = filter?.query || filter?.q;
    if (searchQuery) {
      q = q.or(`namaLengkap.ilike.%${searchQuery}%,nik.ilike.%${searchQuery}%`);
    }
    if (filter?.jenisKelamin) {
      q = q.eq('jenisKelamin', filter.jenisKelamin);
    }
    if (filter?.jenjang) {
      q = q.eq('jenjang', filter.jenjang);
    }
    const { data, error } = await q.order('createdAt', { ascending: false });
    if (error) {
      console.error('Supabase listSantri error:', error);
      return [];
    }
    return (data || []) as Santri[];
  }

  // SQLite Fallback
  let query = 'SELECT * FROM santri WHERE 1=1';
  const params: any[] = [];

  const searchQuery = filter?.query || filter?.q;
  if (searchQuery) {
    query += ' AND (namaLengkap LIKE ? OR nik LIKE ?)';
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }
  if (filter?.jenisKelamin) {
    query += ' AND jenisKelamin = ?';
    params.push(filter.jenisKelamin);
  }
  if (filter?.jenjang) {
    query += ' AND jenjang = ?';
    params.push(filter.jenjang);
  }

  query += ' ORDER BY createdAt DESC';
  const santriList = db.prepare(query).all(...params) as Santri[];
  return santriList.map(s => ({
    ...s,
    documents: (db.prepare('SELECT * FROM documents WHERE santriId = ?').all(s.id) as SantriDocument[]) || [],
  }));
}

export async function updateSantri(id: string, input: Partial<SantriInput>): Promise<Santri> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const updatedPayload: any = {
      ...input,
      updatedAt: now(),
    };
    if (input.keahlian !== undefined) {
      updatedPayload.keahlian = Array.isArray(input.keahlian) ? JSON.stringify(input.keahlian) : input.keahlian;
    }
    const { data, error } = await supabase.from('santri').update(updatedPayload).eq('id', id).select().single();
    if (error) throw new Error(`Gagal memperbarui santri di Supabase: ${error.message}`);
    return data as Santri;
  }

  // SQLite Fallback
  const current = db.prepare('SELECT * FROM santri WHERE id = ?').get(id) as Santri | undefined;
  if (!current) throw new Error('Santri not found');

  const updated: Santri = {
    ...current,
    ...input,
    keahlian: Array.isArray(input.keahlian) ? JSON.stringify(input.keahlian) : (input.keahlian !== undefined ? input.keahlian : current.keahlian),
    updatedAt: now(),
  };

  const fields = Object.keys(updated).filter(k => k !== 'id');
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');

  db.prepare(`UPDATE santri SET ${setClause} WHERE id = @id`).run(updated);
  return updated;
}

export async function deleteSantri(id: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('santri').delete().eq('id', id);
    return !error;
  }

  // SQLite Fallback
  const info = db.prepare('DELETE FROM santri WHERE id = ?').run(id);
  return info.changes > 0;
}

export async function saveDocument(input: DocumentInput): Promise<SantriDocument> {
  const id = generateId();
  const createdAt = now();
  const statusVerifikasi = input.statusVerifikasi || 'PENDING';
  const catatanVerifikasi = input.catatanVerifikasi ?? null;

  const extractedStr = typeof input.extractedFields === 'object' && input.extractedFields !== null
    ? JSON.stringify(input.extractedFields)
    : input.extractedFields;

  const doc: SantriDocument = {
    id,
    santriId: input.santriId,
    kategori: input.kategori,
    nomorDokumen: input.nomorDokumen ?? null,
    fileUrl: input.fileUrl,
    rawOcrText: input.rawOcrText ?? null,
    extractedFields: extractedStr ?? null,
    statusVerifikasi,
    catatanVerifikasi,
    createdAt
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('santriId', input.santriId)
      .eq('kategori', input.kategori)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('documents')
        .update({
          fileUrl: input.fileUrl,
          nomorDokumen: input.nomorDokumen ?? null,
          rawOcrText: input.rawOcrText ?? null,
          extractedFields: extractedStr ?? null,
          statusVerifikasi,
          catatanVerifikasi,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (!error && data) return data as SantriDocument;
    }

    const { data, error } = await supabase.from('documents').insert(doc).select().single();
    if (error) throw new Error(`Gagal menyimpan dokumen ke Supabase: ${error.message}`);
    return (data || doc) as SantriDocument;
  }

  // SQLite Fallback
  const existingSqlite = db.prepare('SELECT id FROM documents WHERE santriId = ? AND kategori = ?').get(input.santriId, input.kategori) as { id: string } | undefined;
  if (existingSqlite) {
    db.prepare(`
      UPDATE documents SET
        fileUrl = @fileUrl,
        nomorDokumen = @nomorDokumen,
        rawOcrText = @rawOcrText,
        extractedFields = @extractedFields,
        statusVerifikasi = @statusVerifikasi,
        catatanVerifikasi = @catatanVerifikasi
      WHERE id = @id
    `).run({
      id: existingSqlite.id,
      fileUrl: input.fileUrl,
      nomorDokumen: input.nomorDokumen ?? null,
      rawOcrText: input.rawOcrText ?? null,
      extractedFields: extractedStr ?? null,
      statusVerifikasi,
      catatanVerifikasi,
    });
    return { ...doc, id: existingSqlite.id };
  }

  const stmt = db.prepare(`
    INSERT INTO documents (
      id, santriId, kategori, nomorDokumen, fileUrl, rawOcrText, extractedFields, statusVerifikasi, catatanVerifikasi, createdAt
    ) VALUES (
      @id, @santriId, @kategori, @nomorDokumen, @fileUrl, @rawOcrText, @extractedFields, @statusVerifikasi, @catatanVerifikasi, @createdAt
    )
  `);

  stmt.run(doc);
  return doc as SantriDocument;
}

export async function listDocumentsBySantri(santriId: string): Promise<SantriDocument[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('documents').select('*').eq('santriId', santriId);
    if (error) return [];
    return (data || []) as SantriDocument[];
  }

  // SQLite Fallback
  return db.prepare('SELECT * FROM documents WHERE santriId = ?').all(santriId) as SantriDocument[];
}

export async function updateDocumentStatus(id: string, status: string, catatan?: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('documents').update({
      statusVerifikasi: status,
      catatanVerifikasi: catatan ?? null
    }).eq('id', id);
    return !error;
  }

  // SQLite Fallback
  const stmt = db.prepare('UPDATE documents SET statusVerifikasi = ?, catatanVerifikasi = ? WHERE id = ?');
  const info = stmt.run(status, catatan ?? null, id);
  return info.changes > 0;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    return !error;
  }

  // SQLite Fallback
  const info = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return info.changes > 0;
}
