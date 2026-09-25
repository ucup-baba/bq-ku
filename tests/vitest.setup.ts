import { vi } from 'vitest';

// next/font hanya jalan di compiler Next; di Vitest setiap font jadi objek kosong.
const fontTiruan = () => ({ className: '', variable: '', style: { fontFamily: '' } });
vi.mock('next/font/google', () => new Proxy({}, {
  // `then` dikecualikan agar modul tidak dianggap Promise.
  has: (_, k) => k !== 'then',
  get: (_, k) => (k === 'then' || typeof k === 'symbol' ? undefined : fontTiruan),
}));
