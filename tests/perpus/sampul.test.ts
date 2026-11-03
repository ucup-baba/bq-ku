import { describe, it, expect, vi } from 'vitest';
import { pathSampul, urlSampul } from '@/lib/perpus/sampul';

describe('sampul', () => {
  it('URL publik bucket sampul', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    expect(urlSampul('a/1.webp')).toBe('https://x.supabase.co/storage/v1/object/public/perpus-sampul/a/1.webp');
    vi.unstubAllEnvs();
  });
  it('path memuat id & waktu agar cache tidak basi', () => {
    expect(pathSampul('b1', 123)).toBe('b1/123.webp');
  });
});
