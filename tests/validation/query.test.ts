import { describe, it, expect } from 'vitest';
import { isTanggalIso, parseLimit } from '@/lib/validation/query';

describe('isTanggalIso', () => {
  it('valid untuk format YYYY-MM-DD yang benar', () => {
    expect(isTanggalIso('2026-09-21')).toBe(true);
  });
  it('tidak valid untuk tanggal/bulan di luar jangkauan kalender', () => {
    expect(isTanggalIso('2026-13-45')).toBe(false);
  });
  it('tidak valid untuk format bukan tanggal', () => {
    expect(isTanggalIso('abc')).toBe(false);
  });
});

describe('parseLimit', () => {
  it("parseLimit('10') = 10", () => {
    expect(parseLimit('10')).toBe(10);
  });
  it("parseLimit('0') = undefined", () => {
    expect(parseLimit('0')).toBeUndefined();
  });
  it("parseLimit('501') = undefined", () => {
    expect(parseLimit('501')).toBeUndefined();
  });
  it("parseLimit('-1') = undefined", () => {
    expect(parseLimit('-1')).toBeUndefined();
  });
  it("parseLimit('x') = undefined", () => {
    expect(parseLimit('x')).toBeUndefined();
  });
  it('parseLimit(null) = undefined', () => {
    expect(parseLimit(null)).toBeUndefined();
  });
});
