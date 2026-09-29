import { twMerge } from 'tailwind-merge';
import { susunKolom } from '@/lib/santri/dinding-foto';

const DURASI_DASAR_DETIK = 46;
const VARIASI = [0, 0.3, -0.2, 0.45, -0.1, 0.2];

/**
 * Dinding foto miring 3D yang berjalan pelan (hiasan, aria-hidden). CSS murni: tiap kolom berisi
 * ubinnya dua kali lalu bergeser -50% agar berulang mulus. Diam saat prefers-reduced-motion.
 */
export function DindingFoto({ foto, kolom = 5, className }: { foto: string[]; kolom?: number; className?: string }) {
  if (foto.length === 0) return null;
  const susunan = susunKolom(foto, kolom, 5);
  return (
    <div aria-hidden="true" className={twMerge('dinding-foto pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="dinding-bidang">
        {susunan.map((isi, k) => (
          <div key={k} className="dinding-kolom" style={{
            animationDuration: `${Math.round(DURASI_DASAR_DETIK * (1 + VARIASI[k % VARIASI.length]))}s`,
            animationDirection: k % 2 ? 'reverse' : 'normal',
          }}>
            {[...isi, ...isi].map((src, j) => (
              <span key={j} className="dinding-ubin">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
