import { NextResponse } from 'next/server';
import { PinjamanError, type KodeGalat } from '@/lib/perpus/pinjaman';

const STATUS_HTTP: Record<KodeGalat, number> = {
  bukan_anggota: 403, diblokir: 403, terlarang: 403,
  buku_tidak_ada: 404, pinjaman_tidak_ada: 404,
  stok_habis: 409, sudah_diajukan: 409, status_tidak_sah: 409,
  tanggal_tidak_sah: 400,
};

export function pinjamanErrorResponse(e: unknown): NextResponse | null {
  if (!(e instanceof PinjamanError)) return null;
  return NextResponse.json({ error: e.message, kode: e.kode, status: e.statusSaatIni }, { status: STATUS_HTTP[e.kode] });
}
