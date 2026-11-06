'use client';
import { useState } from 'react';
import { Play } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { tanggalPublik } from '@/lib/perpus/format-publik';
import { t } from '@/lib/perpus/i18n';
import { labelDurasi, type Video } from '@/lib/youtube/video';

/** Pemutar YouTube baru dimuat setelah diklik: 50 iframe sekaligus berat untuk HP. */
export function PemutarVideo({ lang, video, className = '' }: { lang: Bahasa; video: Video; className?: string }) {
  const [main, setMain] = useState(false);
  return (
    <article className={`p-buku ${className}`}>
      <div className="relative aspect-video border-b-2 border-perpus-tinta bg-perpus-tinta">
        {main ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} title={video.judul}
            allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
        ) : (
          <button type="button" onClick={() => setMain(true)} aria-label={t(lang, 'video.putar', { judul: video.judul })} className="group absolute inset-0 h-full w-full">
            <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="p-putar"><Play size={22} weight="fill" aria-hidden /></span>
            <span className="p-durasi">{labelDurasi(video.durasi)}</span>
          </button>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 font-extrabold leading-snug">{video.judul}</p>
        <p className="text-xs font-bold text-perpus-tinta-lembut">{tanggalPublik(lang, video.terbitAt.slice(0, 10))}</p>
      </div>
    </article>
  );
}
