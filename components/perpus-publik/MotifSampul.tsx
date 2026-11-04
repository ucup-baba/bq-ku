import type { DesainSampul } from '@/lib/perpus/sampul-motif';

const ulang = (n: number) => Array.from({ length: n }, (_, i) => i);

function bentuk({ motif, aksen, teks }: DesainSampul) {
  switch (motif) {
    case 0: return <><circle cx="190" cy="30" r="52" fill={aksen} /><circle cx="190" cy="30" r="26" fill="none" stroke={teks} strokeWidth="3" /></>;
    case 1: return ulang(7).map(k => <rect key={k} x={120 + k * 18} y={-10 + k * 6} width="9" height="150" fill={aksen} transform="rotate(18 180 60)" />);
    case 2: return ulang(18).map(n => { const x = n % 6, y = Math.floor(n / 6); return <circle key={n} cx={130 + x * 19} cy={16 + y * 19} r="5" fill={(x + y) % 3 ? aksen : teks} />; });
    case 3: return <><path d="M120 70a50 50 0 0 1 100 0z" fill={aksen} /><path d="M150 70a20 20 0 0 1 40 0z" fill={teks} /></>;
    case 4: return ulang(3).map(k => <rect key={k} x={136 + k * 30} y={8 + k * 10} width="30" height="30" rx="6" fill={k % 2 ? teks : aksen} />);
    default: return ulang(4).map(k => <path key={k} d={`M110 ${14 + k * 15}q18 -14 36 0t36 0t36 0`} fill="none" stroke={k % 2 ? teks : aksen} strokeWidth="5" />);
  }
}

/** Motif menempel di kanan atas, jadi tetap terlihat pada sampul lebar maupun tegak. */
export function MotifSampul({ desain }: { desain: DesainSampul }) {
  return (
    <svg viewBox="0 0 228 124" preserveAspectRatio="xMaxYMin slice" aria-hidden className="absolute inset-0 h-full w-full">
      <rect width="228" height="124" fill={desain.latar} />
      {bentuk(desain)}
    </svg>
  );
}
