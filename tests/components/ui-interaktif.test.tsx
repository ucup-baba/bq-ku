import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TitikCarousel } from '@/components/ui/Carousel';
import { SNAP_PANEL } from '@/components/ui/LembarBawah';
import { AngkaNaik } from '@/components/ui/AngkaNaik';
import { formatAngka } from '@/lib/ui/format-angka';

describe('TitikCarousel', () => {
  it('satu tombol per slide, berlabel, yang aktif ditandai aria-current', () => {
    const h = renderToStaticMarkup(<TitikCarousel jumlah={3} aktif={1} onPilih={vi.fn()} />);
    expect(h.match(/<button/g)).toHaveLength(3);
    expect(h).toContain('aria-label="Slide 1 dari 3"');
    expect(h).toMatch(/aria-label="Slide 2 dari 3" aria-current="true"/);
  });
  it('tidak dirender bila hanya satu slide', () => {
    expect(renderToStaticMarkup(<TitikCarousel jumlah={1} aktif={0} onPilih={vi.fn()} />)).toBe('');
  });
});

describe('SNAP_PANEL', () => {
  it('naik berurutan dan berakhir penuh', () => {
    expect([...SNAP_PANEL]).toEqual([0.28, 0.6, 1]);
  });
});

describe('formatAngka', () => {
  it('rupiah dan angka biasa memakai pemisah ribuan titik', () => {
    expect(formatAngka(2500000, 'rupiah')).toBe('Rp 2.500.000');
    expect(formatAngka(1200, 'angka')).toBe('1.200');
  });
});

describe('AngkaNaik', () => {
  it('SSR menampilkan nilai akhir & menyediakan teks untuk pembaca layar', () => {
    const h = renderToStaticMarkup(<AngkaNaik nilai={240000} format="rupiah" />);
    expect(h).toContain('sr-only');
    expect(h.match(/Rp 240\.000/g)?.length).toBe(2);
  });
});
