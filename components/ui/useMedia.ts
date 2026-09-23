'use client';
import { useSyncExternalStore } from 'react';

/** true bila media query cocok. Saat SSR/hidrasi selalu false (tata letak HP dulu). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onUbah) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onUbah);
      return () => mq.removeEventListener('change', onUbah);
    },
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches,
    () => false,
  );
}
