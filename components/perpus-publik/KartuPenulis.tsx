import { InstagramLogo } from '@phosphor-icons/react/dist/ssr';
import type { Bahasa } from '@/lib/perpus/ddc';
import type { Penulis } from '@/lib/perpus/tipe';

/** Tidak tampil bila belum ada bio maupun Instagram. */
export function KartuPenulis({ lang, penulis, judul }: { lang: Bahasa; penulis: Penulis; judul?: string }) {
  const bio = lang === 'en' ? penulis.bioEn ?? penulis.bioId : penulis.bioId ?? penulis.bioEn;
  if (!bio && !penulis.instagram) return null;
  return (
    <div className="space-y-1">
      {judul && <h2 className="p-h2">{judul}</h2>}
      {bio && <p className="text-sm text-perpus-tinta-lembut">{bio}</p>}
      {penulis.instagram && (
        <a href={`https://www.instagram.com/${penulis.instagram}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2">
          <InstagramLogo size={18} aria-hidden /> @{penulis.instagram}
        </a>
      )}
    </div>
  );
}
