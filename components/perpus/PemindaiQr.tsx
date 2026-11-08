'use client';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

const JEDA_MS = 200;
const LEBAR_ANALISIS = 480;

/**
 * Kamera belakang + jsQR. Dipakai jsQR, bukan BarcodeDetector, karena BarcodeDetector tidak ada di Safari iPhone.
 * Kamera hanya bisa dibuka di HTTPS atau localhost.
 */
export function PemindaiQr({ onHasil }: { onHasil: (teks: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const kanvas = useRef<HTMLCanvasElement>(null);
  const terakhir = useRef(onHasil);
  terakhir.current = onHasil;
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let aliran: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let berhenti = false;

    const pindai = () => {
      const v = video.current, k = kanvas.current;
      if (berhenti || !v || !k) return;
      if (v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth) {
        k.width = LEBAR_ANALISIS;
        k.height = Math.round((v.videoHeight / v.videoWidth) * LEBAR_ANALISIS);
        const ctx = k.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(v, 0, 0, k.width, k.height);
        const kode = jsQR(ctx.getImageData(0, 0, k.width, k.height).data, k.width, k.height, { inversionAttempts: 'dontInvert' });
        if (kode?.data) terakhir.current(kode.data);
      }
      timer = setTimeout(pindai, JEDA_MS);
    };

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => {
        if (berhenti) { s.getTracks().forEach(t => t.stop()); return; }
        aliran = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
        pindai();
      })
      .catch((e: { name?: string }) => setGalat(e?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser.'
        : 'Kamera tidak bisa dibuka. Pastikan perangkat punya kamera dan situs dibuka lewat HTTPS.'));
    if (!navigator.mediaDevices) setGalat('Browser ini tidak mendukung kamera.');

    return () => { berhenti = true; clearTimeout(timer); aliran?.getTracks().forEach(t => t.stop()); };
  }, []);

  if (galat) return <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{galat}</p>;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover sm:aspect-video" />
      <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" />
      <canvas ref={kanvas} className="hidden" />
    </div>
  );
}
