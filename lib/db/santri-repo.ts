import { db } from './index';

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
  jenjang: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
  kelas: string;
  sekolahSekarang: string;
  asalSekolahSebelumnya?: string | null;
  namaAyah?: string | null;
  namaIbu?: string | null;
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
};

export type SantriInput = Omit<Santri, 'id' | 'createdAt' | 'updatedAt'> & {
  keahlian?: string[] | string | null;
};

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

export function createSantri(input: SantriInput): Santri {
  const id = generateId();
  const createdAt = now();
  const updatedAt = createdAt;
  
  const keahlianStr = Array.isArray(input.keahlian) 
    ? JSON.stringify(input.keahlian) 
    : (input.keahlian || null);

  const stmt = db.prepare(`
    INSERT INTO santri (
      id, namaLengkap, namaPanggilan, nik, noKk, nisn, tempatLahir, tanggalLahir,
      jenisKelamin, jenjang, kelas, sekolahSekarang, asalSekolahSebelumnya,
      namaAyah, namaIbu, kontakWali, pekerjaanOrtu, alamat, ringkasanTentang,
      riwayatTahfidz, keahlian, fotoFormalUrl, fotoProfilUrl, createdAt, updatedAt
    ) VALUES (
      @id, @namaLengkap, @namaPanggilan, @nik, @noKk, @nisn, @tempatLahir, @tanggalLahir,
      @jenisKelamin, @jenjang, @kelas, @sekolahSekarang, @asalSekolahSebelumnya,
      @namaAyah, @namaIbu, @kontakWali, @pekerjaanOrtu, @alamat, @ringkasanTentang,
      @riwayatTahfidz, @keahlian, @fotoFormalUrl, @fotoProfilUrl, @createdAt, @updatedAt
    )
  `);

  const santriData = {
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
    kontakWali: input.kontakWali ?? null,
    pekerjaanOrtu: input.pekerjaanOrtu ?? null,
    alamat: input.alamat ?? null,
    ringkasanTentang: input.ringkasanTentang ?? null,
    riwayatTahfidz: input.riwayatTahfidz ?? null,
    fotoFormalUrl: input.fotoFormalUrl ?? null,
    fotoProfilUrl: input.fotoProfilUrl ?? null,
  };

  stmt.run(santriData);
  return santriData as Santri;
}

export function getSantriById(id: string): (Santri & { documents: SantriDocument[] }) | null {
  const santri = db.prepare('SELECT * FROM santri WHERE id = ?').get(id) as Santri | undefined;
  if (!santri) return null;

  const documents = listDocumentsBySantri(id);
  return { ...santri, documents };
}

export function listSantri(filter?: SantriFilter): Santri[] {
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
  return db.prepare(query).all(...params) as Santri[];
}

export function updateSantri(id: string, input: Partial<SantriInput>): Santri {
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

export function deleteSantri(id: string): boolean {
  const info = db.prepare('DELETE FROM santri WHERE id = ?').run(id);
  return info.changes > 0;
}

export function saveDocument(input: DocumentInput): SantriDocument {
  const id = generateId();
  const createdAt = now();
  const statusVerifikasi = input.statusVerifikasi || 'PENDING';
  const catatanVerifikasi = input.catatanVerifikasi ?? null;

  const extractedStr = typeof input.extractedFields === 'object' && input.extractedFields !== null
    ? JSON.stringify(input.extractedFields)
    : input.extractedFields;

  const doc = {
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

export function listDocumentsBySantri(santriId: string): SantriDocument[] {
  return db.prepare('SELECT * FROM documents WHERE santriId = ?').all(santriId) as SantriDocument[];
}

export function updateDocumentStatus(id: string, status: string, catatan?: string): boolean {
  const stmt = db.prepare('UPDATE documents SET statusVerifikasi = ?, catatanVerifikasi = ? WHERE id = ?');
  const info = stmt.run(status, catatan ?? null, id);
  return info.changes > 0;
}

export function deleteDocument(id: string): boolean {
  const info = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return info.changes > 0;
}
