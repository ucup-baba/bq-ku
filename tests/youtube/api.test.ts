// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));

import { ambilVideoKanal, UPLOADS } from '@/lib/youtube/api';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => { vi.stubEnv('YOUTUBE_API_KEY', 'k'); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const video = (id: string) => ({
  id, snippet: { title: id, publishedAt: `2026-11-0${id}T00:00:00Z`, liveBroadcastContent: 'none', thumbnails: { high: { url: 'h' } } },
  contentDetails: { duration: 'PT5M' }, status: { embeddable: true, privacyStatus: 'public' },
});

describe('ambilVideoKanal', () => {
  it('tanpa key = null, tanpa memanggil API', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    expect(await ambilVideoKanal()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('memakai daftar unggahan, bukan pencarian, dan mengikuti urutannya', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok({ items: [{ contentDetails: { videoId: '2' } }, { contentDetails: { videoId: '1' } }] }) as never)
      .mockResolvedValueOnce(ok({ items: [video('1'), video('2')] }) as never);
    const r = await ambilVideoKanal();
    expect(r?.map(v => v.id)).toEqual(['2', '1']);
    const [url1, opsi] = vi.mocked(fetch).mock.calls[0] as [string, { next: { revalidate: number } }];
    expect(url1).toContain('/playlistItems?');
    expect(url1).toContain(`playlistId=${UPLOADS}`);
    expect(url1).not.toContain('/search');
    expect(opsi.next.revalidate).toBe(1800);
  });
  it('API gagal melempar galat tanpa membocorkan key', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as never);
    await expect(ambilVideoKanal()).rejects.toThrow('YouTube API 403');
    await expect(ambilVideoKanal()).rejects.not.toThrow('k=');
  });
  it('kanal kosong = daftar kosong', async () => {
    vi.mocked(fetch).mockResolvedValue(ok({ items: [] }) as never);
    expect(await ambilVideoKanal()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
