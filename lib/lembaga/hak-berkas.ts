import type { UserRole } from '@/lib/auth/roles';

export type HakBerkas = { lihat: boolean; kelola: boolean; rahasia: boolean; hapus: boolean; aturSaklar: boolean };

/**
 * Cermin aturan RLS migrasi 0011 untuk tampilan & pesan galat yang ramah.
 * Penegakan sebenarnya tetap di database.
 */
export function hakBerkas(roles: UserRole[], pengurusKelolaNyala: boolean): HakBerkas {
  const superadmin = roles.includes('SUPERADMIN');
  const pengurus = roles.includes('PENGURUS');
  return {
    lihat: superadmin || pengurus,
    kelola: superadmin || (pengurus && pengurusKelolaNyala),
    rahasia: superadmin,
    hapus: superadmin,
    aturSaklar: superadmin,
  };
}
