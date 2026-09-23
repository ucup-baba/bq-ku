import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDonatur, createDonasi, listDonasi, rekap, createSurat, NomorSuratDipakaiError } from '@/lib/db/donatur-repo';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const run = url && key ? describe : describe.skip;

run('donatur-repo (integrasi Supabase)', () => {
  let client: SupabaseClient;
  const dibuat: string[] = [];
  beforeAll(() => { client = createClient(url!, key!, { auth: { persistSession: false } }); });
  afterAll(async () => { if (dibuat.length) await client.from('donatur').delete().in('id', dibuat); });

  it('mencatat donasi uang & barang lalu merekapnya', async () => {
    const d = await createDonatur(client, { nama: 'TEST Donatur', sapaan: 'BAPAK', noWa: '628111111111' } as any);
    dibuat.push(d.id);
    await createDonasi(client, { donaturId: d.id, tanggal: '2026-09-01', jenis: 'INFAQ', bentuk: 'UANG', nominal: 2500000 } as any, '00000000-0000-0000-0000-000000000000');
    await createDonasi(client, { donaturId: d.id, tanggal: '2026-09-02', jenis: 'SHADAQAH', bentuk: 'BARANG', deskripsiBarang: '50 kg beras' } as any, '00000000-0000-0000-0000-000000000000');

    const list = await listDonasi(client, { donaturId: d.id });
    expect(list).toHaveLength(2);

    const r = await rekap(client, '2026-09-01', '2026-09-30');
    expect(r.totalUang).toBeGreaterThanOrEqual(2500000);
    expect(r.barang.some(b => b.deskripsi === '50 kg beras')).toBe(true);
  });

  it('menolak nomor surat ganda', async () => {
    const d = await createDonatur(client, { nama: 'TEST Donatur 2', sapaan: 'IBU' } as any);
    dibuat.push(d.id);
    const donasi = await createDonasi(client, { donaturId: d.id, tanggal: '2026-09-03', jenis: 'ZAKAT', bentuk: 'UANG', nominal: 1000 } as any, '00000000-0000-0000-0000-000000000000');
    const nomor = `9${Date.now() % 100000}/PBQ/IX/2026`;
    await createSurat(client, { donasiId: donasi.id, nomorSurat: nomor, tanggalSurat: '2026-09-03' }, '00000000-0000-0000-0000-000000000000');
    await expect(createSurat(client, { donasiId: donasi.id, nomorSurat: nomor, tanggalSurat: '2026-09-03' }, '00000000-0000-0000-0000-000000000000'))
      .rejects.toBeInstanceOf(NomorSuratDipakaiError);
  });
});
