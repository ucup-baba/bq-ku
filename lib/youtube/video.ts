export const BATAS_CUPLIKAN_DETIK = 180;

export type Video = { id: string; judul: string; thumbnail: string; terbitAt: string; durasi: number };

type Thumbnail = { url: string };
/** Bentuk yang dipakai dari jawaban `videos.list` YouTube Data API. */
export type ItemVideo = {
  id: string;
  snippet: {
    title: string; publishedAt: string; liveBroadcastContent: string;
    thumbnails: { medium?: Thumbnail; high?: Thumbnail };
  };
  contentDetails: { duration: string };
  status: { embeddable: boolean; privacyStatus: string };
};

export function durasiDetik(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export function labelDurasi(detik: number): string {
  const dua = (n: number) => String(n).padStart(2, '0');
  const [j, m, d] = [Math.floor(detik / 3600), Math.floor(detik / 60) % 60, detik % 60];
  return j ? `${j}:${dua(m)}:${dua(d)}` : `${m}:${dua(d)}`;
}

/** Null untuk video yang tidak bisa diputar di situs: siaran langsung, tidak publik, atau sematan dimatikan. */
export function keVideo(i: ItemVideo): Video | null {
  if (i.snippet.liveBroadcastContent !== 'none' || !i.status.embeddable || i.status.privacyStatus !== 'public') return null;
  return {
    id: i.id,
    judul: i.snippet.title,
    thumbnail: i.snippet.thumbnails.high?.url ?? i.snippet.thumbnails.medium?.url ?? '',
    terbitAt: i.snippet.publishedAt,
    durasi: durasiDetik(i.contentDetails.duration),
  };
}

export function pisahVideo(video: Video[]) {
  return {
    kajian: video.filter(v => v.durasi > BATAS_CUPLIKAN_DETIK),
    cuplikan: video.filter(v => v.durasi <= BATAS_CUPLIKAN_DETIK),
  };
}
