'use client';
import { useEffect, useState } from 'react';
import { INTRO_KEY } from '@/lib/intro';

const DURATION_MS = 2150; // animasi + keluar; setelahnya elemen dilepas

// Intro pembuka: menyambung dari layar pembuka PWA (latar #0F231F + logo), sekali per sesi. Ketuk untuk lewati.
export function IntroSplash() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.intro === 'skip') return; // tersembunyi lewat CSS
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* abaikan */ }
    const t = setTimeout(() => setGone(true), DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;
  const skip = () => { setLeaving(true); setTimeout(() => setGone(true), 260); };

  return (
    <div className={`intro${leaving ? ' leaving' : ''}`} aria-hidden="true" onClick={skip}>
      <div className="intro-stage">
        <svg className="intro-scribble" viewBox="0 0 260 260" fill="none" preserveAspectRatio="none">
          <path pathLength="1" d="M131 22c58-3 106 40 107 101 2 64-47 113-110 112C66 234 20 187 22 126 24 66 70 26 133 25c40 0 71 16 91 42" />
        </svg>
        <svg className="intro-sparks" viewBox="0 0 260 260" fill="none">
          <path d="M226 36l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" />
          <path d="M34 196l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
          <path d="M40 44l-10 18h12l-8 18" />
          <path d="M214 212c6 4 14 4 20 0" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="intro-logo" src="/icons/icon-512.png" alt="" width={260} height={260} />
      </div>
      <p className="intro-text"><b>BQ-ku</b><small>Baitul Qowwam</small></p>
    </div>
  );
}
