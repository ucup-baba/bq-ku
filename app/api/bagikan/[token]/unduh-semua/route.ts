import { NextRequest, NextResponse } from 'next/server';
import { cariTautan, masihBerlaku, sesiValid, namaCookie, catatPublik, namaUnduhan } from '@/lib/bagikan/tautan-publik';
import { siapkanBerkas } from '@/lib/bagikan/siapkan';
import { buatZip } from '@/lib/bagikan/tanda-air';
import { HEADER_AMAN, tidakBerlaku } from '@/lib/bagikan/respons';

export const runtime = 'nodejs';

/** Semua berkas tautan dalam satu ZIP (masing-masing bertanda air bila diaktifkan). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const t = await cariTautan(token);
  if (!t || !masihBerlaku(t)) return tidakBerlaku();
  if (!sesiValid(t, req.cookies.get(namaCookie(t.id))?.value)) {
    return NextResponse.json({ error: 'Buka tautan terlebih dahulu' }, { status: 401, headers: HEADER_AMAN });
  }
  const berkas = t.berkas.filter(b => b.versi);
  let zip: Uint8Array;
  try {
    zip = buatZip(await Promise.all(berkas.map(async b => ({ nama: namaUnduhan(b), isi: await siapkanBerkas(t, b) }))));
  } catch (e) {
    console.error('Gagal menyiapkan ZIP tautan', { tautanId: t.id, e });
    return NextResponse.json({ error: 'Berkas tidak dapat disiapkan. Silakan hubungi pengirimnya.' }, { status: 422, headers: HEADER_AMAN });
  }
  await Promise.all(berkas.map(b => catatPublik(req, 'UNDUH_TAUTAN', { tautanId: t.id, berkasId: b.id, versiId: b.versi!.id, rincian: 'ZIP' })));
  return new NextResponse(zip as BodyInit, {
    headers: { ...HEADER_AMAN, 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="Berkas Baitul Qowwam.zip"' },
  });
}
