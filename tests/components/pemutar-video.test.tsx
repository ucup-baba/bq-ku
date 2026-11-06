import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PemutarVideo } from '@/components/perpus-publik/PemutarVideo';

const video = { id: 'abc', judul: 'Kajian Ihya', thumbnail: 'https://i.ytimg.com/a.jpg', terbitAt: '2026-11-05T01:00:00Z', durasi: 3000 };

describe('PemutarVideo', () => {
  it('awalnya thumbnail, belum memuat iframe YouTube', () => {
    const html = renderToStaticMarkup(<PemutarVideo lang="id" video={video} />);
    expect(html).toContain('i.ytimg.com/a.jpg');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('50:00');
    expect(html).toContain('Putar video: Kajian Ihya');
  });
});
