import { describe, it, expect } from 'vitest';
import { petakanTerbatas } from '@/lib/ocr/konkurensi';

const tunda = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('petakanTerbatas', () => {
  it('mempertahankan urutan hasil meski selesai tidak berurutan', async () => {
    const hasil = await petakanTerbatas([30, 5, 20, 1], 4, async (ms, i) => { await tunda(ms); return i; });
    expect(hasil).toEqual([0, 1, 2, 3]);
  });
  it('tidak pernah melebihi batas tugas bersamaan', async () => {
    let jalan = 0; let puncak = 0;
    await petakanTerbatas(Array.from({ length: 10 }), 3, async () => { jalan++; puncak = Math.max(puncak, jalan); await tunda(5); jalan--; });
    expect(puncak).toBe(3);
  });
  it('berjalan paralel: total ≈ tugas terlama, bukan jumlahnya', async () => {
    const t = Date.now();
    await petakanTerbatas([50, 50, 50, 50], 4, tunda);
    expect(Date.now() - t).toBeLessThan(150);
  });
  it('daftar kosong', async () => {
    expect(await petakanTerbatas([], 4, async () => 1)).toEqual([]);
  });
});
