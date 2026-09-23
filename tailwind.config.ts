import type { Config } from 'tailwindcss'

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
  plugins: [],
}
export default config;
