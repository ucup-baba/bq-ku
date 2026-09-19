# Task 1 Brief: Inisialisasi Project Next.js, Tailwind, & Pengujian

## Requirements
1. Inisialisasi file proyek Next.js (App Router, TypeScript, React 19/18).
2. Setup dependensi utama di `package.json`:
   - `next`, `react`, `react-dom`
   - `@phosphor-icons/react`
   - `better-sqlite3` (atau sqlite3 / Prisma)
   - `clsx`, `tailwind-merge`
   - Dev: `typescript`, `@types/react`, `@types/node`, `@types/better-sqlite3`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`
3. Konfigurasi `tailwind.config.ts`:
   - Setup palet warna organik Islami Baitul Qowwam (Deep Forest `#14302C`, Emerald Teal `#2C8F87`, Soft Sage `#E5EFC1`, Warm Cream `#F6F8F3`, Citron Lime `#84CC16`, Dusty Coral `#FB7185`).
   - Font family: `font-sans` ('Plus Jakarta Sans', sans-serif), `font-handwriting` ('Caveat', cursive).
   - Dark mode: `'class'`.
4. Konfigurasi `postcss.config.mjs` dan `tsconfig.json`.
5. Konfigurasi `vitest.config.ts`.
6. Setup test harness di `tests/setup.test.ts` dan pastikan `npm test` atau `npx vitest run tests/setup.test.ts` berhasil PASS.
7. Jalankan commit git setelah selesai.
