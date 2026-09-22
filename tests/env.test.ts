import { describe, it, expect, vi, afterEach } from 'vitest';

describe('requireEnv', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('mengembalikan nilai jika ada', async () => {
    vi.stubEnv('X_TEST', 'abc');
    const { requireEnv } = await import('@/lib/env');
    expect(requireEnv('X_TEST')).toBe('abc');
  });

  it('melempar error bernama jika kosong', async () => {
    vi.stubEnv('X_KOSONG', '');
    const { requireEnv } = await import('@/lib/env');
    expect(() => requireEnv('X_KOSONG')).toThrow(/X_KOSONG/);
  });
});
