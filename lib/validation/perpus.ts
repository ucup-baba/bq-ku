import { z } from 'zod';
import { kelasSah } from '@/lib/perpus/ddc';
import { hariIniWib } from '@/lib/perpus/pinjaman';
import { nomorWali } from '@/lib/santri/pengingat';
import { isTanggalIso } from '@/lib/validation/query';

const kelas = z.string().trim().refine(kelasSah, 'Kelas DDC tidak dikenal');
const teksOpsional = z.string().trim().transform(v => (v === '' ? null : v)).nullable().default(null);
const tanggalOpsional = z.string().trim().refine(isTanggalIso, 'Tanggal tidak valid').nullable().default(null);
const uuidOpsional = z.string().uuid().nullable().default(null);

export const bukuSchema = z.object({
  judul: z.string().trim().min(1, 'Judul wajib diisi').max(300),
  penulis: z.string().trim().max(200).default(''),
  kelasDdc: kelas,
  kodePengarang: z.string().trim().regex(/^[A-Z]{2,4}$/, 'Kode pengarang 2–4 huruf kapital').optional(),
  seri: z.object({ kode: z.string().regex(/^[a-z]$/, 'Kode seri 1 huruf kecil'), nomor: z.number().int().min(1).max(99) }).nullable().default(null),
  eksemplar: z.number().int().min(1).max(99).default(1),
  asal: z.enum(['koleksi_awal', 'wakaf', 'pengadaan']).default('koleksi_awal'),
  donasiId: uuidOpsional,
  pengadaanId: uuidOpsional,
});
export type BukuInput = z.infer<typeof bukuSchema>;

export const bukuUbahSchema = z.object({
  judul: z.string().trim().min(1).max(300).optional(),
  penulis: z.string().trim().max(200).optional(),
  kelasDdc: kelas.optional(),
  kodePengarang: z.string().trim().regex(/^[A-Z]{2,4}$/).optional(),
  eksemplar: z.number().int().min(1).max(99).optional(),
  asal: z.enum(['koleksi_awal', 'wakaf', 'pengadaan']).optional(),
  donasiId: z.string().uuid().nullable().optional(),
  pengadaanId: z.string().uuid().nullable().optional(),
  aktif: z.boolean().optional(),
});
export type BukuUbahInput = z.infer<typeof bukuUbahSchema>;

export const donasiPerpusSchema = z.object({
  tanggal: tanggalOpsional,
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf').max(120),
  jenis: z.enum(['uang', 'buku']),
  jumlah: z.number().int().min(0).nullable().default(null),
  jumlahBuku: z.number().int().min(1).nullable().default(null),
  catatan: teksOpsional,
}).refine(d => (d.jenis === 'uang' ? d.jumlah != null : d.jumlahBuku != null), {
  message: 'Isi nominal (uang) atau jumlah buku (buku)', path: ['jumlah'],
});
export type DonasiPerpusInput = z.infer<typeof donasiPerpusSchema>;

export const pengadaanSchema = z.object({
  tanggal: tanggalOpsional,
  toko: teksOpsional,
  total: z.number().int().min(0),
  catatan: teksOpsional,
});
export type PengadaanInput = z.infer<typeof pengadaanSchema>;

export const klasifikasiSchema = z.object({
  buku: z.array(z.object({ judul: z.string().trim().min(1).max(300), penulis: z.string().trim().max(200).default('') })).min(1).max(10),
});

export const auditTerapkanSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), kelasDdc: kelas })).min(1).max(300),
});

const tanggalMendatang = z.string().trim().refine(isTanggalIso, 'Tanggal tidak valid')
  .refine(v => v >= hariIniWib(), 'Jatuh tempo tidak boleh lewat');

const namaAnggota = z.string().trim().min(2, 'Nama minimal 2 huruf').max(120);
const noWaAnggota = z.string().transform(v => nomorWali(v) ?? '').refine(v => /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid');

export const daftarAnggotaSchema = z.object({ nama: namaAnggota, noWa: noWaAnggota });
export type DaftarAnggotaInput = z.infer<typeof daftarAnggotaSchema>;

export const ajukanSchema = z.object({ bukuId: z.string().uuid() });
export const aksiAnggotaSchema = z.object({ aksi: z.enum(['batal', 'klaim']) });

export const aksiPustakawanSchema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('acc'), jatuhTempo: tanggalMendatang.nullable().default(null) }),
  z.object({ aksi: z.literal('tolak'), catatan: teksOpsional }),
  z.object({ aksi: z.literal('verifikasi') }),
  z.object({ aksi: z.literal('tandai_kembali') }),
  z.object({ aksi: z.literal('perpanjang'), jatuhTempo: tanggalMendatang }),
]);
export type AksiPustakawanInput = z.infer<typeof aksiPustakawanSchema>;

export const ubahAnggotaSchema = z.object({
  status: z.enum(['aktif', 'diblokir']).optional(),
  nama: namaAnggota.optional(),
  noWa: noWaAnggota.optional(),
}).refine(d => Object.keys(d).length > 0, 'Tidak ada perubahan');
export type UbahAnggotaInput = z.infer<typeof ubahAnggotaSchema>;
