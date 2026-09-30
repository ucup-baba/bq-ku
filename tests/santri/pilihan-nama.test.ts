import { describe, it, expect } from 'vitest';
import { kumpulkanNama, namaBawaan, milikOrtu } from '@/lib/santri/pilihan-nama';

const h = (kategori: string, namaLengkap?: string) => ({ kategori, extracted: namaLengkap ? { namaLengkap } : null });

describe('kumpulkanNama', () => {
  const hasil = [
    h('AKTA_KELAHIRAN', 'ABDUL AZIZ AL-FARUQ'),
    h('KTP_ORTU', 'NGADIYANTO'),
    h('KARTU_KELUARGA', 'Abdul Aziz Al-fariq'),
    h('SKL_IJAZAH', 'Abdul Aziz Al-faruq'),
  ];
  it('nama sama (beda huruf besar/kecil) digabung dengan label sumbernya; KTP orang tua tidak ikut', () => {
    expect(kumpulkanNama(hasil)).toEqual([
      { nama: 'Abdul Aziz Al-faruq', sumber: ['AKTA_KELAHIRAN', 'SKL_IJAZAH'], dariFormulir: false },
      { nama: 'Abdul Aziz Al-fariq', sumber: ['KARTU_KELUARGA'], dariFormulir: false },
    ]);
  });
  it('nama di formulir yang berbeda ditambahkan sebagai pilihan tersendiri', () => {
    const p = kumpulkanNama(hasil, 'Abdul Azis');
    expect(p.at(-1)).toEqual({ nama: 'Abdul Azis', sumber: [], dariFormulir: true });
  });
  it('nama di formulir yang sama ditandai pada pilihan yang ada, tidak digandakan', () => {
    const p = kumpulkanNama(hasil, 'abdul aziz al faruq');
    expect(p).toHaveLength(2);
    expect(p[0].dariFormulir).toBe(true);
  });
  it('berkas gagal / tanpa nama diabaikan', () => {
    expect(kumpulkanNama([h('KIP_PIP'), { kategori: 'SKTM', extracted: null }])).toEqual([]);
  });
});

describe('namaBawaan', () => {
  it('utamakan Akta', () => {
    const p = kumpulkanNama([h('KARTU_KELUARGA', 'Budi Santoso'), h('SKL_IJAZAH', 'Budi Santoso'), h('AKTA_KELAHIRAN', 'Budi Santosa')]);
    expect(namaBawaan(p)).toBe('Budi Santosa');
  });
  it('tanpa Akta: nama yang paling banyak muncul', () => {
    const p = kumpulkanNama([h('KARTU_KELUARGA', 'Budi Santosa'), h('SKL_IJAZAH', 'Budi Santoso'), h('KIP_PIP', 'Budi Santoso')]);
    expect(namaBawaan(p)).toBe('Budi Santoso');
  });
  it('tanpa pilihan → string kosong', () => {
    expect(namaBawaan([])).toBe('');
  });
});

describe('milikOrtu', () => {
  it('KTP orang tua milik orang tua, berkas lain milik santri', () => {
    expect(milikOrtu('KTP_ORTU')).toBe(true);
    expect(milikOrtu('KARTU_KELUARGA')).toBe(false);
  });
});
