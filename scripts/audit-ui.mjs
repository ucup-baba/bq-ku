/**
 * Audit UI Tahap 1. Cara pakai di browser (lebar 390px): salin isi file ini tanpa kata
 * `export`, lalu jalankan `auditHalaman(document, window)`.
 * - Elemen di dalam [data-audit-daftar] (daftar data) dikecualikan dari cek tautan ganda.
 * - Elemen di dalam [data-audit-abaikan] (mis. tiruan kertas surat) dikecualikan dari cek teks.
 */
export function auditHalaman(doc, win, opsi = {}) {
  const terlihat = opsi.terlihat ?? ((el) => {
    if (el.getClientRects().length === 0) return false;
    const gaya = win.getComputedStyle(el);
    return gaya.visibility !== 'hidden' && gaya.opacity !== '0';
  });
  const lebarHp = opsi.lebarHp ?? win.innerWidth < 768;
  const diAbaikan = (el) => Boolean(el.closest('[data-audit-abaikan]'));
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);

  const hitung = new Map();
  for (const a of doc.querySelectorAll('a[href]')) {
    if (!terlihat(a) || a.closest('[data-audit-daftar]')) continue;
    const u = new URL(a.getAttribute('href'), win.location.href);
    const kunci = u.pathname + u.search;
    hitung.set(kunci, (hitung.get(kunci) ?? 0) + 1);
  }
  const tautanGanda = [...hitung].filter(([, n]) => n > 1).map(([h, n]) => `${h} ×${n}`);

  const ikonPlusGanda = [...doc.querySelectorAll('a, button')]
    .filter((el) => terlihat(el) && el.querySelector('svg') && /^\+/.test((el.textContent || '').trim()))
    .map(label);

  const teksKecil = [];
  if (lebarHp) {
    for (const el of doc.body.querySelectorAll('*')) {
      if (diAbaikan(el) || !terlihat(el)) continue;
      const punyaTeks = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
      if (!punyaTeks) continue;
      const ukuran = parseFloat(win.getComputedStyle(el).fontSize);
      if (ukuran < 12) teksKecil.push(`${ukuran}px: ${label(el)}`);
    }
  }

  const teksTerpotong = [];
  for (const el of doc.body.querySelectorAll('*')) {
    if (diAbaikan(el) || !terlihat(el)) continue;
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const gaya = win.getComputedStyle(el);
    if (gaya.overflowX === 'hidden' && gaya.whiteSpace === 'nowrap' && gaya.textOverflow !== 'ellipsis') teksTerpotong.push(label(el));
  }

  const tinggiLayar = Math.round((doc.documentElement.scrollHeight / win.innerHeight) * 10) / 10;
  return { tinggiLayar, tautanGanda, ikonPlusGanda, teksKecil, teksTerpotong };
}
