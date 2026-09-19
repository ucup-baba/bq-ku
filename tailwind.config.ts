import type { Config } from 'tailwindcss'

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
        'lime-citron': '#84CC16',
        'dusty-coral': '#FB7185',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
export default config;
