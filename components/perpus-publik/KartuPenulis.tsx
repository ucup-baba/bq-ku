import { InstagramLogo } from '@phosphor-icons/react/dist/ssr';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import type { Penulis } from '@/lib/perpus/tipe';
import { PALET, gayaWarna } from '@/lib/perpus/warna';

const WARNA_AVATAR = [PALET.periwinkle, PALET.amber, PALET.teal, PALET.terracotta, PALET.lime];

const inisial = (nama: string) => nama.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(k => k[0].toUpperCase()).join('');

export function KartuPenulis({ lang, nama, penulis, jumlah }: { lang: Bahasa; nama: string; penulis?: Penulis; jumlah?: number }) {
  const bio = lang === 'en' ? penulis?.bioEn ?? penulis?.bioId : penulis?.bioId ?? penulis?.bioEn;
  return (
    <div className="p-penulis">
      <span className="p-penulis-avatar" style={gayaWarna(WARNA_AVATAR[nama.length % WARNA_AVATAR.length])}>{inisial(nama)}</span>
      <div className="min-w-0 flex-1 basis-52">
        <p className="font-extrabold leading-snug">
          {nama}
          {jumlah !== undefined && <span className="text-sm font-semibold text-perpus-tinta-lembut"> · {t(lang, 'penulis.jumlah', { n: jumlah })}</span>}
        </p>
        {bio && <p className="line-clamp-3 text-sm text-perpus-tinta-lembut">{bio}</p>}
      </div>
      {penulis?.instagram && (
        <a href={`https://www.instagram.com/${penulis.instagram}/`} target="_blank" rel="noopener noreferrer" aria-label={`Instagram @${penulis.instagram}`} className="p-ig">
          <InstagramLogo size={18} weight="bold" aria-hidden /> <span>Instagram</span>
        </a>
      )}
    </div>
  );
}
