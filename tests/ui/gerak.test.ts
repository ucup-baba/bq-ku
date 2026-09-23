import { describe, it, expect } from 'vitest';
import { gerakDikurangi } from '@/lib/ui/gerak';

const jendela = (matches: boolean) => ({ matchMedia: () => ({ matches }) }) as unknown as Pick<Window, 'matchMedia'>;

describe('gerakDikurangi', () => {
  it('true bila tidak ada window (server)', () => {
    expect(gerakDikurangi(undefined)).toBe(true);
  });
  it('mengikuti prefers-reduced-motion', () => {
    expect(gerakDikurangi(jendela(true))).toBe(true);
    expect(gerakDikurangi(jendela(false))).toBe(false);
  });
});
