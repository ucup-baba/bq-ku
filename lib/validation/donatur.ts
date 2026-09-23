import { z } from 'zod';
import { normalizeWa } from '@/lib/validation/santri';
import { parseNomorSurat } from '@/lib/utils/nomor-surat';
import { isTanggalIso } from '@/lib/validation/query';

const teksOpsional = z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional();
// isTanggalIso memeriksa round-trip kalender ('2026-02-30' ditolak, bukan
// digeser diam-diam ke 2 Maret oleh Date.parse).
const tanggalIso = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(isTanggalIso, 'Tanggal tidak valid')
  .refine(v => Date.parse(v) <= Date.now() + 86_400_000, 'Tanggal tidak boleh di masa depan');

// Khusus rentang rekap: akhir periode (mis. akhir bulan berjalan) wajar berada
// di masa depan, jadi tanpa larangan masa depan seperti tanggalIso di atas.
const tanggalIsoBebas = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(isTanggalIso, 'Tanggal tidak valid');

export const sapaanEnum = z.enum(['BAPAK', 'IBU', 'SDR', 'SDRI', 'BAPAK_IBU']);
export const jenisEnum = z.enum(['ZIS', 'WAKAF', 'LAINNYA', 'ZAKAT', 'INFAQ', 'SHADAQAH']);
export const bentukEnum = z.enum(['UANG', 'BARANG']);

export const donaturSchema = z.object({
  nama: z.string().trim().min(3, 'Nama donatur minimal 3 huruf'),
  sapaan: sapaanEnum.default('BAPAK'),
  noWa: z.string().trim().transform(v => (v === '' ? null : normalizeWa(v))).nullable().optional()
    .refine(v => v == null || /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid'),
  alamat: teksOpsional,
  catatan: teksOpsional,
});
export const donaturUpdateSchema = donaturSchema.partial();

export const donasiSchema = z.object({
  donaturId: z.string().trim().min(1, 'Donatur wajib dipilih'),
  tanggal: tanggalIso,
  jenis: jenisEnum,
  bentuk: bentukEnum,
  nominal: z.coerce.number().int().positive('Nominal harus lebih dari 0').optional(),
  deskripsiBarang: teksOpsional,
  keterangan: teksOpsional,
}).superRefine((d, ctx) => {
  if (d.bentuk === 'UANG' && !d.nominal) {
    ctx.addIssue({ code: 'custom', path: ['nominal'], message: 'Nominal wajib diisi untuk donasi uang' });
  }
  if (d.bentuk === 'BARANG' && !d.deskripsiBarang) {
    ctx.addIssue({ code: 'custom', path: ['deskripsiBarang'], message: 'Tuliskan barang yang didonasikan' });
  }
});

export const gayaTulisanEnum = z.enum(['KALAM', 'PATRICK']);

export const suratSchema = z.object({
  donasiId: z.string().trim().min(1),
  nomorSurat: z.string().trim().refine(v => parseNomorSurat(v) !== null, 'Format nomor surat harus 271/PBQ/IX/2026'),
  tanggalSurat: tanggalIso,
  gayaTulisan: gayaTulisanEnum.default('KALAM'),
});

export const rekapQuerySchema = z.object({
  dari: tanggalIsoBebas,
  sampai: tanggalIsoBebas,
}).refine(d => d.dari <= d.sampai, {
  message: 'Tanggal awal harus sebelum atau sama dengan tanggal akhir',
  path: ['sampai'],
});

export type DonaturInput = z.infer<typeof donaturSchema>;
export type DonasiInput = z.infer<typeof donasiSchema>;
export type SuratInput = z.infer<typeof suratSchema>;
