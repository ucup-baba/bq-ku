import 'server-only';
import { keVideo, type ItemVideo, type Video } from './video';

export const KANAL = 'https://www.youtube.com/channel/UCp3PWQTp3E9nnJ5d-9XQJCw';
/** Daftar unggahan kanal: 1 unit kuota per panggilan, sedangkan `search.list` 100 unit. */
export const UPLOADS = 'UUp3PWQTp3E9nnJ5d-9XQJCw';
export const REVALIDATE_DETIK = 1800;
const API = 'https://www.googleapis.com/youtube/v3';

async function panggil<T>(jalur: string, param: Record<string, string>, key: string): Promise<T> {
  const url = `${API}/${jalur}?${new URLSearchParams({ ...param, key })}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_DETIK } });
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  return res.json();
}

/** Null bila key belum diset. Galat API dilempar agar halaman terakhir yang berhasil tetap tampil (ISR). */
export async function ambilVideoKanal(): Promise<Video[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const daftar = await panggil<{ items: { contentDetails: { videoId: string } }[] }>(
    'playlistItems', { part: 'contentDetails', playlistId: UPLOADS, maxResults: '50' }, key,
  );
  const id = daftar.items.map(i => i.contentDetails.videoId);
  if (id.length === 0) return [];
  const rinci = await panggil<{ items: ItemVideo[] }>('videos', { part: 'snippet,contentDetails,status', id: id.join(',') }, key);
  // videos.list tidak menjamin urutan; daftar unggahan sudah terbaru dulu.
  const urutan = new Map(id.map((v, i) => [v, i]));
  return rinci.items
    .sort((a, b) => urutan.get(a.id)! - urutan.get(b.id)!)
    .map(keVideo)
    .filter(v => v !== null);
}
