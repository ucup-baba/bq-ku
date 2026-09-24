import { describe, it, expect } from 'vitest';
import { donaturSchema, donaturUpdateSchema, donasiSchema, suratSchema, rekapQuerySchema } from '@/lib/validation/donatur';

const donaturValid = { nama: 'H. Pradana', sapaan: 'BAPAK', noWa: '0812-3456-7890' };

describe('donaturSchema', () => {
  it('menormalisasi nomor WA', () => {
    const r = donaturSchema.safeParse(donaturValid);
    expect(r.success && r.data.noWa).toBe('6281234567890');
  });
  it('nomor WA wajib (kosong maupun tidak dikirim ditolak)', () => {
    for (const noWa of [undefined, '', '   ']) {
      const r = donaturSchema.safeParse({ nama: 'Hamba Allah', sapaan: 'BAPAK', noWa });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toBe('Nomor WhatsApp wajib diisi');
    }
  });
  it('ubah donatur: field boleh sebagian, tapi WA tidak boleh dikosongkan', () => {
    expect(donaturUpdateSchema.safeParse({ nama: 'Hamba Allah' }).success).toBe(true);
    expect(donaturUpdateSchema.safeParse({ noWa: '' }).success).toBe(false);
  });
  it('menolak nama terlalu pendek', () => {
    expect(donaturSchema.safeParse({ ...donaturValid, nama: 'A' }).success).toBe(false);
  });
});

describe('donasiSchema', () => {
  const dasar = { donaturId: 'd1', tanggal: '2026-09-21', jenis: 'INFAQ' as const };
  it('uang wajib punya nominal > 0', () => {
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG', nominal: 2500000 }).success).toBe(true);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG', nominal: 0 }).success).toBe(false);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG' }).success).toBe(false);
  });
  it('barang wajib punya deskripsi dan tanpa nominal', () => {
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'BARANG', deskripsiBarang: '50 kg beras' }).success).toBe(true);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'BARANG' }).success).toBe(false);
  });
  it('menolak tanggal di masa depan', () => {
    expect(donasiSchema.safeParse({ ...dasar, tanggal: '2999-01-01', bentuk: 'UANG', nominal: 1000 }).success).toBe(false);
  });
  it('menolak tanggal yang tidak ada di kalender, menerima 29 Feb tahun kabisat', () => {
    const r = donasiSchema.safeParse({ ...dasar, tanggal: '2026-02-30', bentuk: 'UANG', nominal: 1000 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map(i => i.message)).toContain('Tanggal tidak valid');
    expect(donasiSchema.safeParse({ ...dasar, tanggal: '2024-02-29', bentuk: 'UANG', nominal: 1000 }).success).toBe(true);
  });
});

describe('rekapQuerySchema', () => {
  it('menerima rentang bulan berjalan yang berakhir di masa depan', () => {
    const r = rekapQuerySchema.safeParse({ dari: '2026-09-01', sampai: '2026-09-30' });
    expect(r.success).toBe(true);
  });
  it('menerima rentang yang berakhir jauh di masa depan', () => {
    expect(rekapQuerySchema.safeParse({ dari: '2026-01-01', sampai: '2099-12-31' }).success).toBe(true);
  });
  it('menolak dari > sampai', () => {
    const r = rekapQuerySchema.safeParse({ dari: '2026-09-30', sampai: '2026-09-01' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(['sampai']);
      expect(r.error.issues[0].message).toBe('Tanggal awal harus sebelum atau sama dengan tanggal akhir');
    }
  });
  it('menolak format tanggal tidak valid', () => {
    expect(rekapQuerySchema.safeParse({ dari: '2026/09/01', sampai: '2026-09-30' }).success).toBe(false);
  });
  it('menolak tanggal kalender tidak ada (2026-02-30), menerima 2024-02-29', () => {
    expect(rekapQuerySchema.safeParse({ dari: '2026-02-01', sampai: '2026-02-30' }).success).toBe(false);
    expect(rekapQuerySchema.safeParse({ dari: '2024-02-01', sampai: '2024-02-29' }).success).toBe(true);
  });
});

describe('suratSchema', () => {
  it('menerima nomor surat berformat benar', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271/PBQ/IX/2026', tanggalSurat: '2026-09-22' }).success).toBe(true);
  });
  it('menolak nomor urut dengan nol di depan', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '01/PBQ/IX/2026', tanggalSurat: '2026-09-22' }).success).toBe(false);
  });
  it('menolak tanggal surat yang tidak ada di kalender', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271/PBQ/II/2026', tanggalSurat: '2026-02-30' }).success).toBe(false);
  });
  it('menolak nomor surat asal-asalan', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271', tanggalSurat: '2026-09-22' }).success).toBe(false);
  });

  const dasarSurat = { donasiId: 'x', nomorSurat: '271/PBQ/IX/2026', tanggalSurat: '2026-09-22' };
  it('menerima gayaTulisan PATRICK', () => {
    const r = suratSchema.safeParse({ ...dasarSurat, gayaTulisan: 'PATRICK' });
    expect(r.success && r.data.gayaTulisan).toBe('PATRICK');
  });
  it('menolak gayaTulisan yang tidak dikenal', () => {
    expect(suratSchema.safeParse({ ...dasarSurat, gayaTulisan: 'COMIC' }).success).toBe(false);
  });
  it('default gayaTulisan KALAM bila tidak diisi', () => {
    const r = suratSchema.safeParse(dasarSurat);
    expect(r.success && r.data.gayaTulisan).toBe('KALAM');
  });
});
