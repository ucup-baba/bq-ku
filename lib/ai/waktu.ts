/** WIB = UTC+7 tanpa musim panas. Batas hari/bulan pemakaian AI dihitung menurut WIB. */
const GESER_MS = 7 * 3600_000;
const HARI_MS = 24 * 3600_000;

export function awalHariWib(sekarang: Date): Date {
  return new Date(Math.floor((sekarang.getTime() + GESER_MS) / HARI_MS) * HARI_MS - GESER_MS);
}

export function awalBulanWib(sekarang: Date): Date {
  const wib = new Date(sekarang.getTime() + GESER_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - GESER_MS);
}
