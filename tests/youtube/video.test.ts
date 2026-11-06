import { describe, it, expect } from 'vitest';
import { durasiDetik, labelDurasi, keVideo, pisahVideo, type ItemVideo, type Video } from '@/lib/youtube/video';

const item = (o: Partial<{ id: string; durasi: string; live: string; embed: boolean; status: string }> = {}): ItemVideo => ({
  id: o.id ?? 'a',
  snippet: { title: 'Kajian', publishedAt: '2026-11-05T01:00:00Z', liveBroadcastContent: o.live ?? 'none', thumbnails: { medium: { url: 'm.jpg' }, high: { url: 'h.jpg' } } },
  contentDetails: { duration: o.durasi ?? 'PT50M' },
  status: { embeddable: o.embed ?? true, privacyStatus: o.status ?? 'public' },
});

describe('durasiDetik', () => {
  it('jam, menit, detik', () => {
    expect(durasiDetik('PT1H2M3S')).toBe(3723);
    expect(durasiDetik('PT50M')).toBe(3000);
    expect(durasiDetik('PT59S')).toBe(59);
  });
  it('bentuk tak dikenal = 0', () => {
    expect(durasiDetik('P0D')).toBe(0);
    expect(durasiDetik('')).toBe(0);
  });
});

describe('labelDurasi', () => {
  it('menit:detik, atau jam bila perlu', () => {
    expect(labelDurasi(59)).toBe('0:59');
    expect(labelDurasi(3000)).toBe('50:00');
    expect(labelDurasi(3723)).toBe('1:02:03');
  });
});

describe('keVideo', () => {
  it('memetakan item', () => {
    expect(keVideo(item())).toEqual({ id: 'a', judul: 'Kajian', thumbnail: 'h.jpg', terbitAt: '2026-11-05T01:00:00Z', durasi: 3000 });
  });
  it('melewati siaran langsung, yang tak bisa disematkan, dan yang tidak publik', () => {
    expect(keVideo(item({ live: 'upcoming' }))).toBeNull();
    expect(keVideo(item({ live: 'live' }))).toBeNull();
    expect(keVideo(item({ embed: false }))).toBeNull();
    expect(keVideo(item({ status: 'private' }))).toBeNull();
  });
  it('tanpa thumbnail besar memakai yang ada', () => {
    const i = item();
    i.snippet.thumbnails = { medium: { url: 'm.jpg' } };
    expect(keVideo(i)?.thumbnail).toBe('m.jpg');
  });
});

describe('pisahVideo', () => {
  const v = (id: string, durasi: number) => ({ id, durasi }) as Video;
  it('batasnya 3 menit, urutan dipertahankan', () => {
    const r = pisahVideo([v('a', 30), v('b', 3000), v('c', 180), v('d', 181)]);
    expect(r.cuplikan.map(x => x.id)).toEqual(['a', 'c']);
    expect(r.kajian.map(x => x.id)).toEqual(['b', 'd']);
  });
});
