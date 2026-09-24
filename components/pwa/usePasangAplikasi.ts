'use client';
import { useEffect, useSyncExternalStore } from 'react';

/** Event Chrome/Edge/Android sebelum menampilkan dialog pasang (belum ada di lib DOM TypeScript). */
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// Event bisa datang sebelum halaman Akun dibuka → ditangkap sekali di tingkat modul (lihat PwaKlien).
let tawaran: BeforeInstallPromptEvent | null = null;
let terpasang = false;
const pendengar = new Set<() => void>();
const kabari = () => pendengar.forEach(f => f());

let dipasang = false;
/** Dipanggil sekali dari PwaKlien agar event tidak terlewat. */
export function pasangPendengarInstal(): void {
  if (dipasang || typeof window === 'undefined') return;
  dipasang = true;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); tawaran = e as BeforeInstallPromptEvent; kabari(); });
  window.addEventListener('appinstalled', () => { terpasang = true; tawaran = null; kabari(); });
}

/** Sedang berjalan sebagai aplikasi terpasang (bukan tab browser). */
export function modeAplikasi(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone/iPad (Safari tidak punya dialog pasang; harus lewat Bagikan → Tambahkan ke Layar Utama). */
export function perangkatIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export type StatusPasang = 'tersembunyi' | 'bisa-dipasang' | 'ios';

/** Status tanpa efek samping, mudah dites. */
export function statusPasang(o: { modeAplikasi: boolean; terpasang: boolean; adaTawaran: boolean; ios: boolean }): StatusPasang {
  if (o.modeAplikasi || o.terpasang) return 'tersembunyi';
  if (o.adaTawaran) return 'bisa-dipasang';
  if (o.ios) return 'ios';
  return 'tersembunyi';
}

const langganan = (f: () => void) => { pendengar.add(f); return () => { pendengar.delete(f); }; };
const snapshot = () => statusPasang({ modeAplikasi: modeAplikasi(), terpasang, adaTawaran: !!tawaran, ios: perangkatIos() });

export function usePasangAplikasi() {
  useEffect(() => { pasangPendengarInstal(); }, []);
  const status = useSyncExternalStore(langganan, snapshot, () => 'tersembunyi' as StatusPasang);
  const pasang = async () => {
    if (!tawaran) return;
    const t = tawaran;
    await t.prompt();
    const { outcome } = await t.userChoice;
    tawaran = null; // satu event hanya bisa dipakai sekali
    if (outcome === 'accepted') terpasang = true;
    kabari();
  };
  return { status, pasang };
}
