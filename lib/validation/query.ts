const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validasi format tanggal YYYY-MM-DD dan bahwa tanggalnya valid secara kalender. */
export function isTanggalIso(value: string): boolean {
  return TANGGAL_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Parse query `limit`: hanya dipakai bila integer 1..500, selain itu diabaikan (undefined). */
export function parseLimit(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : undefined;
}
