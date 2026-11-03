import type { Bahasa } from '@/lib/perpus/ddc';
import { id } from './id';
import { en } from './en';

export type KunciTeks = keyof typeof id;
const KAMUS: Record<Bahasa, Record<KunciTeks, string>> = { id, en };

export function t(lang: Bahasa, kunci: KunciTeks, nilai: Record<string, string | number> = {}): string {
  return KAMUS[lang][kunci].replace(/\{(\w+)\}/g, (_, k: string) => String(nilai[k] ?? ''));
}
