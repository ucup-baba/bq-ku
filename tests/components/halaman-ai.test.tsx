import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { HalamanAi, persenPakai, warnaBar } from '@/components/ai/HalamanAi';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

const ringkasan = { pindaiHariIni: 23, gagalHariIni: 1, biayaBulanIni: 12400, tokenBulanIni: 350000, cadanganBulanIni: 3, terakhir: [
  { idPermintaan: 'r', waktu: '2026-09-29T03:00:00Z', penggunaId: 'u', fitur: 'ocr_tunggal' as const, peran: 'cadangan' as const, penyedia: 'gemini' as const,
    model: 'gemini-flash-lite-latest', tokenMasuk: 3000, tokenKeluar: 200, biayaRp: null, berhasil: true, galat: null, namaPengguna: 'Ucup' },
] };
const data = { setelan: { ...SETELAN_AI_BAWAAN, harga: { 'gpt-5.4-mini': { masukPerJuta: 1000, keluarPerJuta: 4000 } } }, kunci: { openai: true, gemini: false }, ringkasan };

describe('HalamanAi', () => {
  const h = renderToStaticMarkup(<HalamanAi awal={data} />);
  it('kartu pemakaian hari ini & bulan ini', () => {
    expect(h).toContain('23 / 200');
    expect(h).toMatch(/Rp\s?12\.400/);
    expect(h).toContain('cadangan dipakai 3×');
  });
  it('status kunci per penyedia', () => {
    expect(h).toContain('Kunci terpasang');
    expect(h).toContain('Kunci belum dipasang di Vercel');
  });
  it('pilihan model & opsi tanpa cadangan', () => {
    expect(h).toContain('value="openai|gpt-5.4-mini"');
    expect(h).toContain('Tanpa cadangan');
  });
  it('riwayat menandai cadangan', () => {
    expect(h).toContain('Ucup');
    expect(h).toContain('cadangan');
  });
  it('kembali ke Akun', () => {
    expect(h).toContain('href="/akun"');
  });
});

describe('bar pemakaian', () => {
  it('persen dibatasi 0–100 & warna mengikuti ambang', () => {
    expect(persenPakai(250, 200)).toBe(100);
    expect(persenPakai(0, 0)).toBe(100);
    expect(warnaBar(50)).toContain('emerald');
    expect(warnaBar(80)).toContain('orange');
    expect(warnaBar(100)).toContain('rose');
  });
});
