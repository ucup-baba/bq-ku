/**
 * true bila pengguna meminta gerak dikurangi (prefers-reduced-motion),
 * atau bila tidak ada window (server) — animasi JS dilewati dengan aman.
 */
export function gerakDikurangi(
  win: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  if (!win || typeof win.matchMedia !== 'function') return true;
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
