'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowClockwise, WifiSlash } from '@phosphor-icons/react';
import { pasangPendengarInstal } from './usePasangAplikasi';

/**
 * Mendaftarkan service worker (produksi saja), menampilkan penanda offline, memuat ulang
 * data saat sinyal kembali, dan menawarkan "Versi baru tersedia" setelah deploy.
 */
export function PwaKlien() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [menunggu, setMenunggu] = useState<ServiceWorker | null>(null);
  const muatUlangDiminta = useRef(false);

  useEffect(() => { pasangPendengarInstal(); }, []);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const keOffline = () => setOffline(true);
    const keOnline = () => { setOffline(false); router.refresh(); };
    window.addEventListener('offline', keOffline);
    window.addEventListener('online', keOnline);
    return () => { window.removeEventListener('offline', keOffline); window.removeEventListener('online', keOnline); };
  }, [router]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const pantau = (r: ServiceWorkerRegistration) => {
      // Worker baru yang terpasang saat sudah ada controller = pembaruan (bukan pemasangan pertama).
      if (r.waiting && navigator.serviceWorker.controller) setMenunggu(r.waiting);
      r.addEventListener('updatefound', () => {
        const baru = r.installing;
        baru?.addEventListener('statechange', () => {
          if (baru.state === 'installed' && navigator.serviceWorker.controller) setMenunggu(baru);
        });
      });
    };
    const gantiController = () => { if (muatUlangDiminta.current) window.location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', gantiController);
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(r => { reg = r; pantau(r); }).catch(() => {});
    // Cek versi baru saat aplikasi dibuka lagi dari latar belakang.
    const cek = () => { if (document.visibilityState === 'visible') reg?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', cek);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', gantiController);
      document.removeEventListener('visibilitychange', cek);
    };
  }, []);

  const perbarui = () => {
    if (!menunggu) return;
    muatUlangDiminta.current = true;
    menunggu.postMessage('SKIP_WAITING');
  };

  return (
    <>
      {offline && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
          <span className="animate-halaman inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-angkat dark:bg-slate-100 dark:text-slate-900">
            <WifiSlash size={16} weight="bold" aria-hidden="true" /> Offline — data belum bisa diperbarui
          </span>
        </div>
      )}
      {menunggu && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-6">
          <div className="animate-halaman flex w-full max-w-sm items-center gap-3 rounded-2xl border border-bq-garis bg-bq-surface p-3 pl-4 shadow-angkat">
            <p className="min-w-0 flex-1 text-sm font-bold text-bq-tinta">Versi baru tersedia</p>
            <button type="button" onClick={perbarui}
              className="tekan inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0E9F54] px-3.5 text-xs font-bold text-white hover:bg-[#0c8a49]">
              <ArrowClockwise size={16} weight="bold" aria-hidden="true" /> Muat ulang
            </button>
          </div>
        </div>
      )}
    </>
  );
}
