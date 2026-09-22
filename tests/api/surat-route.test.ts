import { describe, it, expect, vi, beforeEach } from 'vitest';

const createDonasi = vi.fn();
const createSurat = vi.fn();
const peekNomorUrut = vi.fn();
const nextNomorUrut = vi.fn();
const bumpNomorUrut = vi.fn();
const listSurat = vi.fn();

vi.mock('@/lib/db/donatur-repo', () => {
  class NomorSuratDipakaiError extends Error {
    constructor(public nomor: string) { super('Nomor surat sudah dipakai'); this.name = 'NomorSuratDipakaiError'; }
  }
  return {
    createDonasi: (...args: any[]) => createDonasi(...args),
    createSurat: (...args: any[]) => createSurat(...args),
    peekNomorUrut: (...args: any[]) => peekNomorUrut(...args),
    nextNomorUrut: (...args: any[]) => nextNomorUrut(...args),
    bumpNomorUrut: (...args: any[]) => bumpNomorUrut(...args),
    listSurat: (...args: any[]) => listSurat(...args),
    NomorSuratDipakaiError,
  };
});

const eqDelete = vi.fn().mockResolvedValue({ error: null });
const deleteFn = vi.fn(() => ({ eq: eqDelete }));
const fromFn = vi.fn(() => ({ delete: deleteFn }));

const fakeUser = { id: 'user-1', email: 'a@b.c', nama: 'A', roles: ['ADMIN_DONATUR'] };
const fakeSupabase = { from: fromFn };

vi.mock('@/lib/auth/session', () => ({
  requireRoom: vi.fn(async () => ({ user: fakeUser, supabase: fakeSupabase })),
  authErrorResponse: () => null,
}));

import { POST } from '@/app/api/donatur/surat/route';
import { NomorSuratDipakaiError } from '@/lib/db/donatur-repo';

function makeReq(body: any) {
  return { json: async () => body } as any;
}

const donasiInput = {
  donaturId: 'donatur-1',
  tanggal: '2026-09-01',
  jenis: 'INFAQ',
  bentuk: 'UANG',
  nominal: 100000,
};

beforeEach(() => {
  createDonasi.mockReset();
  createSurat.mockReset();
  peekNomorUrut.mockReset();
  nextNomorUrut.mockReset();
  bumpNomorUrut.mockReset();
  listSurat.mockReset();
  fromFn.mockClear();
  deleteFn.mockClear();
  eqDelete.mockClear();
});

describe('POST /api/donatur/surat', () => {
  it('body valid dengan donasi baru -> 201, createDonasi lalu createSurat dipanggil, bumpNomorUrut dengan tahun/bulan/urut hasil parse', async () => {
    const donasiRow = { id: 'donasi-1' };
    const suratRow = { id: 'surat-1', donasiId: 'donasi-1', nomorSurat: '5/PBQ/IX/2026', tanggalSurat: '2026-09-01' };
    createDonasi.mockResolvedValue(donasiRow);
    createSurat.mockResolvedValue(suratRow);

    const res = await POST(makeReq({
      donasi: donasiInput,
      nomorSurat: '5/PBQ/IX/2026',
      tanggalSurat: '2026-09-01',
    }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ success: true, data: suratRow });
    expect(createDonasi).toHaveBeenCalledWith(fakeSupabase, donasiInput, fakeUser.id);
    expect(createSurat).toHaveBeenCalledWith(
      fakeSupabase,
      { donasiId: 'donasi-1', nomorSurat: '5/PBQ/IX/2026', tanggalSurat: '2026-09-01' },
      fakeUser.id,
    );
    expect(bumpNomorUrut).toHaveBeenCalledWith(fakeSupabase, 2026, 9, 5);
  });

  it('createSurat melempar NomorSuratDipakaiError -> 409 dengan nomorUsulan dari peekNomorUrut, nextNomorUrut tidak dipanggil, donasi baru dihapus', async () => {
    const donasiRow = { id: 'donasi-2' };
    createDonasi.mockResolvedValue(donasiRow);
    createSurat.mockRejectedValue(new NomorSuratDipakaiError('5/PBQ/IX/2026'));
    peekNomorUrut.mockResolvedValue(7);

    const res = await POST(makeReq({
      donasi: donasiInput,
      nomorSurat: '5/PBQ/IX/2026',
      tanggalSurat: '2026-09-01',
    }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.nomorUsulan).toBe('7/PBQ/IX/2026');
    expect(peekNomorUrut).toHaveBeenCalledWith(fakeSupabase, 2026, 9);
    expect(nextNomorUrut).not.toHaveBeenCalled();
    expect(bumpNomorUrut).not.toHaveBeenCalled();
    expect(fromFn).toHaveBeenCalledWith('donasi');
    expect(eqDelete).toHaveBeenCalledWith('id', 'donasi-2');
  });

  it('body tanpa donasi maupun donasiId -> 400', async () => {
    const res = await POST(makeReq({
      nomorSurat: '5/PBQ/IX/2026',
      tanggalSurat: '2026-09-01',
    }));
    expect(res.status).toBe(400);
    expect(createDonasi).not.toHaveBeenCalled();
    expect(createSurat).not.toHaveBeenCalled();
  });
});
