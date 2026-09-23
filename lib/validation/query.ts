const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validasi format tanggal YYYY-MM-DD dan bahwa tanggalnya valid secara kalender.
 * Date.parse saja tidak cukup: '2026-02-30' diterima dan digeser ke 2 Maret,
 * jadi hasil parse (UTC) harus menghasilkan tahun/bulan/hari yang sama persis.
 */
export function isTanggalIso(value: string): boolean {
  if (!TANGGAL_RE.test(value)) return false;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  return new Date(t).toISOString().slice(0, 10) === value;
}

/** Parse query `limit`: hanya dipakai bila integer 1..500, selain itu diabaikan (undefined). */
export function parseLimit(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : undefined;
}
