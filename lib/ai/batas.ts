import type { SetelanAi } from './model';
import { hargaTerisi } from './biaya';

export const PESAN_BATAS_AI = 'Batas pemakaian AI tercapai — isi data secara manual.';

export class AiBatasError extends Error {
  readonly kode = 'BATAS_AI' as const;
  constructor(readonly alasan: 'harian' | 'bulanan') { super(PESAN_BATAS_AI); this.name = 'AiBatasError'; }
}

/** Batas lunak: pindai serentak bisa sedikit melewatinya (tanpa penguncian). Plafon Rp aktif hanya bila harga model utama terisi. */
export function cekBatas(p: { pindaiHariIni: number; biayaBulanIni: number }, s: SetelanAi):
  { boleh: true } | { boleh: false; alasan: 'harian' | 'bulanan' } {
  if (p.pindaiHariIni >= s.batasHarian) return { boleh: false, alasan: 'harian' };
  if (hargaTerisi(s.harga[s.utama.model]) && p.biayaBulanIni >= s.plafonBulananRp) return { boleh: false, alasan: 'bulanan' };
  return { boleh: true };
}
