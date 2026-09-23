'use client';
import { useEffect, useRef } from 'react';
import { gambarGaris } from '@/lib/ui/animasi';

/** Menggambar semua elemen ber-atribut data-doodle-garis di dalamnya saat pertama terlihat. */
export function DoodleGambar({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const garis = Array.from(el.querySelectorAll<SVGGeometryElement>('[data-doodle-garis]'));
    if (typeof IntersectionObserver === 'undefined') { gambarGaris(garis); return; }
    const io = new IntersectionObserver((entri) => {
      if (entri.some(e => e.isIntersecting)) { gambarGaris(garis); io.disconnect(); }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <span ref={ref} className={className}>{children}</span>;
}
