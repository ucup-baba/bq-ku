# AI & OCR (OpenAI + Gemini) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OCR berkas santri memakai penyedia AI utama + cadangan (OpenAI/Gemini) yang dipilih SUPERADMIN, dengan catatan pemakaian, batas harian, dan plafon Rp bulanan.

**Architecture:** Modul baru `lib/ai/` (tanpa library baru): daftar model & validasi, adaptor `fetch` per penyedia, penghitung biaya & batas, penyimpan setelan (`pengaturan.kunci='ai'`) & catatan (`pemakaian_ai`), serta satu fungsi pusat `bacaDokumenAi()`. Dua fungsi OCR yang ada (`lib/ocr/gemini.ts`, `lib/ocr/gemini-batch.ts`) memanggilnya menggantikan loop Gemini. Halaman `/ai` (SUPERADMIN) dibuka dari Akun.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), zod 4, vitest, Tailwind, @phosphor-icons/react.

**Spec:** `docs/superpowers/specs/2026-09-29-ai-openai-gemini-design.md`

## Global Constraints

- Kunci API hanya dari env: `OPENAI_API_KEY`, `GEMINI_API_KEY`. Tidak pernah disimpan di DB / dikirim ke browser.
- Setelan bawaan: utama `{ penyedia: 'openai', model: 'gpt-5.4-mini' }`, cadangan `{ penyedia: 'gemini', model: 'gemini-flash-lite-latest' }`, `batasHarian: 200`, `plafonBulananRp: 50000`, `harga: {}`.
- Model yang boleh dipilih — OpenAI: `gpt-5.4-mini`, `gpt-4.1-mini`, `gpt-5.4`, `gpt-4.1`; Gemini: `gemini-flash-lite-latest`, `gemini-3.1-flash-lite`, `gemini-flash-latest`.
- Hari = WIB (UTC+7), bulan = sejak tanggal 1 WIB. Satu pindai = satu `idPermintaan` (utama & cadangan berbagi id). Satu halaman PDF massal = satu pindai.
- Batas per panggilan 60 dtk dan tidak melebihi sisa anggaran waktu; cadangan hanya bila sisa ≥ 5 dtk.
- Batas tercapai → `AiBatasError` (kode `BATAS_AI`), pesan: "Batas pemakaian AI tercapai — isi data secara manual." Unggah berkas tetap tersimpan.
- Gagal mencatat pemakaian tidak boleh menggagalkan pindai.
- Migrasi dijalankan manual oleh pengguna di SQL Editor Supabase.
- Salin gaya kode sekitar: nama berbahasa Indonesia, komentar singkat, `requireUser`/`authErrorResponse` di rute.
- Commit diakhiri baris: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

**Penyesuaian kecil terhadap spec** (diputuskan saat menyusun rencana, sudah dicerminkan di bawah):
1. Kolom tambahan `peran` (`'utama' | 'cadangan'`) di `pemakaian_ai` untuk menghitung "cadangan dipakai N×".
2. Nilai `fitur` tambahan `'ocr_mandiri'` untuk unggah mandiri wali (`/api/upload-mandiri`, tanpa pengguna).

---

## File Structure

```
supabase/migrations/0012_pemakaian_ai.sql     tabel pemakaian_ai + baris pengaturan 'ai'
lib/ai/model.ts                               penyedia, daftar model, tipe & skema Setelan, bawaan
lib/ai/waktu.ts                               awalHariWib / awalBulanWib
lib/ai/biaya.ts                               hitungBiaya
lib/ai/batas.ts                               cekBatas, AiBatasError, PESAN_BATAS_AI
lib/ai/penyedia/tipe.ts                       BerkasAi, HasilPanggil
lib/ai/penyedia/gemini.ts                     panggilGemini
lib/ai/penyedia/openai.ts                     panggilOpenai
lib/ai/setelan.ts                             bacaSetelanAi, simpanSetelanAi, statusKunci
lib/ai/pemakaian.ts                           ringkasPemakaian (murni), ambilRingkasanPemakaian, catatPemakaian
lib/ai/baca.ts                                bacaDokumenAi (fungsi pusat)
lib/ocr/gemini.ts, lib/ocr/gemini-batch.ts    memanggil bacaDokumenAi
lib/ocr/engine.ts                             meneruskan konteks, tidak menelan AiBatasError
app/api/ocr/route.ts, app/api/ocr/batch/route.ts, app/api/upload-mandiri/route.ts
app/api/ai/route.ts                           GET/PUT setelan + ringkasan (SUPERADMIN)
app/(santri)/ai/page.tsx                      halaman AI & OCR
components/ai/HalamanAi.tsx                   isi halaman (klien)
components/akun/BarisAi.tsx                   baris di halaman Akun
components/akun/HalamanAkun.tsx               menyisipkan BarisAi
tests/ai/*.test.ts, tests/api/ai-route.test.ts, tests/components/halaman-ai.test.tsx
```

---

### Task 1: Migrasi & model/setelan dasar

**Files:**
- Create: `supabase/migrations/0012_pemakaian_ai.sql`
- Create: `lib/ai/model.ts`
- Test: `tests/ai/model.test.ts`

**Interfaces:**
- Produces: `type Penyedia = 'openai' | 'gemini'`; `type PilihanModel = { penyedia: Penyedia; model: string }`; `type HargaModel = { masukPerJuta: number; keluarPerJuta: number }`; `type SetelanAi = { utama: PilihanModel; cadangan: PilihanModel | null; batasHarian: number; plafonBulananRp: number; harga: Record<string, HargaModel> }`; `MODEL_AI: Record<Penyedia, { id: string; label: string; dukungTemperature: boolean }[]>`; `SETELAN_AI_BAWAAN: SetelanAi`; `skemaSetelanAi` (zod); `infoModel(p: PilihanModel)`; `LABEL_PENYEDIA: Record<Penyedia, string>`.

- [ ] **Step 1: Tulis migrasi**

```sql
-- 0012: AI & OCR — setelan penyedia (pengaturan.kunci='ai') + catatan pemakaian.
insert into public.pengaturan (kunci, nilai) values ('ai', '{
  "utama": {"penyedia": "openai", "model": "gpt-5.4-mini"},
  "cadangan": {"penyedia": "gemini", "model": "gemini-flash-lite-latest"},
  "batasHarian": 200,
  "plafonBulananRp": 50000,
  "harga": {}
}'::jsonb) on conflict (kunci) do nothing;

create table if not exists public.pemakaian_ai (
  id uuid primary key default gen_random_uuid(),
  "idPermintaan" uuid not null,
  waktu timestamptz not null default now(),
  "penggunaId" uuid references public.profiles(id) on delete set null,
  fitur text not null check (fitur in ('ocr_tunggal', 'ocr_massal', 'ocr_mandiri')),
  peran text not null check (peran in ('utama', 'cadangan')),
  penyedia text not null check (penyedia in ('openai', 'gemini')),
  model text not null,
  "tokenMasuk" int not null default 0,
  "tokenKeluar" int not null default 0,
  "biayaRp" numeric(12,2),
  berhasil boolean not null,
  galat text
);
create index if not exists pemakaian_ai_waktu_idx on public.pemakaian_ai (waktu desc);

-- Ditulis server dengan kunci admin; dibaca Superadmin saja.
alter table public.pemakaian_ai enable row level security;
drop policy if exists "pemakaian_ai: baca" on public.pemakaian_ai;
create policy "pemakaian_ai: baca" on public.pemakaian_ai for select to authenticated
  using (public.has_role('SUPERADMIN'));
```

- [ ] **Step 2: Tulis tes gagal** `tests/ai/model.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { skemaSetelanAi, SETELAN_AI_BAWAAN, infoModel, MODEL_AI } from '@/lib/ai/model';

describe('skemaSetelanAi', () => {
  it('menerima setelan bawaan', () => {
    expect(skemaSetelanAi.safeParse(SETELAN_AI_BAWAAN).success).toBe(true);
  });
  it('menerima tanpa cadangan', () => {
    expect(skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, cadangan: null }).success).toBe(true);
  });
  it('menolak model di luar daftar penyedianya', () => {
    const s = { ...SETELAN_AI_BAWAAN, utama: { penyedia: 'openai', model: 'gemini-flash-latest' } };
    expect(skemaSetelanAi.safeParse(s).success).toBe(false);
  });
  it('menolak angka negatif', () => {
    expect(skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, batasHarian: -1 }).success).toBe(false);
    expect(skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, harga: { 'gpt-5.4-mini': { masukPerJuta: -5, keluarPerJuta: 0 } } }).success).toBe(false);
  });
});

describe('infoModel', () => {
  it('model GPT-5 tidak menerima temperature, GPT-4.1 & Gemini menerima', () => {
    expect(infoModel({ penyedia: 'openai', model: 'gpt-5.4-mini' })?.dukungTemperature).toBe(false);
    expect(infoModel({ penyedia: 'openai', model: 'gpt-4.1-mini' })?.dukungTemperature).toBe(true);
    expect(MODEL_AI.gemini.every(m => m.dukungTemperature)).toBe(true);
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ai/model.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ai/model'`

- [ ] **Step 4: Implementasi** `lib/ai/model.ts`

```ts
import { z } from 'zod';

export type Penyedia = 'openai' | 'gemini';
export type PilihanModel = { penyedia: Penyedia; model: string };
export type HargaModel = { masukPerJuta: number; keluarPerJuta: number };
export type SetelanAi = {
  utama: PilihanModel;
  cadangan: PilihanModel | null;
  batasHarian: number;
  plafonBulananRp: number;
  /** Rp per 1 juta token, per id model; diisi Superadmin dari halaman harga resmi. */
  harga: Record<string, HargaModel>;
};

export const LABEL_PENYEDIA: Record<Penyedia, string> = { openai: 'OpenAI', gemini: 'Gemini' };

/** Model yang boleh dipilih. GPT-5.x adalah model bernalar: tidak menerima `temperature`. */
export const MODEL_AI: Record<Penyedia, { id: string; label: string; dukungTemperature: boolean }[]> = {
  openai: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', dukungTemperature: false },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', dukungTemperature: true },
    { id: 'gpt-5.4', label: 'GPT-5.4', dukungTemperature: false },
    { id: 'gpt-4.1', label: 'GPT-4.1', dukungTemperature: true },
  ],
  gemini: [
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite', dukungTemperature: true },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', dukungTemperature: true },
    { id: 'gemini-flash-latest', label: 'Gemini Flash', dukungTemperature: true },
  ],
};

export const SETELAN_AI_BAWAAN: SetelanAi = {
  utama: { penyedia: 'openai', model: 'gpt-5.4-mini' },
  cadangan: { penyedia: 'gemini', model: 'gemini-flash-lite-latest' },
  batasHarian: 200,
  plafonBulananRp: 50000,
  harga: {},
};

export function infoModel(p: PilihanModel) {
  return MODEL_AI[p.penyedia]?.find(m => m.id === p.model) ?? null;
}

const skemaPilihan = z.object({ penyedia: z.enum(['openai', 'gemini']), model: z.string() })
  .refine(p => infoModel(p) !== null, { message: 'Model tidak dikenal untuk penyedia ini', path: ['model'] });

export const skemaSetelanAi = z.object({
  utama: skemaPilihan,
  cadangan: skemaPilihan.nullable(),
  batasHarian: z.number().int().min(0).max(100_000),
  plafonBulananRp: z.number().min(0).max(100_000_000),
  harga: z.record(z.string(), z.object({ masukPerJuta: z.number().min(0), keluarPerJuta: z.number().min(0) })),
});
```

- [ ] **Step 5: Jalankan, pastikan lolos**

Run: `npx vitest run tests/ai/model.test.ts`
Expected: PASS (5 tes)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0012_pemakaian_ai.sql lib/ai/model.ts tests/ai/model.test.ts
git commit -m "feat(ai): migrasi pemakaian_ai + daftar model & skema setelan"
```

---

### Task 2: Waktu WIB, biaya & batas

**Files:**
- Create: `lib/ai/waktu.ts`, `lib/ai/biaya.ts`, `lib/ai/batas.ts`
- Test: `tests/ai/batas.test.ts`

**Interfaces:**
- Consumes: `SetelanAi`, `HargaModel` (Task 1).
- Produces: `awalHariWib(sekarang: Date): Date`; `awalBulanWib(sekarang: Date): Date`; `hitungBiaya(tokenMasuk: number, tokenKeluar: number, harga?: HargaModel): number | null`; `hargaTerisi(harga?: HargaModel): boolean`; `cekBatas(p: { pindaiHariIni: number; biayaBulanIni: number }, s: SetelanAi): { boleh: true } | { boleh: false; alasan: 'harian' | 'bulanan' }`; `class AiBatasError extends Error { kode: 'BATAS_AI'; alasan }`; `PESAN_BATAS_AI: string`.

- [ ] **Step 1: Tulis tes gagal** `tests/ai/batas.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { awalHariWib, awalBulanWib } from '@/lib/ai/waktu';
import { hitungBiaya, hargaTerisi } from '@/lib/ai/biaya';
import { cekBatas, AiBatasError, PESAN_BATAS_AI } from '@/lib/ai/batas';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

describe('waktu WIB', () => {
  it('pukul 23.30 UTC tanggal 29 sudah tanggal 30 di WIB', () => {
    expect(awalHariWib(new Date('2026-09-29T23:30:00Z')).toISOString()).toBe('2026-09-29T17:00:00.000Z');
  });
  it('pukul 16.59 UTC masih hari yang sama di WIB', () => {
    expect(awalHariWib(new Date('2026-09-29T16:59:00Z')).toISOString()).toBe('2026-09-28T17:00:00.000Z');
  });
  it('awal bulan WIB', () => {
    expect(awalBulanWib(new Date('2026-09-30T18:00:00Z')).toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(awalBulanWib(new Date('2026-09-15T05:00:00Z')).toISOString()).toBe('2026-08-31T17:00:00.000Z');
  });
});

describe('hitungBiaya', () => {
  const harga = { masukPerJuta: 2000, keluarPerJuta: 8000 };
  it('token × harga per juta', () => {
    expect(hitungBiaya(1_000_000, 500_000, harga)).toBe(6000);
  });
  it('harga belum diisi → null', () => {
    expect(hitungBiaya(1000, 1000, undefined)).toBeNull();
    expect(hitungBiaya(1000, 1000, { masukPerJuta: 0, keluarPerJuta: 0 })).toBeNull();
    expect(hargaTerisi({ masukPerJuta: 0, keluarPerJuta: 0 })).toBe(false);
  });
});

describe('cekBatas', () => {
  const s = { ...SETELAN_AI_BAWAAN, batasHarian: 10, plafonBulananRp: 1000, harga: { 'gpt-5.4-mini': { masukPerJuta: 1, keluarPerJuta: 1 } } };
  it('di bawah batas → boleh', () => {
    expect(cekBatas({ pindaiHariIni: 9, biayaBulanIni: 999 }, s)).toEqual({ boleh: true });
  });
  it('batas harian tercapai', () => {
    expect(cekBatas({ pindaiHariIni: 10, biayaBulanIni: 0 }, s)).toEqual({ boleh: false, alasan: 'harian' });
  });
  it('plafon bulanan tercapai', () => {
    expect(cekBatas({ pindaiHariIni: 0, biayaBulanIni: 1000 }, s)).toEqual({ boleh: false, alasan: 'bulanan' });
  });
  it('plafon Rp tidak aktif bila harga model utama belum diisi', () => {
    expect(cekBatas({ pindaiHariIni: 0, biayaBulanIni: 99_999 }, { ...s, harga: {} })).toEqual({ boleh: true });
  });
  it('AiBatasError membawa kode & pesan baku', () => {
    const e = new AiBatasError('harian');
    expect(e.kode).toBe('BATAS_AI');
    expect(e.message).toBe(PESAN_BATAS_AI);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ai/batas.test.ts`
Expected: FAIL — modul tidak ditemukan

- [ ] **Step 3: Implementasi**

`lib/ai/waktu.ts`:
```ts
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
```

`lib/ai/biaya.ts`:
```ts
import type { HargaModel } from './model';

export function hargaTerisi(harga?: HargaModel): boolean {
  return !!harga && (harga.masukPerJuta > 0 || harga.keluarPerJuta > 0);
}

/** Perkiraan biaya (Rp) dari token × harga per 1 juta token; null bila harga belum diisi. */
export function hitungBiaya(tokenMasuk: number, tokenKeluar: number, harga?: HargaModel): number | null {
  if (!harga || !hargaTerisi(harga)) return null;
  return Math.round(((tokenMasuk * harga.masukPerJuta + tokenKeluar * harga.keluarPerJuta) / 1_000_000) * 100) / 100;
}
```

`lib/ai/batas.ts`:
```ts
import type { SetelanAi } from './model';
import { hargaTerisi } from './biaya';

export const PESAN_BATAS_AI = 'Batas pemakaian AI tercapai — isi data secara manual.';

export class AiBatasError extends Error {
  readonly kode = 'BATAS_AI' as const;
  constructor(readonly alasan: 'harian' | 'bulanan') { super(PESAN_BATAS_AI); this.name = 'AiBatasError'; }
}

/** Batas lunak: pindai serentak bisa sedikit melewatinya (tanpa penguncian). Plafon Rp aktif hanya bila harga model utama terisi. */
export function cekBatas(p: { pindaiHariIni: number; biayaBulanIni: number }, s: SetelanAi):
  { boleh: true } | { boleh: false; alasan: 'harian' | 'bulanan' } {
  if (p.pindaiHariIni >= s.batasHarian) return { boleh: false, alasan: 'harian' };
  if (hargaTerisi(s.harga[s.utama.model]) && p.biayaBulanIni >= s.plafonBulananRp) return { boleh: false, alasan: 'bulanan' };
  return { boleh: true };
}
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run tests/ai/batas.test.ts`
Expected: PASS (10 tes)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/waktu.ts lib/ai/biaya.ts lib/ai/batas.ts tests/ai/batas.test.ts
git commit -m "feat(ai): hitung biaya, batas harian/bulanan menurut WIB"
```

---

### Task 3: Adaptor penyedia (Gemini & OpenAI)

**Files:**
- Create: `lib/ai/penyedia/tipe.ts`, `lib/ai/penyedia/gemini.ts`, `lib/ai/penyedia/openai.ts`
- Test: `tests/ai/penyedia.test.ts`

**Interfaces:**
- Consumes: `infoModel` (Task 1).
- Produces: `type BerkasAi = { base64: string; mimeType: string }`; `type HasilPanggil = { teks: string; tokenMasuk: number; tokenKeluar: number }`; `panggilGemini(model: string, prompt: string, berkas: BerkasAi, batasMs: number): Promise<HasilPanggil>`; `panggilOpenai(...)` sama. Keduanya melempar `Error` bila kunci tak ada, HTTP bukan 2xx, atau teks kosong.

- [ ] **Step 1: Tulis tes gagal** `tests/ai/penyedia.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { panggilGemini } from '@/lib/ai/penyedia/gemini';
import { panggilOpenai } from '@/lib/ai/penyedia/openai';

const berkasGambar = { base64: 'QUJD', mimeType: 'image/jpeg' };
const berkasPdf = { base64: 'JVBE', mimeType: 'application/pdf' };
const jawab = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => { process.env.GEMINI_API_KEY = 'g-kunci'; process.env.OPENAI_API_KEY = 'o-kunci'; });
afterEach(() => { vi.unstubAllGlobals(); });

describe('panggilGemini', () => {
  it('mengirim gambar + temperature 0 dan membaca teks & token', async () => {
    const f = jawab({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }], usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 80 } });
    vi.stubGlobal('fetch', f);
    const h = await panggilGemini('gemini-flash-lite-latest', 'baca JSON', berkasGambar, 10_000);
    expect(h).toEqual({ teks: '{"a":1}', tokenMasuk: 1200, tokenKeluar: 80 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('models/gemini-flash-lite-latest:generateContent?key=g-kunci');
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' });
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', temperature: 0 });
  });
  it('HTTP 503 → melempar galat berisi status', async () => {
    vi.stubGlobal('fetch', jawab({ error: { message: 'high demand' } }, 503));
    await expect(panggilGemini('gemini-flash-lite-latest', 'p', berkasGambar, 10_000)).rejects.toThrow(/503/);
  });
  it('tanpa kunci → melempar', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(panggilGemini('gemini-flash-lite-latest', 'p', berkasGambar, 10_000)).rejects.toThrow(/GEMINI_API_KEY/);
  });
});

describe('panggilOpenai', () => {
  it('gambar → input_image; GPT-5 tanpa temperature; membaca output_text & usage', async () => {
    const f = jawab({ output_text: '{"b":2}', usage: { input_tokens: 900, output_tokens: 40 } });
    vi.stubGlobal('fetch', f);
    const h = await panggilOpenai('gpt-5.4-mini', 'baca JSON', berkasGambar, 10_000);
    expect(h).toEqual({ teks: '{"b":2}', tokenMasuk: 900, tokenKeluar: 40 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer o-kunci');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('gpt-5.4-mini');
    expect(body.input[0].content[1]).toEqual({ type: 'input_image', image_url: 'data:image/jpeg;base64,QUJD', detail: 'high' });
    expect(body.text).toEqual({ format: { type: 'json_object' } });
    expect(body.temperature).toBeUndefined();
  });
  it('PDF → input_file; GPT-4.1 memakai temperature 0', async () => {
    const f = jawab({ output: [{ content: [{ type: 'output_text', text: '{}' }] }], usage: { input_tokens: 1, output_tokens: 1 } });
    vi.stubGlobal('fetch', f);
    await panggilOpenai('gpt-4.1-mini', 'p JSON', berkasPdf, 10_000);
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.input[0].content[1]).toEqual({ type: 'input_file', filename: 'berkas.pdf', file_data: 'data:application/pdf;base64,JVBE' });
    expect(body.temperature).toBe(0);
  });
  it('HTTP 429 → melempar', async () => {
    vi.stubGlobal('fetch', jawab({ error: { message: 'quota' } }, 429));
    await expect(panggilOpenai('gpt-5.4-mini', 'p', berkasGambar, 10_000)).rejects.toThrow(/429/);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ai/penyedia.test.ts`
Expected: FAIL — modul tidak ditemukan

- [ ] **Step 3: Implementasi**

`lib/ai/penyedia/tipe.ts`:
```ts
export type BerkasAi = { base64: string; mimeType: string };
export type HasilPanggil = { teks: string; tokenMasuk: number; tokenKeluar: number };

/** Potong isi galat HTTP agar log & catatan pemakaian tetap ringkas. */
export async function galatHttp(nama: string, res: Response): Promise<Error> {
  const isi = await res.text().catch(() => '');
  return new Error(`${nama} HTTP ${res.status}: ${isi.slice(0, 160)}`);
}
```

`lib/ai/penyedia/gemini.ts`:
```ts
import { galatHttp, type BerkasAi, type HasilPanggil } from './tipe';

export async function panggilGemini(model: string, prompt: string, berkas: BerkasAi, batasMs: number): Promise<HasilPanggil> {
  const kunci = process.env.GEMINI_API_KEY;
  if (!kunci) throw new Error('GEMINI_API_KEY belum dipasang');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${kunci}`, {
    method: 'POST',
    signal: AbortSignal.timeout(batasMs),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: berkas.mimeType, data: berkas.base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
  if (!res.ok) throw await galatHttp('Gemini', res);
  const d = await res.json();
  const teks = (d.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  if (!teks) throw new Error('Gemini: jawaban kosong');
  return { teks, tokenMasuk: d.usageMetadata?.promptTokenCount ?? 0, tokenKeluar: d.usageMetadata?.candidatesTokenCount ?? 0 };
}
```

`lib/ai/penyedia/openai.ts`:
```ts
import { infoModel } from '../model';
import { galatHttp, type BerkasAi, type HasilPanggil } from './tipe';

/** Responses API: gambar sebagai input_image, PDF sebagai input_file. Prompt wajib memuat kata "JSON" (json_object). */
export async function panggilOpenai(model: string, prompt: string, berkas: BerkasAi, batasMs: number): Promise<HasilPanggil> {
  const kunci = process.env.OPENAI_API_KEY;
  if (!kunci) throw new Error('OPENAI_API_KEY belum dipasang');
  const dataUrl = `data:${berkas.mimeType};base64,${berkas.base64}`;
  const lampiran = berkas.mimeType === 'application/pdf'
    ? { type: 'input_file', filename: 'berkas.pdf', file_data: dataUrl }
    : { type: 'input_image', image_url: dataUrl, detail: 'high' };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(batasMs),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kunci}` },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, lampiran] }],
      text: { format: { type: 'json_object' } },
      ...(infoModel({ penyedia: 'openai', model })?.dukungTemperature ? { temperature: 0 } : {}),
    }),
  });
  if (!res.ok) throw await galatHttp('OpenAI', res);
  const d = await res.json();
  const teks: string = d.output_text
    ?? (d.output ?? []).flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? [])
      .filter((c: { type: string }) => c.type === 'output_text').map((c: { text?: string }) => c.text ?? '').join('');
  if (!teks) throw new Error('OpenAI: jawaban kosong');
  return { teks, tokenMasuk: d.usage?.input_tokens ?? 0, tokenKeluar: d.usage?.output_tokens ?? 0 };
}
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run tests/ai/penyedia.test.ts`
Expected: PASS (6 tes)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/penyedia tests/ai/penyedia.test.ts
git commit -m "feat(ai): adaptor Gemini & OpenAI (fetch, token, temperature 0)"
```

---

### Task 4: Setelan & catatan pemakaian (DB)

**Files:**
- Create: `lib/ai/setelan.ts`, `lib/ai/pemakaian.ts`
- Test: `tests/ai/pemakaian.test.ts`

**Interfaces:**
- Consumes: `SetelanAi`, `SETELAN_AI_BAWAAN`, `skemaSetelanAi`, `Penyedia` (Task 1); `awalHariWib`, `awalBulanWib` (Task 2).
- Produces:
  - `bacaSetelanAi(): Promise<SetelanAi>` (kunci admin; tidak valid/tidak ada → bawaan)
  - `simpanSetelanAi(client: SupabaseClient, s: SetelanAi, userId: string): Promise<void>`
  - `statusKunci(): Record<Penyedia, boolean>`
  - `type FiturAi = 'ocr_tunggal' | 'ocr_massal' | 'ocr_mandiri'`
  - `type BarisPemakaian = { idPermintaan: string; waktu: string; penggunaId: string | null; fitur: FiturAi; peran: 'utama' | 'cadangan'; penyedia: Penyedia; model: string; tokenMasuk: number; tokenKeluar: number; biayaRp: number | null; berhasil: boolean; galat: string | null }`
  - `type RiwayatAi = BarisPemakaian & { namaPengguna: string | null }`
  - `type RingkasanPemakaian = { pindaiHariIni: number; gagalHariIni: number; biayaBulanIni: number; tokenBulanIni: number; cadanganBulanIni: number; terakhir: RiwayatAi[] }`
  - `ringkasPemakaian(baris: RiwayatAi[], sekarang: Date): RingkasanPemakaian` (murni; `baris` = semua baris sejak awal bulan WIB, terbaru dulu)
  - `ambilRingkasanPemakaian(sekarang?: Date): Promise<RingkasanPemakaian>`
  - `catatPemakaian(b: BarisPemakaian): Promise<void>` (tidak pernah melempar)

- [ ] **Step 1: Tulis tes gagal** `tests/ai/pemakaian.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { ringkasPemakaian, type RiwayatAi } from '@/lib/ai/pemakaian';

const b = (p: Partial<RiwayatAi>): RiwayatAi => ({
  idPermintaan: 'r1', waktu: '2026-09-29T03:00:00Z', penggunaId: 'u1', fitur: 'ocr_tunggal', peran: 'utama',
  penyedia: 'openai', model: 'gpt-5.4-mini', tokenMasuk: 1000, tokenKeluar: 100, biayaRp: 10, berhasil: true, galat: null,
  namaPengguna: 'Ucup', ...p,
});
const sekarang = new Date('2026-09-29T10:00:00Z'); // 17.00 WIB

describe('ringkasPemakaian', () => {
  it('pindai = idPermintaan berbeda hari ini; percobaan cadangan tidak dihitung dua kali', () => {
    const r = ringkasPemakaian([
      b({ idPermintaan: 'r2', peran: 'cadangan', penyedia: 'gemini', model: 'gemini-flash-lite-latest', biayaRp: 2 }),
      b({ idPermintaan: 'r2', berhasil: false, galat: '503', biayaRp: null, tokenMasuk: 0, tokenKeluar: 0 }),
      b({ idPermintaan: 'r1' }),
      b({ idPermintaan: 'r0', waktu: '2026-09-28T10:00:00Z' }), // kemarin (WIB)
    ], sekarang);
    expect(r.pindaiHariIni).toBe(2);
    expect(r.gagalHariIni).toBe(0);
    expect(r.cadanganBulanIni).toBe(1);
    expect(r.biayaBulanIni).toBe(22);
    expect(r.tokenBulanIni).toBe(1100 * 3);
    expect(r.terakhir).toHaveLength(4);
  });
  it('pindai gagal = semua percobaannya gagal', () => {
    const r = ringkasPemakaian([
      b({ idPermintaan: 'r3', peran: 'cadangan', berhasil: false }),
      b({ idPermintaan: 'r3', berhasil: false }),
    ], sekarang);
    expect(r.pindaiHariIni).toBe(1);
    expect(r.gagalHariIni).toBe(1);
  });
  it('riwayat dibatasi 20 baris', () => {
    const banyak = Array.from({ length: 25 }, (_, i) => b({ idPermintaan: `x${i}` }));
    expect(ringkasPemakaian(banyak, sekarang).terakhir).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ai/pemakaian.test.ts`
Expected: FAIL — modul tidak ditemukan

- [ ] **Step 3: Implementasi**

`lib/ai/setelan.ts`:
```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { SETELAN_AI_BAWAAN, skemaSetelanAi, type Penyedia, type SetelanAi } from './model';

/** Dibaca dengan kunci admin: Admin Santri yang memindai tidak punya hak baca `pengaturan`. */
export async function bacaSetelanAi(): Promise<SetelanAi> {
  try {
    const { data } = await createAdminSupabase().from('pengaturan').select('nilai').eq('kunci', 'ai').maybeSingle();
    const hasil = skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, ...((data as { nilai?: object } | null)?.nilai ?? {}) });
    return hasil.success ? hasil.data : SETELAN_AI_BAWAAN;
  } catch {
    return SETELAN_AI_BAWAAN;
  }
}

/** Disimpan dengan klien ber-RLS milik Superadmin (kebijakan "pengaturan: ubah"). */
export async function simpanSetelanAi(client: SupabaseClient, s: SetelanAi, userId: string): Promise<void> {
  const { data, error } = await client.from('pengaturan')
    .update({ nilai: s, updatedAt: new Date().toISOString(), updatedBy: userId }).eq('kunci', 'ai').select('kunci');
  if (error) throw new Error(`Gagal menyimpan setelan AI: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Setelan AI belum tersedia — jalankan migrasi 0012 di Supabase.');
}

export function statusKunci(): Record<Penyedia, boolean> {
  return { openai: !!process.env.OPENAI_API_KEY, gemini: !!process.env.GEMINI_API_KEY };
}
```

`lib/ai/pemakaian.ts`:
```ts
import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { Penyedia } from './model';
import { awalBulanWib, awalHariWib } from './waktu';

export type FiturAi = 'ocr_tunggal' | 'ocr_massal' | 'ocr_mandiri';
export type BarisPemakaian = {
  idPermintaan: string; waktu: string; penggunaId: string | null; fitur: FiturAi; peran: 'utama' | 'cadangan';
  penyedia: Penyedia; model: string; tokenMasuk: number; tokenKeluar: number; biayaRp: number | null;
  berhasil: boolean; galat: string | null;
};
export type RiwayatAi = BarisPemakaian & { namaPengguna: string | null };
export type RingkasanPemakaian = {
  pindaiHariIni: number; gagalHariIni: number; biayaBulanIni: number; tokenBulanIni: number;
  cadanganBulanIni: number; terakhir: RiwayatAi[];
};

/** `baris`: semua percobaan sejak awal bulan WIB, terbaru dulu. */
export function ringkasPemakaian(baris: RiwayatAi[], sekarang: Date): RingkasanPemakaian {
  const awalHari = awalHariWib(sekarang).getTime();
  const hariIni = new Map<string, boolean>(); // idPermintaan → ada percobaan berhasil
  for (const x of baris) {
    if (Date.parse(x.waktu) < awalHari) continue;
    hariIni.set(x.idPermintaan, (hariIni.get(x.idPermintaan) ?? false) || x.berhasil);
  }
  return {
    pindaiHariIni: hariIni.size,
    gagalHariIni: [...hariIni.values()].filter(ok => !ok).length,
    biayaBulanIni: Math.round(baris.reduce((t, x) => t + (x.biayaRp ?? 0), 0) * 100) / 100,
    tokenBulanIni: baris.reduce((t, x) => t + x.tokenMasuk + x.tokenKeluar, 0),
    cadanganBulanIni: baris.filter(x => x.peran === 'cadangan' && x.berhasil).length,
    terakhir: baris.slice(0, 20),
  };
}

const KOLOM = '"idPermintaan", waktu, "penggunaId", fitur, peran, penyedia, model, "tokenMasuk", "tokenKeluar", "biayaRp", berhasil, galat, pengguna:profiles(nama)';

export async function ambilRingkasanPemakaian(sekarang = new Date()): Promise<RingkasanPemakaian> {
  const { data, error } = await createAdminSupabase().from('pemakaian_ai').select(KOLOM)
    .gte('waktu', awalBulanWib(sekarang).toISOString()).order('waktu', { ascending: false });
  if (error) throw new Error(`Gagal membaca pemakaian AI: ${error.message}`);
  const baris = (data ?? []).map((r: any) => ({
    ...r, biayaRp: r.biayaRp === null ? null : Number(r.biayaRp), namaPengguna: r.pengguna?.nama ?? null,
  })) as RiwayatAi[];
  return ringkasPemakaian(baris, sekarang);
}

/** Tidak pernah melempar: gagal mencatat tidak boleh menggagalkan pindai. */
export async function catatPemakaian(b: BarisPemakaian): Promise<void> {
  try {
    const { error } = await createAdminSupabase().from('pemakaian_ai').insert(b);
    if (error) console.error('Catat pemakaian AI gagal:', error.message);
  } catch (e) {
    console.error('Catat pemakaian AI gagal:', e);
  }
}
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run tests/ai/pemakaian.test.ts`
Expected: PASS (3 tes)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/setelan.ts lib/ai/pemakaian.ts tests/ai/pemakaian.test.ts
git commit -m "feat(ai): baca/simpan setelan AI & ringkasan pemakaian"
```

---

### Task 5: Fungsi pusat `bacaDokumenAi`

**Files:**
- Create: `lib/ai/baca.ts`
- Test: `tests/ai/baca.test.ts`

**Interfaces:**
- Consumes: Task 1–4.
- Produces: `type KonteksAi = { fitur: FiturAi; penggunaId: string | null }`; `bacaDokumenAi(p: { prompt: string; berkas: BerkasAi; konteks: KonteksAi; batasTotalMs?: number }): Promise<{ teks: string; penyedia: Penyedia; model: string }>` — melempar `AiBatasError` bila batas tercapai, `Error('Semua penyedia AI gagal: …')` bila semua gagal. `teks` sudah dibersihkan dari pagar ```json dan dipastikan JSON valid.

- [ ] **Step 1: Tulis tes gagal** `tests/ai/baca.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));

const setelan = vi.hoisted(() => ({ nilai: null as any }));
const catatan = vi.hoisted(() => [] as any[]);
const pemakaian = vi.hoisted(() => ({ pindaiHariIni: 0, biayaBulanIni: 0 }));
const panggil = vi.hoisted(() => ({ openai: vi.fn(), gemini: vi.fn() }));

vi.mock('@/lib/ai/setelan', () => ({ bacaSetelanAi: async () => setelan.nilai }));
vi.mock('@/lib/ai/pemakaian', () => ({
  ambilRingkasanPemakaian: async () => ({ ...pemakaian, gagalHariIni: 0, tokenBulanIni: 0, cadanganBulanIni: 0, terakhir: [] }),
  catatPemakaian: async (b: any) => { catatan.push(b); },
}));
vi.mock('@/lib/ai/penyedia/openai', () => ({ panggilOpenai: panggil.openai }));
vi.mock('@/lib/ai/penyedia/gemini', () => ({ panggilGemini: panggil.gemini }));

import { bacaDokumenAi } from '@/lib/ai/baca';
import { AiBatasError } from '@/lib/ai/batas';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

const p = { prompt: 'JSON', berkas: { base64: 'x', mimeType: 'image/png' }, konteks: { fitur: 'ocr_tunggal' as const, penggunaId: 'u1' } };

beforeEach(() => {
  setelan.nilai = { ...SETELAN_AI_BAWAAN, harga: { 'gpt-5.4-mini': { masukPerJuta: 1000, keluarPerJuta: 1000 } } };
  catatan.length = 0; pemakaian.pindaiHariIni = 0; pemakaian.biayaBulanIni = 0;
  panggil.openai.mockReset(); panggil.gemini.mockReset();
});

describe('bacaDokumenAi', () => {
  it('utama berhasil: tidak memanggil cadangan, mencatat 1 baris dengan biaya', async () => {
    panggil.openai.mockResolvedValue({ teks: '```json\n{"a":1}\n```', tokenMasuk: 1_000_000, tokenKeluar: 0 });
    const h = await bacaDokumenAi(p);
    expect(h).toEqual({ teks: '{"a":1}', penyedia: 'openai', model: 'gpt-5.4-mini' });
    expect(panggil.gemini).not.toHaveBeenCalled();
    expect(catatan).toHaveLength(1);
    expect(catatan[0]).toMatchObject({ peran: 'utama', berhasil: true, biayaRp: 1000, fitur: 'ocr_tunggal', penggunaId: 'u1' });
  });
  it('utama gagal → cadangan; keduanya dicatat dengan idPermintaan sama', async () => {
    panggil.openai.mockRejectedValue(new Error('OpenAI HTTP 429: quota'));
    panggil.gemini.mockResolvedValue({ teks: '{"b":2}', tokenMasuk: 10, tokenKeluar: 5 });
    const h = await bacaDokumenAi(p);
    expect(h.penyedia).toBe('gemini');
    expect(catatan.map(c => [c.peran, c.berhasil])).toEqual([['utama', false], ['cadangan', true]]);
    expect(catatan[0].idPermintaan).toBe(catatan[1].idPermintaan);
    expect(catatan[0].galat).toContain('429');
    expect(catatan[1].biayaRp).toBeNull(); // harga Gemini belum diisi
  });
  it('jawaban bukan JSON dianggap gagal → cadangan', async () => {
    panggil.openai.mockResolvedValue({ teks: 'maaf tidak bisa', tokenMasuk: 5, tokenKeluar: 5 });
    panggil.gemini.mockResolvedValue({ teks: '{}', tokenMasuk: 1, tokenKeluar: 1 });
    expect((await bacaDokumenAi(p)).penyedia).toBe('gemini');
    expect(catatan[0]).toMatchObject({ berhasil: false, tokenMasuk: 5 });
  });
  it('tanpa cadangan & utama gagal → melempar', async () => {
    setelan.nilai = { ...setelan.nilai, cadangan: null };
    panggil.openai.mockRejectedValue(new Error('timeout'));
    await expect(bacaDokumenAi(p)).rejects.toThrow(/Semua penyedia AI gagal/);
  });
  it('batas harian tercapai → AiBatasError, tidak memanggil AI & tidak mencatat', async () => {
    pemakaian.pindaiHariIni = 200;
    await expect(bacaDokumenAi(p)).rejects.toBeInstanceOf(AiBatasError);
    expect(panggil.openai).not.toHaveBeenCalled();
    expect(catatan).toHaveLength(0);
  });
  it('sisa waktu < 5 dtk → cadangan tidak dicoba', async () => {
    panggil.openai.mockImplementation(async () => { await new Promise(r => setTimeout(r, 30)); throw new Error('lambat'); });
    await expect(bacaDokumenAi({ ...p, batasTotalMs: 5_020 })).rejects.toThrow(/Semua penyedia AI gagal/);
    expect(panggil.gemini).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ai/baca.test.ts`
Expected: FAIL — modul `@/lib/ai/baca` tidak ditemukan

- [ ] **Step 3: Implementasi** `lib/ai/baca.ts`

```ts
import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Penyedia, PilihanModel } from './model';
import { AiBatasError, cekBatas } from './batas';
import { hitungBiaya } from './biaya';
import { bacaSetelanAi } from './setelan';
import { ambilRingkasanPemakaian, catatPemakaian, type FiturAi } from './pemakaian';
import { panggilGemini } from './penyedia/gemini';
import { panggilOpenai } from './penyedia/openai';
import type { BerkasAi, HasilPanggil } from './penyedia/tipe';

export type KonteksAi = { fitur: FiturAi; penggunaId: string | null };

const BATAS_PER_PANGGILAN_MS = 60_000;
const SISA_MIN_CADANGAN_MS = 5_000;

const PANGGIL: Record<Penyedia, (model: string, prompt: string, berkas: BerkasAi, batasMs: number) => Promise<HasilPanggil>> = {
  openai: panggilOpenai,
  gemini: panggilGemini,
};

/** Buang pagar ```json dan pastikan JSON valid; jawaban tak valid dianggap gagal (memicu cadangan). */
function jsonBersih(teks: string): string {
  const bersih = teks.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  JSON.parse(bersih);
  return bersih;
}

/**
 * Satu pindai: cek batas → penyedia utama → cadangan (bila ada & sisa waktu cukup).
 * Setiap percobaan dicatat ke pemakaian_ai dengan idPermintaan yang sama.
 */
export async function bacaDokumenAi({ prompt, berkas, konteks, batasTotalMs = BATAS_PER_PANGGILAN_MS }: {
  prompt: string; berkas: BerkasAi; konteks: KonteksAi; batasTotalMs?: number;
}): Promise<{ teks: string; penyedia: Penyedia; model: string }> {
  const setelan = await bacaSetelanAi();
  const pemakaian = await ambilRingkasanPemakaian().catch(() => ({ pindaiHariIni: 0, biayaBulanIni: 0 }));
  const cek = cekBatas(pemakaian, setelan);
  if (!cek.boleh) throw new AiBatasError(cek.alasan);

  const idPermintaan = randomUUID();
  const mulai = Date.now();
  const urutan: [PilihanModel, 'utama' | 'cadangan'][] = [[setelan.utama, 'utama']];
  if (setelan.cadangan) urutan.push([setelan.cadangan, 'cadangan']);
  const galat: string[] = [];

  for (const [pilihan, peran] of urutan) {
    const sisa = batasTotalMs - (Date.now() - mulai);
    if (peran === 'cadangan' && sisa < SISA_MIN_CADANGAN_MS) break;
    let hasil: HasilPanggil | null = null;
    try {
      hasil = await PANGGIL[pilihan.penyedia](pilihan.model, prompt, berkas, Math.min(BATAS_PER_PANGGILAN_MS, sisa));
      const teks = jsonBersih(hasil.teks);
      await catatPemakaian({
        idPermintaan, waktu: new Date().toISOString(), penggunaId: konteks.penggunaId, fitur: konteks.fitur, peran,
        penyedia: pilihan.penyedia, model: pilihan.model, tokenMasuk: hasil.tokenMasuk, tokenKeluar: hasil.tokenKeluar,
        biayaRp: hitungBiaya(hasil.tokenMasuk, hasil.tokenKeluar, setelan.harga[pilihan.model]), berhasil: true, galat: null,
      });
      return { teks, penyedia: pilihan.penyedia, model: pilihan.model };
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e);
      galat.push(`${pilihan.penyedia}/${pilihan.model}: ${pesan}`);
      console.warn(`[ai] ${peran} ${pilihan.penyedia}/${pilihan.model} gagal: ${pesan}`);
      await catatPemakaian({
        idPermintaan, waktu: new Date().toISOString(), penggunaId: konteks.penggunaId, fitur: konteks.fitur, peran,
        penyedia: pilihan.penyedia, model: pilihan.model, tokenMasuk: hasil?.tokenMasuk ?? 0, tokenKeluar: hasil?.tokenKeluar ?? 0,
        biayaRp: hasil ? hitungBiaya(hasil.tokenMasuk, hasil.tokenKeluar, setelan.harga[pilihan.model]) : null,
        berhasil: false, galat: pesan.slice(0, 300),
      });
    }
  }
  throw new Error(`Semua penyedia AI gagal: ${galat.join(' | ')}`);
}
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run tests/ai/baca.test.ts`
Expected: PASS (6 tes)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/baca.ts tests/ai/baca.test.ts
git commit -m "feat(ai): bacaDokumenAi — batas, utama → cadangan, catat pemakaian"
```

---

### Task 6: Sambungkan OCR ke `bacaDokumenAi`

**Files:**
- Modify: `lib/ocr/gemini.ts` (fungsi `processGeminiVisionOcr`)
- Modify: `lib/ocr/gemini-batch.ts` (fungsi `classifyAndExtractDocument`, `classifyMultiPagePdf`)
- Modify: `lib/ocr/engine.ts` (fungsi `processOcrImage`)
- Modify: `app/api/ocr/route.ts`, `app/api/ocr/batch/route.ts`, `app/api/upload-mandiri/route.ts`
- Modify: `components/forms/DocumentUploadBox.tsx` (fungsi `handleStartOcr`)
- Test: `tests/ai/ocr-sambung.test.ts`

**Interfaces:**
- Consumes: `bacaDokumenAi`, `KonteksAi` (Task 5); `AiBatasError` (Task 2).
- Produces (tanda tangan baru):
  - `processGeminiVisionOcr(imagePath: string, kategoriHint: string, konteks: KonteksAi)`
  - `processOcrImage(imageBufferOrUrl: string | Buffer, kategori: string, konteks: KonteksAi)`
  - `classifyAndExtractDocument(imageBuffer: Buffer, mimeType: string, konteks: KonteksAi, batasTotalMs = BATAS_PER_DOKUMEN_MS)`
  - `classifyMultiPagePdf(pdfBuffer: Buffer, konteks: KonteksAi)`
  - Ketiganya **melempar ulang** `AiBatasError` (tidak ditelan jadi `null`/`[]`).

- [ ] **Step 1: Tulis tes gagal** `tests/ai/ocr-sambung.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baca = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ai/baca', () => ({ bacaDokumenAi: baca }));

import { processGeminiVisionOcr } from '@/lib/ocr/gemini';
import { classifyAndExtractDocument } from '@/lib/ocr/gemini-batch';
import { AiBatasError } from '@/lib/ai/batas';

const konteks = { fitur: 'ocr_tunggal' as const, penggunaId: 'u1' };
const berkas = path.join(os.tmpdir(), 'uji-ocr-sambung.png');
beforeEach(() => { baca.mockReset(); fs.writeFileSync(berkas, Buffer.from('png')); });

describe('OCR memakai bacaDokumenAi', () => {
  it('pindai tunggal meneruskan prompt, berkas, konteks & mengurai hasil', async () => {
    baca.mockResolvedValue({ teks: JSON.stringify({ namaLengkap: 'CHOTIDJAH ALLAYDRUS', nik: '3310064702130002' }), penyedia: 'openai', model: 'gpt-5.4-mini' });
    const h = await processGeminiVisionOcr(berkas, 'KARTU_KELUARGA', konteks);
    expect(h?.data.nik).toBe('3310064702130002');
    const arg = baca.mock.calls[0][0];
    expect(arg.berkas).toEqual({ base64: Buffer.from('png').toString('base64'), mimeType: 'image/png' });
    expect(arg.konteks).toEqual(konteks);
    expect(arg.prompt).toContain('JSON');
  });
  it('semua penyedia gagal → null (jalur OCR lokal tetap bisa dipakai)', async () => {
    baca.mockRejectedValue(new Error('Semua penyedia AI gagal'));
    expect(await processGeminiVisionOcr(berkas, 'KARTU_KELUARGA', konteks)).toBeNull();
  });
  it('batas tercapai → AiBatasError dilempar ulang, tidak ditelan', async () => {
    baca.mockRejectedValue(new AiBatasError('harian'));
    await expect(processGeminiVisionOcr(berkas, 'KARTU_KELUARGA', konteks)).rejects.toBeInstanceOf(AiBatasError);
    await expect(classifyAndExtractDocument(Buffer.from('x'), 'image/png', { ...konteks, fitur: 'ocr_massal' })).rejects.toBeInstanceOf(AiBatasError);
  });
  it('pindai massal meneruskan anggaran waktu', async () => {
    baca.mockResolvedValue({ teks: JSON.stringify({ kategori: 'KIP_PIP', namaLengkap: 'X' }), penyedia: 'gemini', model: 'gemini-flash-lite-latest' });
    const h = await classifyAndExtractDocument(Buffer.from('x'), 'image/png', { ...konteks, fitur: 'ocr_massal' }, 40_000);
    expect(h?.kategori).toBe('KIP_PIP');
    expect(baca.mock.calls[0][0]).toMatchObject({ batasTotalMs: 40_000, konteks: { fitur: 'ocr_massal' } });
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ai/ocr-sambung.test.ts`
Expected: FAIL — `bacaDokumenAi` tidak dipanggil (kode lama memanggil Gemini langsung / mengembalikan null karena `GEMINI_API_KEY` kosong)

- [ ] **Step 3: Ubah `lib/ocr/gemini.ts`**

1. Tambah impor di atas:
```ts
import { bacaDokumenAi, type KonteksAi } from '@/lib/ai/baca';
import { AiBatasError } from '@/lib/ai/batas';
```
2. Ubah tanda tangan menjadi `processGeminiVisionOcr(imagePath: string, kategoriHint: string, konteks: KonteksAi)` dan **hapus** baris `const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return null;`.
3. Ganti seluruh blok dari `const candidateModels = [...]` sampai sebelum `const cleanJsonStr = ...` dengan:
```ts
    let candidate: string;
    try {
      candidate = (await bacaDokumenAi({ prompt, berkas: { base64: base64Data, mimeType }, konteks })).teks;
    } catch (e) {
      if (e instanceof AiBatasError) throw e;
      console.warn('AI OCR gagal, beralih ke OCR lokal:', e instanceof Error ? e.message : e);
      return null;
    }
```
4. Di `catch` terluar fungsi (yang mengembalikan `null`), tambahkan di baris pertamanya: `if (error instanceof AiBatasError) throw error;` (sesuaikan nama variabel catch yang ada).

- [ ] **Step 4: Ubah `lib/ocr/gemini-batch.ts`**

1. Impor yang sama seperti Step 3.
2. `classifyAndExtractDocument(imageBuffer: Buffer, mimeType: string, konteks: KonteksAi, batasTotalMs = BATAS_PER_DOKUMEN_MS)`; hapus pengecekan `GEMINI_API_KEY`.
3. Ganti blok `const candidateModels = [...]` … loop … `if (!candidate) return null;` dengan:
```ts
    let candidate: string;
    try {
      candidate = (await bacaDokumenAi({ prompt, berkas: { base64: base64Data, mimeType }, konteks, batasTotalMs })).teks;
    } catch (e) {
      if (e instanceof AiBatasError) throw e;
      console.warn('[batch] AI gagal:', e instanceof Error ? e.message : e);
      return null;
    }
```
4. Catch terluar `classifyAndExtractDocument` dan `classifyMultiPagePdf`: baris pertama `if (err instanceof AiBatasError) throw err;` (sesuaikan nama variabel).
5. `classifyMultiPagePdf(pdfBuffer: Buffer, konteks: KonteksAi)` dan di dalamnya `classifyAndExtractDocument(pageBuf, 'application/pdf', konteks)`.
6. Hapus konstanta `BATAS_PER_MODEL_MS` bila tak terpakai lagi (cek `grep -rn BATAS_PER_MODEL_MS`).

- [ ] **Step 5: Ubah `lib/ocr/engine.ts`**

1. `import type { KonteksAi } from '@/lib/ai/baca';` dan `import { AiBatasError } from '@/lib/ai/batas';`
2. `processOcrImage(imageBufferOrUrl: string | Buffer, kategori: string, konteks: KonteksAi)`; panggil `processGeminiVisionOcr(imagePathToRecognize, kategori, konteks)`.
3. Di `catch (geminiErr)` sekitar pemanggilan itu, baris pertama: `if (geminiErr instanceof AiBatasError) throw geminiErr;`. Pastikan catch terluar `processOcrImage` (bila ada) juga melempar ulang `AiBatasError`, dan blok `finally` pembersih berkas sementara tetap berjalan.

- [ ] **Step 6: Ubah rute**

`app/api/ocr/route.ts`:
- `const { user, supabase } = await requireUser([...])` (ambil `user`).
- Kedua pemanggilan: `processOcrImage(fileUrl, kategori, { fitur: 'ocr_tunggal', penggunaId: user.id })` dan `processOcrImage(buffer, kategori, { fitur: 'ocr_tunggal', penggunaId: user.id })`.
- Di `catch (error)` rute, sebelum respons 500:
```ts
    if (error instanceof AiBatasError) {
      return NextResponse.json({ error: error.message, code: error.kode }, { status: 429 });
    }
```
  dengan `import { AiBatasError } from '@/lib/ai/batas';`.

`app/api/ocr/batch/route.ts`:
- Ambil `user` dari `requireUser` (baris ~78). Bila pemrosesan berada di fungsi pembantu yang tidak melihat `user`, tambahkan parameter `penggunaId: string` ke fungsi itu.
- `const konteks = { fitur: 'ocr_massal' as const, penggunaId: user.id };` lalu semua `classifyMultiPagePdf(buffer)` → `classifyMultiPagePdf(buffer, konteks)` dan `classifyAndExtractDocument(x, mime)` → `classifyAndExtractDocument(x, mime, konteks)` (4 tempat: baris ~111, ~175, ~247, ~319).
- Catch per-berkas yang sudah ada (`error: itemErr.message` / `fileErr.message`) otomatis menampilkan `PESAN_BATAS_AI`; tidak perlu diubah.

`app/api/upload-mandiri/route.ts` (baris ~131):
- `processOcrImage(finalBuffer, kategori, { fitur: 'ocr_mandiri', penggunaId: null })`. Pemanggilan ini sudah di dalam `try` sehingga batas tercapai hanya melewati OCR; unggahan tetap tersimpan — pastikan catch itu tidak mengembalikan galat ke wali (baca kodenya; bila mengembalikan galat, tambahkan `if (e instanceof AiBatasError) { ocrResult = null; }` sebelum penanganan lain).

- [ ] **Step 6b: Berkas tetap terlampir saat batas tercapai (pindai tunggal)**

Di `components/forms/DocumentUploadBox.tsx`, fungsi `handleStartOcr`, ganti:
```ts
      if (!ocrRes.ok || !ocrJson.success) {
        throw new Error(ocrJson.error || 'Gagal memproses OCR.');
      }
```
dengan:
```ts
      if (ocrRes.status === 429 && ocrJson.code === 'BATAS_AI') {
        // Batas AI tercapai: berkas sudah terunggah — tetap dilampirkan tanpa isian otomatis.
        setErrorMessage(ocrJson.error);
        onDataExtracted?.({} as ExtractedDocumentData, fileUrl, selectedKategori, selectedFile?.name);
        return;
      }
      if (!ocrRes.ok || !ocrJson.success) {
        throw new Error(ocrJson.error || 'Gagal memproses OCR.');
      }
```
(`return` di dalam `try` tetap menjalankan `finally { setIsScanning(false) }`.) Pindai massal tidak perlu diubah: tiap berkas yang gagal sudah tampil dengan pesannya.

- [ ] **Step 7: Jalankan tes & tipe**

Run: `npx vitest run tests/ai/ocr-sambung.test.ts && npx tsc --noEmit && npx vitest run`
Expected: PASS semua; tsc tanpa galat (perbaiki pemanggil lain yang ditunjuk tsc dengan konteks yang sesuai).

- [ ] **Step 8: Commit**

```bash
git add lib/ocr app/api/ocr app/api/upload-mandiri components/forms/DocumentUploadBox.tsx tests/ai/ocr-sambung.test.ts
git commit -m "feat(ai): OCR tunggal, massal & mandiri memakai bacaDokumenAi"
```

---

### Task 7: API `/api/ai`

**Files:**
- Create: `app/api/ai/route.ts`
- Test: `tests/api/ai-route.test.ts`

**Interfaces:**
- Consumes: `bacaSetelanAi`, `simpanSetelanAi`, `statusKunci` (Task 4); `ambilRingkasanPemakaian` (Task 4); `skemaSetelanAi`, `MODEL_AI` (Task 1).
- Produces: `GET /api/ai` → `{ success: true, data: DataHalamanAi }`; `PUT /api/ai` (body `SetelanAi`) → `{ success: true, data: SetelanAi }`. Tipe `DataHalamanAi = { setelan: SetelanAi; kunci: Record<Penyedia, boolean>; ringkasan: RingkasanPemakaian }` diekspor dari `lib/ai/setelan.ts` (tambahkan di sana).

- [ ] **Step 1: Tulis tes gagal** `tests/api/ai-route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sesi = vi.hoisted(() => ({ roles: ['SUPERADMIN'] as string[] }));
const disimpan = vi.hoisted(() => [] as any[]);

vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn(async (roles?: string[]) => {
    if (roles && !roles.some(r => sesi.roles.includes(r))) { const e: any = new Error('FORBIDDEN'); e.status = 403; throw e; }
    return { user: { id: 'p-1', roles: sesi.roles }, supabase: {} };
  }),
  authErrorResponse: (e: any) => (e?.status ? new Response(JSON.stringify({ error: e.message }), { status: e.status }) : null),
}));
vi.mock('@/lib/ai/setelan', async () => {
  const { SETELAN_AI_BAWAAN } = await import('@/lib/ai/model');
  return {
    bacaSetelanAi: async () => SETELAN_AI_BAWAAN,
    simpanSetelanAi: async (_c: unknown, s: unknown) => { disimpan.push(s); },
    statusKunci: () => ({ openai: true, gemini: false }),
  };
});
vi.mock('@/lib/ai/pemakaian', () => ({
  ambilRingkasanPemakaian: async () => ({ pindaiHariIni: 3, gagalHariIni: 0, biayaBulanIni: 0, tokenBulanIni: 0, cadanganBulanIni: 0, terakhir: [] }),
}));

import { GET, PUT } from '@/app/api/ai/route';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

const req = (body: unknown) => ({ json: async () => body }) as any;
beforeEach(() => { sesi.roles = ['SUPERADMIN']; disimpan.length = 0; });

describe('/api/ai', () => {
  it('GET: setelan, status kunci & ringkasan untuk Superadmin', async () => {
    const res = await GET();
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.kunci).toEqual({ openai: true, gemini: false });
    expect(j.data.ringkasan.pindaiHariIni).toBe(3);
  });
  it('GET & PUT ditolak selain Superadmin', async () => {
    sesi.roles = ['ADMIN_SANTRI'];
    expect((await GET()).status).toBe(403);
    expect((await PUT(req(SETELAN_AI_BAWAAN))).status).toBe(403);
    expect(disimpan).toHaveLength(0);
  });
  it('PUT menyimpan setelan valid', async () => {
    const baru = { ...SETELAN_AI_BAWAAN, batasHarian: 50 };
    const res = await PUT(req(baru));
    expect(res.status).toBe(200);
    expect(disimpan[0].batasHarian).toBe(50);
  });
  it('PUT menolak model di luar daftar', async () => {
    const res = await PUT(req({ ...SETELAN_AI_BAWAAN, utama: { penyedia: 'openai', model: 'gpt-9' } }));
    expect(res.status).toBe(400);
    expect(disimpan).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/api/ai-route.test.ts`
Expected: FAIL — modul `@/app/api/ai/route` tidak ditemukan

- [ ] **Step 3: Tambah tipe di `lib/ai/setelan.ts`**

```ts
import type { RingkasanPemakaian } from './pemakaian';
export type DataHalamanAi = { setelan: SetelanAi; kunci: Record<Penyedia, boolean>; ringkasan: RingkasanPemakaian };
```

- [ ] **Step 4: Implementasi** `app/api/ai/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { validationResponse } from '@/lib/validation/errors';
import { skemaSetelanAi } from '@/lib/ai/model';
import { bacaSetelanAi, simpanSetelanAi, statusKunci, type DataHalamanAi } from '@/lib/ai/setelan';
import { ambilRingkasanPemakaian } from '@/lib/ai/pemakaian';

/** Setelan AI & ringkasan pemakaian. Baca & ubah: Superadmin. */
export async function GET() {
  try {
    await requireUser(['SUPERADMIN']);
    const data: DataHalamanAi = { setelan: await bacaSetelanAi(), kunci: statusKunci(), ringkasan: await ambilRingkasanPemakaian() };
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Muat setelan AI error:', e);
    return NextResponse.json({ error: e.message || 'Gagal memuat setelan AI' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, supabase } = await requireUser(['SUPERADMIN']);
    const parsed = skemaSetelanAi.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    await simpanSetelanAi(supabase, parsed.data, user.id);
    return NextResponse.json({ success: true, data: parsed.data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Simpan setelan AI error:', e);
    return NextResponse.json({ error: e.message || 'Gagal menyimpan setelan AI' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Jalankan, pastikan lolos**

Run: `npx vitest run tests/api/ai-route.test.ts`
Expected: PASS (4 tes) — `validationResponse` mengembalikan 400.

- [ ] **Step 6: Commit**

```bash
git add app/api/ai lib/ai/setelan.ts tests/api/ai-route.test.ts
git commit -m "feat(ai): API /api/ai — setelan & ringkasan pemakaian (Superadmin)"
```

---

### Task 8: Halaman `/ai` & baris di Akun

**Files:**
- Create: `app/(santri)/ai/page.tsx`, `components/ai/HalamanAi.tsx`, `components/akun/BarisAi.tsx`
- Modify: `components/akun/HalamanAkun.tsx` (setelah tautan "Kelola pengguna", sekitar baris 211)
- Test: `tests/components/halaman-ai.test.tsx`

**Interfaces:**
- Consumes: `DataHalamanAi` (Task 7); `MODEL_AI`, `LABEL_PENYEDIA`, `infoModel`, `SetelanAi`, `PilihanModel` (Task 1); `hargaTerisi` (Task 2); `PUT /api/ai`, `GET /api/ai`.
- Produces: `HalamanAi({ awal }: { awal: DataHalamanAi })`; `BarisAi()`; `persenPakai(dipakai: number, batas: number): number` & `warnaBar(persen: number): string` diekspor dari `components/ai/HalamanAi.tsx`.

- [ ] **Step 1: Tulis tes gagal** `tests/components/halaman-ai.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { HalamanAi, persenPakai, warnaBar } from '@/components/ai/HalamanAi';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

const ringkasan = { pindaiHariIni: 23, gagalHariIni: 1, biayaBulanIni: 12400, tokenBulanIni: 350000, cadanganBulanIni: 3, terakhir: [
  { idPermintaan: 'r', waktu: '2026-09-29T03:00:00Z', penggunaId: 'u', fitur: 'ocr_tunggal' as const, peran: 'cadangan' as const, penyedia: 'gemini' as const,
    model: 'gemini-flash-lite-latest', tokenMasuk: 3000, tokenKeluar: 200, biayaRp: null, berhasil: true, galat: null, namaPengguna: 'Ucup' },
] };
const data = { setelan: { ...SETELAN_AI_BAWAAN, harga: { 'gpt-5.4-mini': { masukPerJuta: 1000, keluarPerJuta: 4000 } } }, kunci: { openai: true, gemini: false }, ringkasan };

describe('HalamanAi', () => {
  const h = renderToStaticMarkup(<HalamanAi awal={data} />);
  it('kartu pemakaian hari ini & bulan ini', () => {
    expect(h).toContain('23 / 200');
    expect(h).toMatch(/Rp\s?12\.400/);
    expect(h).toContain('cadangan dipakai 3×');
  });
  it('status kunci per penyedia', () => {
    expect(h).toContain('Kunci terpasang');
    expect(h).toContain('Kunci belum dipasang di Vercel');
  });
  it('pilihan model & opsi tanpa cadangan', () => {
    expect(h).toContain('value="openai|gpt-5.4-mini"');
    expect(h).toContain('Tanpa cadangan');
  });
  it('riwayat menandai cadangan', () => {
    expect(h).toContain('Ucup');
    expect(h).toContain('cadangan');
  });
  it('kembali ke Akun', () => {
    expect(h).toContain('href="/akun"');
  });
});

describe('bar pemakaian', () => {
  it('persen dibatasi 0–100 & warna mengikuti ambang', () => {
    expect(persenPakai(250, 200)).toBe(100);
    expect(persenPakai(0, 0)).toBe(100);
    expect(warnaBar(50)).toContain('emerald');
    expect(warnaBar(80)).toContain('orange');
    expect(warnaBar(100)).toContain('rose');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/components/halaman-ai.test.tsx`
Expected: FAIL — modul tidak ditemukan

- [ ] **Step 3: Implementasi** `components/ai/HalamanAi.tsx`

```tsx
'use client';
import { useState } from 'react';
import { FloppyDisk, CheckCircle, XCircle } from '@phosphor-icons/react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import { MODEL_AI, LABEL_PENYEDIA, infoModel, type Penyedia, type PilihanModel, type SetelanAi } from '@/lib/ai/model';
import { hargaTerisi } from '@/lib/ai/biaya';
import type { DataHalamanAi } from '@/lib/ai/setelan';

const rp = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
const kelasJudul = 'text-xs font-extrabold uppercase tracking-wider text-bq-redup';

export function persenPakai(dipakai: number, batas: number): number {
  if (batas <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((dipakai / batas) * 100)));
}
export function warnaBar(persen: number): string {
  return persen >= 100 ? 'bg-rose-500' : persen >= 80 ? 'bg-orange-500' : 'bg-emerald-500';
}

function Bar({ persen }: { persen: number }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-bq-garis" aria-hidden="true">
      <div className={`h-full rounded-full ${warnaBar(persen)}`} style={{ width: `${persen}%` }} />
    </div>
  );
}

function PilihModel({ label, nilai, kunci, bolehKosong, onUbah }: {
  label: string; nilai: PilihanModel | null; kunci: Record<Penyedia, boolean>; bolehKosong?: boolean; onUbah: (p: PilihanModel | null) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={kelasLabel}>{label}</label>
      <select id={id} className={kelasInput} value={nilai ? `${nilai.penyedia}|${nilai.model}` : ''}
        onChange={e => {
          if (!e.target.value) return onUbah(null);
          const [penyedia, model] = e.target.value.split('|') as [Penyedia, string];
          onUbah({ penyedia, model });
        }}>
        {bolehKosong && <option value="">Tanpa cadangan</option>}
        {(Object.keys(MODEL_AI) as Penyedia[]).map(p => (
          <optgroup key={p} label={LABEL_PENYEDIA[p]}>
            {MODEL_AI[p].map(m => <option key={m.id} value={`${p}|${m.id}`}>{LABEL_PENYEDIA[p]} · {m.label}</option>)}
          </optgroup>
        ))}
      </select>
      {nilai && (kunci[nilai.penyedia]
        ? <p className="flex items-center gap-1 text-xs font-semibold text-bq-hijau"><CheckCircle size={14} weight="fill" aria-hidden="true" /> Kunci terpasang</p>
        : <p className="flex items-center gap-1 text-xs font-semibold text-rose-600"><XCircle size={14} weight="fill" aria-hidden="true" /> Kunci belum dipasang di Vercel</p>)}
    </div>
  );
}

/** Halaman AI & OCR (Superadmin): pemakaian, penyedia utama/cadangan, batas, harga, riwayat. */
export function HalamanAi({ awal }: { awal: DataHalamanAi }) {
  const [s, setS] = useState<SetelanAi>(awal.setelan);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const r = awal.ringkasan;
  const persenHari = persenPakai(r.pindaiHariIni, s.batasHarian);
  const plafonAktif = hargaTerisi(s.harga[s.utama.model]);
  const persenBulan = plafonAktif ? persenPakai(r.biayaBulanIni, s.plafonBulananRp) : 0;
  const modelDipakai = [s.utama, s.cadangan].filter((x): x is PilihanModel => !!x);

  const ubahHarga = (model: string, kunci: 'masukPerJuta' | 'keluarPerJuta', nilai: number) =>
    setS(v => ({ ...v, harga: { ...v.harga, [model]: { ...(v.harga[model] ?? { masukPerJuta: 0, keluarPerJuta: 0 }), [kunci]: nilai } } }));

  const simpan = async () => {
    setBusy(true); setGalat(null); setPesan(null);
    try {
      const res = await fetch('/api/ai', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan');
      setPesan('Setelan AI tersimpan.');
    } catch (e) { setGalat(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman judul="AI & OCR" sub="Penyedia, pemakaian & batas biaya pembacaan berkas." kembali={{ href: '/akun', label: 'Kembali ke Akun' }} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Kartu className="p-4">
          <h2 className={kelasJudul}>Hari ini</h2>
          <p className="mt-1 text-2xl font-black text-bq-tinta">{r.pindaiHariIni} / {s.batasHarian} <span className="text-sm font-bold text-bq-redup">pindai</span></p>
          <Bar persen={persenHari} />
          <p className="mt-2 text-xs text-bq-redup">{r.gagalHariIni} gagal{persenHari >= 100 && ' · AI berhenti — isi manual'}</p>
        </Kartu>
        <Kartu className="p-4">
          <h2 className={kelasJudul}>Bulan ini</h2>
          <p className="mt-1 text-2xl font-black text-bq-tinta">
            {plafonAktif ? <>± {rp(r.biayaBulanIni)} <span className="text-sm font-bold text-bq-redup">/ {rp(s.plafonBulananRp)}</span></> : '–'}
          </p>
          {plafonAktif && <Bar persen={persenBulan} />}
          <p className="mt-2 text-xs text-bq-redup">
            {r.tokenBulanIni.toLocaleString('id-ID')} token · cadangan dipakai {r.cadanganBulanIni}×
            {!plafonAktif && ' · isi harga model utama untuk mengaktifkan plafon Rp'}
            {plafonAktif && persenBulan >= 100 && ' · AI berhenti — isi manual'}
          </p>
        </Kartu>
      </div>

      <Kartu className="space-y-4 p-4">
        <h2 className={kelasJudul}>Penyedia</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PilihModel label="Utama" nilai={s.utama} kunci={awal.kunci} onUbah={p => p && setS(v => ({ ...v, utama: p }))} />
          <PilihModel label="Cadangan" nilai={s.cadangan} kunci={awal.kunci} bolehKosong onUbah={p => setS(v => ({ ...v, cadangan: p }))} />
        </div>
      </Kartu>

      <Kartu className="space-y-4 p-4">
        <h2 className={kelasJudul}>Batas</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="batas-harian" className={kelasLabel}>Pindai per hari</label>
            <input id="batas-harian" type="number" min={0} className={kelasInput} value={s.batasHarian}
              onChange={e => setS(v => ({ ...v, batasHarian: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="plafon" className={kelasLabel}>Plafon per bulan (Rp)</label>
            <input id="plafon" type="number" min={0} step={1000} className={kelasInput} value={s.plafonBulananRp}
              onChange={e => setS(v => ({ ...v, plafonBulananRp: Math.max(0, Number(e.target.value) || 0) }))} />
          </div>
        </div>
      </Kartu>

      <Kartu className="space-y-3 p-4">
        <h2 className={kelasJudul}>Harga model (Rp per 1 juta token)</h2>
        <p className="text-xs text-bq-redup">Cek harga resmi di situs OpenAI / Google lalu konversi ke rupiah. Kosong = biaya tidak dihitung.</p>
        {modelDipakai.map(m => (
          <div key={m.model} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-3">
            <span className="text-sm font-bold text-bq-tinta">{LABEL_PENYEDIA[m.penyedia]} · {infoModel(m)?.label}</span>
            {(['masukPerJuta', 'keluarPerJuta'] as const).map(k => (
              <div key={k} className="space-y-1">
                <label htmlFor={`${m.model}-${k}`} className={kelasLabel}>{k === 'masukPerJuta' ? 'Token masuk' : 'Token keluar'}</label>
                <input id={`${m.model}-${k}`} type="number" min={0} className={kelasInput} value={s.harga[m.model]?.[k] ?? 0}
                  onChange={e => ubahHarga(m.model, k, Math.max(0, Number(e.target.value) || 0))} />
              </div>
            ))}
          </div>
        ))}
      </Kartu>

      <div className="flex flex-wrap items-center gap-3">
        <TombolUtama ikon={FloppyDisk} onClick={simpan} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan setelan'}</TombolUtama>
        {pesan && <span className="text-sm font-semibold text-bq-hijau">{pesan}</span>}
      </div>
      {galat && <PesanGalat pesan={galat} />}

      <Kartu className="p-4">
        <h2 className={kelasJudul}>Riwayat terakhir</h2>
        {r.terakhir.length === 0 ? <p className="mt-2 text-sm text-bq-redup">Belum ada pemakaian bulan ini.</p> : (
          <ul className="mt-2 divide-y divide-bq-garis">
            {r.terakhir.map((x, i) => (
              <li key={`${x.idPermintaan}-${x.peran}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block font-bold text-bq-tinta">{x.namaPengguna ?? (x.fitur === 'ocr_mandiri' ? 'Unggah mandiri wali' : '—')} · {infoModel(x)?.label ?? x.model}</span>
                  <span className="block text-bq-redup">{new Date(x.waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })} · {(x.tokenMasuk + x.tokenKeluar).toLocaleString('id-ID')} token{x.biayaRp !== null && ` · ${rp(x.biayaRp)}`}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${x.berhasil ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}
                  title={x.galat ?? undefined}>
                  {x.berhasil ? (x.peran === 'cadangan' ? '✓ cadangan' : '✓') : '✗ gagal'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  );
}
```

- [ ] **Step 4: Implementasi** `app/(santri)/ai/page.tsx`

```tsx
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { canManageUsers } from '@/lib/auth/roles';
import { bacaSetelanAi, statusKunci } from '@/lib/ai/setelan';
import { ambilRingkasanPemakaian } from '@/lib/ai/pemakaian';
import { HalamanAi } from '@/components/ai/HalamanAi';

export const metadata = { title: 'AI & OCR — BQ-ku' };
export const revalidate = 0;

export default async function AiPage() {
  const user = await getSessionUser();
  if (!user || !canManageUsers(user.roles)) redirect('/');
  const [setelan, ringkasan] = await Promise.all([bacaSetelanAi(), ambilRingkasanPemakaian()]);
  return <HalamanAi awal={{ setelan, kunci: statusKunci(), ringkasan }} />;
}
```

Catatan: bila `ambilRingkasanPemakaian` melempar karena migrasi 0012 belum dijalankan, halaman error. Bungkus: `ambilRingkasanPemakaian().catch(() => ({ pindaiHariIni: 0, gagalHariIni: 0, biayaBulanIni: 0, tokenBulanIni: 0, cadanganBulanIni: 0, terakhir: [] }))`.

- [ ] **Step 5: Implementasi** `components/akun/BarisAi.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Robot, CaretRight } from '@phosphor-icons/react';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { LABEL_PENYEDIA, infoModel } from '@/lib/ai/model';
import type { DataHalamanAi } from '@/lib/ai/setelan';

const kelasBaris = 'goyang-saat-hover flex items-center justify-between gap-3 rounded-2xl border border-bq-garis p-3.5 transition-colors hover:border-bq-biru';

/** Baris "AI & OCR" di halaman Akun (Superadmin): penyedia utama & pindai hari ini. */
export function BarisAi() {
  const [d, setD] = useState<DataHalamanAi | null>(null);
  useEffect(() => {
    let batal = false;
    fetch('/api/ai').then(r => (r.ok ? r.json() : null)).then(j => { if (!batal && j?.data) setD(j.data); }).catch(() => {});
    return () => { batal = true; };
  }, []);
  const sub = d
    ? `${LABEL_PENYEDIA[d.setelan.utama.penyedia]} ${infoModel(d.setelan.utama)?.label ?? d.setelan.utama.model} · ${d.ringkasan.pindaiHariIni}/${d.setelan.batasHarian} pindai hari ini`
    : 'Penyedia, pemakaian & batas';
  return (
    <Link href="/ai" className={kelasBaris}>
      <span className="flex items-center gap-3">
        <IkonUbin ikon={Robot} warna="biru" />
        <span>
          <span className="block text-sm font-bold text-bq-tinta">AI &amp; OCR</span>
          <span className="block text-xs text-bq-redup">{sub}</span>
        </span>
      </span>
      <CaretRight size={16} weight="bold" className="text-bq-redup" aria-hidden="true" />
    </Link>
  );
}
```

`lib/ai/model.ts` dan `lib/ai/biaya.ts` diimpor di komponen klien — keduanya tidak memuat `server-only`, jadi aman. `lib/ai/setelan.ts` hanya diimpor sebagai **tipe** (`import type`) di klien.

- [ ] **Step 6: Sisipkan di `components/akun/HalamanAkun.tsx`**

Tambah impor `import { BarisAi } from './BarisAi';` lalu tepat setelah blok `{canManageUsers && ( <Link href="/pengguna" …> … </Link> )}` tambahkan:

```tsx
            {superadmin && <BarisAi />}
```

- [ ] **Step 7: Jalankan tes & tipe**

Run: `npx vitest run tests/components/halaman-ai.test.tsx && npx tsc --noEmit && npx vitest run`
Expected: PASS semua. 

- [ ] **Step 8: Cek tampilan**

Buat halaman uji sementara `app/bagikan/zz-uji/page.tsx` (jalur publik, jangan di-commit) yang merender `<HalamanAi awal={…data contoh dari tes…} />`; buka `http://localhost:41471/bagikan/zz-uji` di preview, cek desktop & HP (resize mobile), bar 80%/100%, lalu hapus halaman uji.

- [ ] **Step 9: Commit**

```bash
git add "app/(santri)/ai" components/ai components/akun/BarisAi.tsx components/akun/HalamanAkun.tsx tests/components/halaman-ai.test.tsx
git commit -m "feat(ai): halaman AI & OCR + baris di Akun"
```

---

### Task 9: Verifikasi akhir & catatan deploy

**Files:**
- Modify: `docs/superpowers/specs/2026-09-29-ai-openai-gemini-design.md` (tambahkan kolom `peran` & fitur `ocr_mandiri` di bagian 2)

- [ ] **Step 1: Seluruh tes & tipe**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tanpa galat tipe; semua tes lolos.

- [ ] **Step 2: Perbarui spec** — di bagian 2 tabel `pemakaian_ai` tambahkan baris `peran text not null -- 'utama' | 'cadangan'` dan ubah komentar `fitur` menjadi `'ocr_tunggal' | 'ocr_massal' | 'ocr_mandiri'`.

- [ ] **Step 3: Commit & push**

```bash
git add docs/superpowers/specs/2026-09-29-ai-openai-gemini-design.md
git commit -m "docs(ai): spec — kolom peran & fitur ocr_mandiri"
git push origin main
```

- [ ] **Step 4: Serahkan langkah manual ke pengguna**
1. Jalankan `supabase/migrations/0012_pemakaian_ai.sql` di SQL Editor Supabase.
2. Pasang `OPENAI_API_KEY` (kunci **baru**) di Vercel → Project → Settings → Environment Variables (Production).
3. `vercel deploy --prod --yes`, lalu `vercel ls bq-ku` sampai status Ready.
4. Buka Akun → AI & OCR: isi harga model, cek status kunci ✓.
5. Pindai satu berkas → riwayat menampilkan OpenAI ✓. Uji cadangan: ganti model utama ke model yang kuncinya tidak terpasang (atau kosongkan `OPENAI_API_KEY` sementara) → pindai → riwayat menampilkan "✗ gagal" + "✓ cadangan".
