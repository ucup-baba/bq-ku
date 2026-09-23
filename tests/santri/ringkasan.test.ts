import { describe, it, expect } from 'vitest';
import { statusBerkas, ringkasanSantri, perluDilengkapi } from '@/lib/santri/ringkasan';

const lengkap = ['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH'].map(k => ({ kategori: k, statusVerifikasi: 'VERIFIED' }));

describe('statusBerkas', () => {
  it('tanpa dokumen → 0/4, semua kurang', () => {
    expect(statusBerkas(undefined)).toEqual({ ada: 0, total: 4, kurang: ['KK', 'Akta', 'KTP Ortu', 'SKL'], perluPerbaikan: [], lengkap: false });
  });
  it('lengkap terverifikasi', () => {
    expect(statusBerkas(lengkap).lengkap).toBe(true);
  });
  it('PENDING dihitung ada, REJECTED dihitung kurang', () => {
    const s = statusBerkas([{ kategori: 'KARTU_KELUARGA', statusVerifikasi: 'PENDING' }, { kategori: 'AKTA_KELAHIRAN', statusVerifikasi: 'REJECTED' }]);
    expect(s.ada).toBe(1);
    expect(s.kurang).toEqual(['Akta', 'KTP Ortu', 'SKL']);
  });
  it('NEED_FIX → perlu perbaikan dan belum lengkap', () => {
    const s = statusBerkas(lengkap.map(d => (d.kategori === 'SKL_IJAZAH' ? { ...d, statusVerifikasi: 'NEED_FIX' } : d)));
    expect(s.ada).toBe(4);
    expect(s.perluPerbaikan).toEqual(['SKL']);
    expect(s.lengkap).toBe(false);
  });
});

describe('ringkasanSantri & perluDilengkapi', () => {
  const list = [
    { id: '1', jenisKelamin: 'IKHWAN', jenjang: 'SMP', documents: lengkap },
    { id: '2', jenisKelamin: 'AKHWAT', jenjang: 'SMA', documents: [] },
    { id: '3', jenisKelamin: 'IKHWAN', jenjang: 'SMK' },
    { id: '4', jenisKelamin: 'AKHWAT', jenjang: 'ALUMNI' },
  ];
  it('menghitung per gender & jenjang (SMA+SMK digabung)', () => {
    expect(ringkasanSantri(list)).toEqual({ total: 4, ikhwan: 2, akhwat: 2, smp: 1, smaSmk: 2, alumni: 1, berkasLengkap: 1 });
  });
  it('perlu dilengkapi mempertahankan urutan & batas maksimum', () => {
    expect(perluDilengkapi(list).map(s => s.id)).toEqual(['2', '3', '4']);
    expect(perluDilengkapi(list, 2).map(s => s.id)).toEqual(['2', '3']);
  });
});
