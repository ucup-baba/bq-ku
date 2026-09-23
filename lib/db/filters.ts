// Karakter `,` `(` `)` `"` `\` dan backtick punya arti sintaksis pada grammar
// filter PostgREST (mis. `.or()`): koma memisahkan klausa, kurung membuka/menutup
// grup, dan kutip/backslash mengubah cara nilai di-parse. Bila nilai pencarian
// pengguna diinterpolasi mentah ke string filter, karakter-karakter ini bisa
// menambah klausa OR di luar maksud pencarian atau membuat PostgREST
// mengembalikan error mentah akibat kurung tidak seimbang. Fungsi ini
// membuang karakter tersebut sebelum nilai dipakai di dalam filter string.
export function escapeOrFilterValue(value: string): string {
  return value
    .replace(/[,()"\\`]/g, '')
    .trim()
    .slice(0, 80)
    .trim();
}
