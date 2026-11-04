import { describe, it, expect } from 'vitest';
import { JUMLAH_MOTIF, KELUARGA, desainSampul, judulPanel } from '@/lib/perpus/sampul-motif';
import { kontras } from '@/lib/perpus/warna';

describe('desainSampul', () => {
  it('sama untuk judul yang sama', () => {
    expect(desainSampul('Rasa', '899.221')).toEqual(desainSampul('Rasa', '899.221'));
  });
  it('buku segenre punya banyak ragam', () => {
    const judul = Array.from({ length: 30 }, (_, i) => `Pemrograman ${i}`);
    const ragam = new Set(judul.map(j => { const d = desainSampul(j, '004'); return `${d.latar}-${d.motif}`; }));
    expect(ragam.size).toBeGreaterThanOrEqual(10);
  });
  it('judul mirip tidak mengumpul di satu warna', () => {
    const judul = ['Ayahku Bukan pembohong', 'Negeri Para Bedebah', 'Negeri di Ujung Tanduk', 'Pulang', 'Pergi', 'Pulang Pergi', 'Bumi', 'Bulan', 'Matahari', 'Bintang'];
    expect(new Set(judul.map(j => desainSampul(j, '813').latar)).size).toBeGreaterThanOrEqual(3);
  });
  it('motif selalu dalam rentang', () => {
    for (const j of ['a', 'Bumi', 'Atomic Habits', '']) {
      const { motif } = desainSampul(j, '158');
      expect(motif).toBeGreaterThanOrEqual(0);
      expect(motif).toBeLessThan(JUMLAH_MOTIF);
    }
  });
});

describe('KELUARGA', () => {
  const semua = Object.values(KELUARGA).flat();
  it.each(semua.map(w => [w.latar, w.teks] as const))('%s dengan teks %s terbaca', (latar, teks) => {
    expect(kontras(latar, teks)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('judulPanel', () => {
  it('membuang awalan penerbit', () => {
    expect(judulPanel('Penerbit Andi - Mudah Menjadi Programmer')).toBe('Mudah Menjadi Programmer');
  });
  it('judul biasa tetap', () => {
    expect(judulPanel('Atomic Habits')).toBe('Atomic Habits');
    expect(judulPanel('Buku - ')).toBe('Buku -');
  });
});
