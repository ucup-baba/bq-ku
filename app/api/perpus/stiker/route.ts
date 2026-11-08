import { NextRequest, NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { listBukuStiker } from '@/lib/db/perpus-cek-repo';
import { galatCek } from '@/lib/perpus/cek-respon';
import { susunStikerPdf, urlStiker } from '@/lib/perpus/stiker-pdf';

/** Stiker QR A3, satu per eksemplar. Nomor sementara (TMP/AUDIT) dilewati: selesaikan audit dulu. */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const pilih = new URL(req.url).searchParams.get('buku')?.split(',').filter(Boolean);
    const isi = (await listBukuStiker(supabase))
      .filter(b => !/^(TMP|AUDIT)-/.test(b.nomorPanggil) && (!pilih || pilih.includes(b.id)))
      .flatMap(b => Array.from({ length: b.eksemplar }, () => ({ nomor: b.nomorPanggil, url: urlStiker(b.id.slice(0, 8)) })));
    return new NextResponse(Buffer.from(await susunStikerPdf(isi)), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="stiker-qr-perpus-a3.pdf"',
        'X-Jumlah-Stiker': String(isi.length),
      },
    });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal menyusun stiker');
  }
}
