import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import config from '../../tailwind.config';

const css = readFileSync('app/globals.css', 'utf8');
const TOKEN = ['bg', 'surface', 'garis', 'tinta', 'redup', 'hijau', 'biru', 'jingga'];

describe('token desain', () => {
  it('setiap token didefinisikan untuk tema terang dan gelap', () => {
    const terang = css.slice(css.indexOf(':root'), css.indexOf('.dark'));
    const gelap = css.slice(css.indexOf('.dark'));
    for (const t of TOKEN) {
      expect(terang).toContain(`--bq-${t}:`);
      expect(gelap).toContain(`--bq-${t}:`);
    }
  });
  it('Tailwind memetakan warna bq ke CSS variable', () => {
    const warna = (config.theme?.extend?.colors as Record<string, Record<string, string>>).bq;
    for (const t of TOKEN) expect(warna[t]).toBe(`rgb(var(--bq-${t}) / <alpha-value>)`);
  });
  it('ada penonaktifan animasi untuk prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
