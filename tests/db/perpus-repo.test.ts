import { describe, it, expect, vi } from 'vitest';
import { tambahBuku, simpanRencana, terapkanAudit, unggahSampulBuku, kosongkanPerpus } from '@/lib/db/perpus-repo';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';
import type { RencanaImpor } from '@/lib/perpus/impor';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan `hasil`. */
function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
function klien(antrean: Record<string, unknown[]>, catat: Record<string, unknown[][]> = {}) {
  return {
    from: vi.fn((t: string) => rantai(antrean[t]?.shift(), (catat[t] ??= []))),
    rpc: vi.fn(async () => ({ error: null })),
  } as any;
}
const input = { judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221', seri: null, eksemplar: 1, asal: 'koleksi_awal' as const, donasiId: null, pengadaanId: null };

describe('tambahBuku', () => {
  it('menyusun nomor yang belum terpakai', async () => {
    const catat: Record<string, unknown[][]> = {};
    const c = klien({ perpus_buku: [{ data: [{ nomorPanggil: '899.221 LIY r' }], error: null }, { data: { id: 'b1' }, error: null }] }, catat);
    await tambahBuku(c, input, 'u1');
    const insert = catat.perpus_buku.find(x => x[0] === 'insert')![1];
    expect(insert).toMatchObject({ nomorPanggil: '899.221 LIY ra', kodePengarang: 'LIY', kodeJudul: 'ra', statusKode: 'baku', createdBy: 'u1' });
  });
  it('pelanggaran unik → NomorBentrokError', async () => {
    const c = klien({ perpus_buku: [{ data: [], error: null }, { data: null, error: { code: '23505', message: 'dup' } }] });
    await expect(tambahBuku(c, input, 'u1')).rejects.toBeInstanceOf(NomorBentrokError);
  });
});

describe('simpanRencana', () => {
  it('menautkan buku ke id donasi/pengadaan dan menandai perlu audit', async () => {
    const catat: Record<string, unknown[][]> = {};
    const ok = { data: null, error: null };
    const c = klien({ perpus_donasi: [ok], perpus_pengadaan: [ok], perpus_buku: [ok] }, catat);
    const r: RencanaImpor = {
      donasi: [{ kunci: 'infaq-14', tanggal: '2025-04-06', tanggalTeks: '06/04/2025', nama: 'Bu Siti', jenis: 'buku', jumlah: null, jumlahBuku: 1 }],
      pengadaan: [{ kunci: 'pengadaan-1', tanggal: null, tanggalTeks: 'September', total: 1000 }],
      buku: [{
        judul: 'Guru Aini', penulis: 'Andrea Hirata', kelasDdc: '813', kodePengarang: 'HIR', kodeJudul: 'g', noSeri: null,
        nomorPanggil: '813 HIR g', nomorPanggilLama: '813 HIR G', eksemplar: 1, asal: 'wakaf',
        donasiKunci: 'infaq-14', pengadaanKunci: 'pengadaan-1', catatanAudit: null,
      }],
      tidakCocok: [],
    };
    expect(await simpanRencana(c, r, 'u1')).toEqual({ buku: 1, donasi: 1, pengadaan: 1 });
    const donasi = (catat.perpus_donasi.find(x => x[0] === 'insert')![1] as any[])[0];
    const pengadaan = (catat.perpus_pengadaan.find(x => x[0] === 'insert')![1] as any[])[0];
    const buku = (catat.perpus_buku.find(x => x[0] === 'insert')![1] as any[])[0];
    expect(donasi).not.toHaveProperty('kunci');
    expect(buku).toMatchObject({ donasiId: donasi.id, pengadaanId: pengadaan.id, statusKode: 'perlu_audit', createdBy: 'u1' });
    expect(buku).not.toHaveProperty('donasiKunci');
  });
});

describe('terapkanAudit', () => {
  it('memanggil RPC dengan perubahan nomor', async () => {
    const c = klien({ perpus_buku: [{ data: [
      { id: 'a', judul: 'Rasa', penulis: 'Tere Liye', kodePengarang: 'LIY', kodeJudul: 'r', noSeri: null, nomorPanggil: '813 LIY r' },
    ], error: null }] });
    const h = await terapkanAudit(c, [{ id: 'a', kelasDdc: '899.221' }]);
    expect(h).toEqual([{ id: 'a', nomorPanggil: '899.221 LIY r' }]);
    expect(c.rpc).toHaveBeenCalledWith('perpus_terapkan_nomor', {
      perubahan: [{ id: 'a', kelasDdc: '899.221', kodePengarang: 'LIY', kodeJudul: 'r', noSeri: null, nomorPanggil: '899.221 LIY r' }],
    });
  });
});

describe('unggahSampulBuku', () => {
  it('mengunggah ke bucket sampul lalu menghapus file lama', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    let panggil = 0;
    const c = {
      storage: { from: (b: string) => { expect(b).toBe('perpus-sampul'); return { upload, remove }; } },
      from: () => rantai(panggil++ === 0
        ? { data: { sampulPath: 'b1/lama.webp' }, error: null }
        : { data: { id: 'b1', sampulPath: 'b1/baru.webp' }, error: null }),
    } as never;
    const hasil = await unggahSampulBuku(c, 'b1', Buffer.from('x'));
    expect(hasil.id).toBe('b1');
    expect(upload.mock.calls[0][0]).toMatch(/^b1\/\d+\.webp$/);
    expect(upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/webp' });
    expect(remove).toHaveBeenCalledWith(['b1/lama.webp']);
  });
});

describe('kosongkanPerpus', () => {
  it('kosongkanPerpus memberi pesan jelas bila buku masih punya riwayat pinjaman', async () => {
    const c = { from: () => ({ delete: () => ({ neq: async () => ({ error: { code: '23503', message: 'fk' } }) }) }) } as never;
    await expect(kosongkanPerpus(c)).rejects.toThrow('Masih ada riwayat pinjaman');
  });
});
