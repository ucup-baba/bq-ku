import { z } from 'zod';
import { isTanggalIso } from '@/lib/validation/query';
import { JENIS_BERKAS } from '@/lib/lembaga/berkas';

const teksOpsional = z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional();
const tanggalOpsional = z.string().trim()
  .refine(v => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && isTanggalIso(v)), 'Tanggal tidak valid')
  .transform(v => (v === '' ? null : v)).nullable().optional();

export const jenisBerkasEnum = z.enum(JENIS_BERKAS.map(j => j.kunci) as [string, ...string[]]);

export const dataBerkasSchema = z.object({
  jenis: jenisBerkasEnum,
  namaLainnya: teksOpsional,
  nomorDokumen: teksOpsional,
  tanggalTerbit: tanggalOpsional,
  berlakuSampai: tanggalOpsional,
  namaPenandatangan: teksOpsional,
}).transform(d => ({
  ...d,
  namaLainnya: d.jenis === 'LAINNYA' ? d.namaLainnya ?? null : null,
  namaPenandatangan: d.jenis === 'TANDA_TANGAN' ? d.namaPenandatangan ?? null : null,
  nomorDokumen: d.nomorDokumen ?? null, tanggalTerbit: d.tanggalTerbit ?? null, berlakuSampai: d.berlakuSampai ?? null,
})).refine(d => d.jenis !== 'LAINNYA' || !!d.namaLainnya, { path: ['namaLainnya'], message: 'Tuliskan nama berkas' });

export const ubahDataBerkasSchema = z.object({
  namaLainnya: teksOpsional, nomorDokumen: teksOpsional, tanggalTerbit: tanggalOpsional,
  berlakuSampai: tanggalOpsional, namaPenandatangan: teksOpsional,
});

export const fileUnggahSchema = z.object({
  path: z.string().regex(/^lembaga\/(rahasia\/)?[0-9a-f-]{36}\.(pdf|jpg|png)$/, 'Lokasi berkas tidak valid'),
  namaFile: z.string().trim().min(1).max(200),
  mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  ukuran: z.number().int().positive(),
});

export const unggahUrlSchema = z.object({
  jenis: jenisBerkasEnum,
  namaFile: z.string().trim().min(1).max(200),
  mime: z.string(),
  ukuran: z.number().int(),
});

export const tautanSchema = z.object({
  penerima: z.string().trim().min(1, 'Nama penerima wajib diisi').max(120),
  catatan: teksOpsional,
  hari: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  tandaAir: z.boolean(),
  pakaiPin: z.boolean(),
  batasBuka: z.number().int().min(1, 'Batas buka minimal 1').max(1000).nullable().optional(),
  berkasIds: z.array(z.string().min(1)).min(1, 'Pilih minimal satu berkas').max(20),
});
