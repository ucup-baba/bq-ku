import { z } from 'zod';
export const roleEnum = z.enum(['SUPERADMIN', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER']);
export const invitePenggunaSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf'),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  role: roleEnum,
});
export const updatePenggunaSchema = z.object({ role: roleEnum.optional(), aktif: z.boolean().optional() })
  .refine(d => d.role !== undefined || d.aktif !== undefined, 'Tidak ada perubahan');
