import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

/** Warna token desain dari CSS variable (lihat app/globals.css), mendukung modifier opasitas. */
const token = (nama: string) => `rgb(var(--bq-${nama}) / <alpha-value>)`;

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /** Token poster CV (lihat .poster-kertas di app/globals.css). */
        poster: Object.fromEntries(['latar', 'tinta', 'tinta2', 'redup', 'judul', 'hijau', 'hijau-tua', 'sekolah', 'kartu', 'polaroid', 'pisah', 'chip', 'chip-teks', 'stabilo', 'stabilo-teks', 'bayang', 'b1-bg', 'b1-garis', 'b2-bg', 'b2-garis', 'b2-ikon', 'b2-judul', 'b3-bg', 'b3-garis', 'b3-ikon', 'b3-judul', 'b4-bg', 'b4-garis', 'b4-ikon', 'b4-judul', 'aksen', 'aksen-lembut'].map((n) => [n, `var(--pk-${n})`])),
        'deep-forest': '#14302C',
        'emerald-teal': '#2C8F87',
        'soft-sage': '#E5EFC1',
        'warm-cream': '#F6F8F3',
        'citron-lime': '#84CC16',
        'dusty-coral': '#FB7185',
        bq: {
          bg: token('bg'),
          surface: token('surface'),
          garis: token('garis'),
          tinta: token('tinta'),
          redup: token('redup'),
          hijau: token('hijau'),
          biru: token('biru'),
          jingga: token('jingga'),
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      },
      borderRadius: {
        kartu: '22px',
      },
      boxShadow: {
        kartu: '0 10px 24px -12px rgb(0 0 0 / 0.18)',
        angkat: '0 18px 36px -16px rgb(0 0 0 / 0.28)',
      },
    },
  },
  plugins: [
    /** `poster-lebar:` — container query pada .poster-wadah (lebar poster, bukan layar). */
    plugin(({ addVariant }) => { addVariant('poster-lebar', '@container poster (min-width: 600px)'); }),
  ],
}
export default config;
