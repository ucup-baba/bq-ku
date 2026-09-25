import 'server-only';
import { tandaAirGambar, tandaAirPdf, teksTandaAir } from '@/lib/bagikan/tanda-air';
import { ambilIsiBerkas, type BerkasPublik, type TautanPublik } from '@/lib/bagikan/tautan-publik';

/** Isi berkas versi terbaru, bertanda air bila tautan memintanya. Gagal menandai → lempar (jangan kirim tanpa tanda air). */
export async function siapkanBerkas(t: TautanPublik, b: BerkasPublik, sekarang = new Date()): Promise<Uint8Array> {
  if (!b.versi) throw new Error('Berkas belum punya versi');
  const isi = await ambilIsiBerkas(b.versi.storagePath);
  if (!t.tandaAir) return isi;
  const teks = teksTandaAir(t.penerima, sekarang);
  return b.versi.mime === 'application/pdf'
    ? tandaAirPdf(isi, teks, `T-${t.id.slice(0, 8).toUpperCase()}`)
    : tandaAirGambar(isi, b.versi.mime, teks);
}
