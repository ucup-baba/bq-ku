import { describe, it, expect, vi } from 'vitest';
import { identitasDari } from '@/lib/auth/identitas';

const klien = (hasil: unknown) => ({ auth: { getClaims: vi.fn().mockResolvedValue(hasil) } }) as never;

describe('identitasDari', () => {
  it('klaim valid → id & email', async () => {
    expect(await identitasDari(klien({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null }))).toEqual({ id: 'u1', email: 'a@b.c' });
  });
  it('tanpa sesi, galat verifikasi, atau tanpa sub → null', async () => {
    expect(await identitasDari(klien({ data: null, error: null }))).toBeNull();
    expect(await identitasDari(klien({ data: { claims: { sub: 'u1' } }, error: new Error('invalid JWT') }))).toBeNull();
    expect(await identitasDari(klien({ data: { claims: { email: 'a@b.c' } }, error: null }))).toBeNull();
  });
});
