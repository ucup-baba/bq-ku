/**
 * Karakter yang bisa ditafsirkan sebagai awal rumus oleh Excel/Sheets bila
 * berada di posisi pertama sebuah sel (CSV injection / formula injection).
 */
const AWAL_RUMUS = /^[=+\-@]/;

/**
 * Mengubah baris data menjadi teks CSV. Header diambil dari kunci baris
 * pertama. Nilai string yang diawali karakter rumus (=, +, -, @) dibubuhi
 * apostrof di depan agar tidak dieksekusi sebagai formula saat dibuka di
 * spreadsheet. Nilai yang mengandung koma, kutip, atau baris baru dikutip.
 */
export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const kolom = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const aman = typeof v === 'string' && AWAL_RUMUS.test(v) ? `'${v}` : v;
    const s = String(aman);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [kolom.join(','), ...rows.map(r => kolom.map(k => escape(r[k] ?? '')).join(','))].join('\n');
}
