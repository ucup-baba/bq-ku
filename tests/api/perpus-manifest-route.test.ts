// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/perpusbq/manifest/route';

describe('manifest perpus', () => {
  it('memakai identitas Perpus BQ & tipe manifest', async () => {
    const res = GET();
    expect(res.headers.get('Content-Type')).toBe('application/manifest+json');
    expect(await res.json()).toMatchObject({ name: 'Perpus BQ', start_url: '/', icons: [{ src: '/icons/perpus.svg' }] });
  });
});
