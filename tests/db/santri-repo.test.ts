import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSantri, getSantriById, listSantri, updateSantri, deleteSantri, saveDocument, DuplicateNikError } from '@/lib/db/santri-repo';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const run = url && key ? describe : describe.skip;

run('santri-repo (integrasi Supabase)', () => {
  let client: SupabaseClient;
  beforeAll(() => { client = createClient(url!, key!, { auth: { persistSession: false } }); });
  const created: string[] = [];
  const base = {
    namaLengkap: 'TEST Ahmad Fulan', nik: '3201010101010001', tempatLahir: 'Bogor', tanggalLahir: '2011-01-01',
    jenisKelamin: 'IKHWAN' as const, jenjang: 'SMP' as const, kelas: '7', sekolahSekarang: 'SMP IT BQ',
  };

  afterAll(async () => {
    if (created.length) await client.from('santri').delete().in('id', created);
  });

  it('membuat, membaca, memperbarui, menghapus santri', async () => {
    const s = await createSantri(client, base);
    created.push(s.id);
    expect(s.id).toBeTruthy();
    const got = await getSantriById(client, s.id);
    expect(got?.namaLengkap).toBe(base.namaLengkap);
    expect(got?.documents).toEqual([]);
    const up = await updateSantri(client, s.id, { kelas: '8' });
    expect(up.kelas).toBe('8');
    const list = await listSantri(client, { q: 'TEST Ahmad' });
    expect(list.some(x => x.id === s.id)).toBe(true);
    expect(await deleteSantri(client, s.id)).toBe(true);
    created.splice(created.indexOf(s.id), 1);
  });

  it('menolak NIK ganda dengan DuplicateNikError', async () => {
    const a = await createSantri(client, { ...base, nik: '3201010101010002' });
    created.push(a.id);
    await expect(createSantri(client, { ...base, nik: '3201010101010002' })).rejects.toBeInstanceOf(DuplicateNikError);
  });

  it('menyimpan dokumen dengan storagePath & mengembalikan signed fileUrl', async () => {
    const s = await createSantri(client, { ...base, nik: '3201010101010003' });
    created.push(s.id);
    const path = `test/${s.id}/kk.txt`;
    await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').upload(path, new Blob(['x']), { upsert: true });
    const d = await saveDocument(client, { santriId: s.id, kategori: 'KARTU_KELUARGA', storagePath: path });
    expect(d.storagePath).toBe(path);
    expect(d.fileUrl).toMatch(/\/object\/sign\//);
  });
});
