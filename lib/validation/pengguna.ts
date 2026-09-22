import { z } from 'zod';

export const roleEnum = z.enum(['SUPERADMIN', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER']);

const rolesArray = z.array(roleEnum).min(1, 'Pilih minimal satu peran')
  .transform(list => Array.from(new Set(list)));

export const invitePenggunaSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf'),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  roles: rolesArray,
});

export const updatePenggunaSchema = z.object({
  roles: rolesArray.optional(),
  aktif: z.boolean().optional(),
}).refine(d => d.roles !== undefined || d.aktif !== undefined, 'Tidak ada perubahan');
