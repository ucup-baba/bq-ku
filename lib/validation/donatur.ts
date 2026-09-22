import { z } from 'zod';
import { normalizeWa } from '@/lib/validation/santri';
import { parseNomorSurat } from '@/lib/utils/nomor-surat';

const teksOpsional = z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional();
const tanggalIso = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(v => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid')
  .refine(v => Date.parse(v) <= Date.now() + 86_400_000, 'Tanggal tidak boleh di masa depan');

export const sapaanEnum = z.enum(['BAPAK', 'IBU', 'SDR', 'SDRI', 'BAPAK_IBU']);
export const jenisEnum = z.enum(['ZAKAT', 'INFAQ', 'SHADAQAH', 'LAINNYA']);
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

export const suratSchema = z.object({
  donasiId: z.string().trim().min(1),
  nomorSurat: z.string().trim().refine(v => parseNomorSurat(v) !== null, 'Format nomor surat harus 271/PBQ/IX/2026'),
  tanggalSurat: tanggalIso,
});

export const rekapQuerySchema = z.object({
  dari: tanggalIso,
  sampai: tanggalIso,
});

export type DonaturInput = z.infer<typeof donaturSchema>;
export type DonasiInput = z.infer<typeof donasiSchema>;
export type SuratInput = z.infer<typeof suratSchema>;
