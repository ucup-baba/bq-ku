import { describe, it, expect } from 'vitest';
import { t } from '@/lib/perpus/i18n';
import { id } from '@/lib/perpus/i18n/id';
import { en } from '@/lib/perpus/i18n/en';
import { metaHalaman } from '@/lib/perpus/meta';

describe('i18n', () => {
  it('kunci kedua bahasa identik & tidak kosong', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
    for (const v of [...Object.values(id), ...Object.values(en)]) expect(v.trim()).not.toBe('');
  });
  it('mengisi nilai', () => {
    expect(t('id', 'katalog.jumlah', { n: 3 })).toBe('3 judul');
    expect(t('en', 'katalog.jumlah', { n: 3 })).toBe('3 titles');
  });
  it('metaHalaman menyertakan hreflang kedua bahasa', () => {
    const m = metaHalaman('en', '/katalog', 'Catalog');
    expect(m.title).toBe('Catalog');
    expect(m.alternates?.canonical).toBe('/en/katalog');
    expect(m.alternates?.languages).toEqual({ id: '/id/katalog', en: '/en/katalog' });
  });
});
