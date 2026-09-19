# Administrasi Berkas Santri & Digital CV Profiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web fullstack (Next.js, Tailwind CSS, SQLite, Phosphor Icons) untuk administrasi berkas santri (KK, Akta, KTP Ortu, SKL, KIP/KRM) dengan Smart OCR auto-fill dan tampilan profil santri bergaya CV Poster Kreatif (Ikhwan/Akhwat, SMP/SMA/SMK/Alumni, Light/Dark Mode, Mobile Bottom Nav).

**Architecture:** Next.js App Router dengan SQLite sebagai basis data lokal terpadu. Arsitektur modular memisahkan layer ekstraksi OCR (regex parser Bahasa Indonesia), layer penyimpanan file & berkas, layer repository database santri, serta antarmuka visual berbasis komponen Tailwind + Phosphor Duotone + Doodle SVG Stickers.

**Tech Stack:** Next.js 14/15 (React 18/19, TypeScript), Tailwind CSS, SQLite (`better-sqlite3` / Prisma), `@phosphor-icons/react`, Tesseract.js (Client/Server OCR parser), Vitest untuk pengujian unit.

**Spec:** [`docs/superpowers/specs/2026-09-19-administrasi-berkas-santri-design.md`](file:///c:/Users/ucupb/OneDrive/Documents/Project%20MSI/BQ-qu/docs/superpowers/specs/2026-09-19-administrasi-berkas-santri-design.md)

## Global Constraints

- Wajib menyediakan dukungan penuh Dark Mode dan Light Mode yang nyaman dibaca (kontras warna lolos WCAG AA).
- Aksen warna Ikhwan: Emerald Teal + Citron/Lime; Aksen warna Akhwat: Soft Teal + Dusty Rose/Coral Clay.
- Tipografi: Font utama Plus Jakarta Sans dan font aksen handwriting (Caveat) untuk stiker dan catatan.
- Ikonografi: Phosphor Icons (`@phosphor-icons/react`) dengan style duotone/bold dan ornamen SVG Doodle buatan sendiri.
- Tanpa field 'kamar'; wajib memuat field 'kelas' dan 'sekolahSekarang'.
- Berkas wajib: KK, Akta, KTP Ortu, SKL; Berkas pendukung: KIP/PIP, KRM/PKH/SKTM, Sertifikat Prestasi.
- Seluruh form input harus 100% editable manual meskipun telah diisi oleh OCR.

## Review Focus

1. Gambar scan miring/buram: Parser OCR harus tetap mengembalikan data parsial dengan aman tanpa membuat server/aplikasi crash.
2. NIK/No KK invalid (< 16 digit atau berisi karakter acak): Validasi memberikan peringatan ramah tanpa memblokir input jika dokumen memiliki catatan khusus.
3. Ukuran file upload besar: Sistem kompresi gambar sisi browser otomatis sebelum dikirim ke database/storage.
4. Switch tema Ikhwan/Akhwat dan Dark/Light: Teks dan badge kontras tidak boleh hilang atau menjadi tidak terbaca saat tema bertukar.
5. Tampilan mobile: Floating bottom navigation bar tidak boleh menutupi tombol simpan form atau konten bawah.

---

### Task 1: Inisialisasi Project Next.js, Tailwind, & Pengujian

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- Test: `tests/setup.test.ts`

**Interfaces:**
- Produces: Lingkungan Next.js siap pakai dengan script build, test, dan run dev.

- [ ] **Step 1: Write failing setup test**
```typescript
// tests/setup.test.ts
import { describe, it, expect } from 'vitest';

describe('Project Environment Setup', () => {
  it('should have environment ready for tests', () => {
    const isConfigured = true;
    expect(isConfigured).toBe(true);
  });
});
```

- [ ] **Step 2: Scaffold Next.js project with Tailwind CSS & dependencies**
Install:
```bash
npm install next react react-dom @phosphor-icons/react better-sqlite3 clsx tailwind-merge
npm install -D typescript @types/react @types/node @types/better-sqlite3 tailwindcss postcss autoprefixer vitest
```

- [ ] **Step 3: Setup Tailwind theme configuration with organic Islamic palette & fonts**
Definisikan palet warna Baitul Qowwam (Teal, Sage, Forest, Citron, Dusty Rose) dan font Plus Jakarta Sans + Caveat di `tailwind.config.ts`.

- [ ] **Step 4: Run test to verify passes**
Run: `npx vitest run tests/setup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add .
git commit -m "chore: scaffold next.js fullstack project with tailwind and vitest"
```

---

### Task 2: Database Schema & Santri Repository (SQLite)

**Files:**
- Create: `lib/db/schema.sql`, `lib/db/index.ts`, `lib/db/santri-repo.ts`
- Test: `tests/db/santri-repo.test.ts`

**Interfaces:**
- Produces:
  - `createSantri(data: SantriInput): Santri`
  - `getSantriById(id: string): Santri | null`
  - `listSantri(filters?: SantriFilter): Santri[]`
  - `updateSantri(id: string, data: Partial<SantriInput>): Santri`
  - `deleteSantri(id: string): boolean`
  - `saveDocument(data: DocumentInput): SantriDocument`

- [ ] **Step 1: Write failing tests for Santri Repository CRUD**
Uji operasi pembuatan santri baru dengan field identitas, sekolah sekarang, kelas, status berkas, dan filter gender/jenjang.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/db/santri-repo.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement SQLite database connection & Santri repository**
Buat inisialisasi tabel `santri`, `documents`, dan `users` dengan foreign keys dan indexes di `lib/db/index.ts` dan fungsi query di `lib/db/santri-repo.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/db/santri-repo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add lib/db/ tests/db/
git commit -m "feat: implement sqlite schema and santri repository layer"
```

---

### Task 3: OCR Extraction Engine & Indonesian Document Regex Parser

**Files:**
- Create: `lib/ocr/parser.ts`, `lib/ocr/engine.ts`
- Test: `tests/ocr/parser.test.ts`

**Interfaces:**
- Produces:
  - `parseOcrText(rawText: string, docType: DocumentCategory): ExtractedSantriData`
  - `cleanOcrString(input: string): string`

- [ ] **Step 1: Write failing test for Indonesian document regex heuristics**
Uji sampel teks OCR KTP, KK, SKL, dan Akta (ekstraksi NIK 16 digit, No KK, Nama Lengkap, Tempat Tanggal Lahir, Nama Orang Tua).

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/ocr/parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement regex parsing heuristics for Indonesian identity cards & documents**
Tangani variasi pembacaan umum OCR seperti huruf `O`/`D` dibaca `0`, pemisahan tanggal lahir, dan ekstraksi nama wali.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/ocr/parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add lib/ocr/ tests/ocr/
git commit -m "feat: implement ocr document regex parser for indonesian certificates"
```

---

### Task 4: UI Design Tokens, Dark/Light Theme & SVG Doodle Stickers

**Files:**
- Create: `components/theme/ThemeProvider.tsx`, `components/theme/ThemeToggle.tsx`, `components/ui/DoodleStickers.tsx`
- Test: `tests/ui/theme.test.ts`

**Interfaces:**
- Produces:
  - `<ThemeProvider>` (mendukung light/dark mode & tema Ikhwan/Akhwat)
  - `<ThemeToggle />` (switch mode terang/gelap instan)
  - `<DoodleArrow>`, `<DoodleSparkle>`, `<DoodleBadgeTape>`, `<DoodleSpeechBubble>`

- [ ] **Step 1: Write failing test for theme token resolution**
- [ ] **Step 2: Implement ThemeProvider dengan local storage persistence**
- [ ] **Step 3: Implement handcrafted SVG Doodle Stickers ala poster referensi**
- [ ] **Step 4: Verify test passes and visual tokens look crisp**
- [ ] **Step 5: Commit**
```bash
git add components/theme/ components/ui/ tests/ui/
git commit -m "feat: add theme provider with dark-light mode and svg doodle stickers"
```

---

### Task 5: Upload Berkas & Smart OCR Form Component

**Files:**
- Create: `components/forms/DocumentUploadBox.tsx`, `components/forms/SantriForm.tsx`, `app/api/ocr/route.ts`, `app/api/upload/route.ts`
- Test: `tests/components/SantriForm.test.ts`

**Interfaces:**
- Produces:
  - Area drag-and-drop berkas wajib (KK, Akta, KTP, SKL) dan berkas pendukung (KIP, KRM, SKTM).
  - Indikator badge visual: `Diisi Otomatis oleh OCR` (bisa diedit dan dihapus kapan saja).
  - Upload pas foto formal & foto profil santai dengan preview langsung.

- [ ] **Step 1: Write failing component test**
- [ ] **Step 2: Implement API routes untuk penyimpanan file upload & proses OCR**
- [ ] **Step 3: Implement UI Form dengan auto-fill, feedback status, dan validasi**
- [ ] **Step 4: Test end-to-end form input dan auto-fill**
- [ ] **Step 5: Commit**
```bash
git add app/api/ components/forms/ tests/components/
git commit -m "feat: build smart ocr document upload and editable santri form"
```

---

### Task 6: Direktori Santri, Segmentasi Ikhwan/Akhwat & Filter Jenjang

**Files:**
- Create: `components/directory/SantriDirectory.tsx`, `components/directory/SantriCard.tsx`, `components/directory/FilterBar.tsx`
- Test: `tests/components/Directory.test.ts`

**Interfaces:**
- Produces:
  - Tab switch: **Ikhwan** (Aksen Lime/Forest) vs **Akhwat** (Aksen Coral/Rose Clay).
  - Segmentasi: **SMP**, **SMA/SMK**, **Alumni**.
  - Pencarian instan berdasarkan nama atau NIK.
  - Kartu ringkasan santri dengan indikator kelengkapan berkas (misal: "3/4 Berkas Wajib, KIP Terdata").

- [ ] **Step 1: Write failing tests for filter and segment logic**
- [ ] **Step 2: Implement responsive filter bar and directory grid**
- [ ] **Step 3: Implement SantriCard with status checklist chips**
- [ ] **Step 4: Verify search and filter transitions**
- [ ] **Step 5: Commit**
```bash
git add components/directory/ tests/components/
git commit -m "feat: add santri directory with gender themes and level segmentation"
```

---

### Task 7: Digital CV / Poster Santri (Inspirasi Gambar 2 & Claymorphism)

**Files:**
- Create: `components/profile/SantriPosterCv.tsx`, `components/profile/ExportModal.tsx`, `app/santri/[id]/page.tsx`
- Test: `tests/components/PosterCv.test.ts`

**Interfaces:**
- Produces:
  - Kartu profil CV digital ala poster kreatif Haesak:
    - Judul tipografi tebal nama santri + badge stiker handwriting.
    - Foto profil pose santai dengan cut-out container dinamis.
    - Blok About Me, Pendidikan & Sekolah Sekarang, Capaian Tahfidz & Keahlian.
    - Checklist berkas terverifikasi.
  - Tombol cetak / export PDF/Image untuk arsip panitia atau kenang-kenangan santri.

- [ ] **Step 1: Write failing test for CV card data presentation**
- [ ] **Step 2: Implement Claymorphism card styles & responsive poster layout**
- [ ] **Step 3: Implement export/print trigger**
- [ ] **Step 4: Verify visual layout against reference aesthetics**
- [ ] **Step 5: Commit**
```bash
git add components/profile/ app/santri/ tests/components/
git commit -m "feat: create creative poster-style digital cv component"
```

---

### Task 8: Shell Navigasi Desktop & Mobile Bottom Nav Bar

**Files:**
- Create: `components/layout/AppShell.tsx`, `components/layout/MobileBottomNav.tsx`, `components/layout/DesktopSidebar.tsx`, `app/layout.tsx`, `app/page.tsx`
- Test: `tests/layout/navigation.test.ts`

**Interfaces:**
- Produces:
  - Sidebar collapsible di desktop dengan navigasi: Beranda, Input Berkas Baru, Direktori Santri, Statistik Berkas.
  - Floating Bottom Nav Bar di mobile dengan ikon Phosphor duotone yang nyaman dijangkau jempol.

- [ ] **Step 1: Write layout responsive test**
- [ ] **Step 2: Build desktop sidebar & mobile bottom navigation**
- [ ] **Step 3: Connect pages with active route indicators**
- [ ] **Step 4: Test layout transitions on mobile & desktop viewports**
- [ ] **Step 5: Commit**
```bash
git add components/layout/ app/ tests/layout/
git commit -m "feat: implement responsive app shell with mobile bottom navbar"
```

---

### Task 9: Persiapan Role & Hak Akses Admin (Tahap 2 Ready)

**Files:**
- Create: `lib/auth/roles.ts`, `components/auth/RoleBadge.tsx`, `components/auth/DemoRoleSwitcher.tsx`
- Test: `tests/auth/roles.test.ts`

**Interfaces:**
- Produces:
  - Pengecekan otorisasi: `canEditSantri(role)`, `canDeleteSantri(role)`, `canVerifyDocs(role)`.
  - Demo switcher peran di pojok navigasi (Superadmin, Panitia, Viewer) agar panitia dapat mensimulasikan hak akses sebelum login penuh diaktifkan.

- [ ] **Step 1: Write failing test for role permission matrix**
- [ ] **Step 2: Implement role definition and permission helpers**
- [ ] **Step 3: Implement DemoRoleSwitcher for user testing**
- [ ] **Step 4: Verify role restrictions**
- [ ] **Step 5: Commit**
```bash
git add lib/auth/ components/auth/ tests/auth/
git commit -m "feat: prepare role-based access control architecture for phase 2"
```

---

### Task 10: Integrasi End-to-End, Seeding Data Awal, & Validasi Kualitas

**Files:**
- Create: `lib/db/seed.ts`
- Modify: `README.md`
- Test: `tests/e2e/integration.test.ts`

**Interfaces:**
- Produces:
  - Seeding data santri percontohan (santri Ikhwan & Akhwat, jenjang SMP, SMA, SMK, dan Alumni lengkap dengan berkas dan foto).
  - Verifikasi seluruh alur: Upload $\rightarrow$ OCR $\rightarrow$ Edit $\rightarrow$ Simpan $\rightarrow$ Tampil di Direktori $\rightarrow$ Preview Poster CV.

- [ ] **Step 1: Create seed script with realistic sample santri data**
- [ ] **Step 2: Run integration test for full user journey**
- [ ] **Step 3: Run project build (`npm run build`) and test suite**
- [ ] **Step 4: Verify zero hydration errors and clean console**
- [ ] **Step 5: Commit**
```bash
git add lib/db/seed.ts README.md tests/e2e/
git commit -m "test: add realistic sample seed data and verify end-to-end user journey"
```
