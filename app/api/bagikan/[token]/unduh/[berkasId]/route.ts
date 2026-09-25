import { NextRequest, NextResponse } from 'next/server';
import { cariTautan, masihBerlaku, sesiValid, namaCookie, catatPublik, namaUnduhan } from '@/lib/bagikan/tautan-publik';
import { siapkanBerkas } from '@/lib/bagikan/siapkan';
import { HEADER_AMAN, tidakBerlaku } from '@/lib/bagikan/respons';

export const runtime = 'nodejs';

/** Buka (?tampil=1) atau unduh satu berkas dari tautan. Butuh cookie sesi hasil buka/PIN. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string; berkasId: string }> }) {
  const { token, berkasId } = await ctx.params;
  const t = await cariTautan(token);
  if (!t || !masihBerlaku(t)) return tidakBerlaku();
  if (!sesiValid(t, req.cookies.get(namaCookie(t.id))?.value)) {
    return NextResponse.json({ error: 'Buka tautan terlebih dahulu' }, { status: 401, headers: HEADER_AMAN });
  }
  const b = t.berkas.find(x => x.id === berkasId);
  if (!b?.versi) return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 404, headers: HEADER_AMAN });
  const tampil = new URL(req.url).searchParams.get('tampil') === '1';
  let isi: Uint8Array;
  try {
    isi = await siapkanBerkas(t, b);
  } catch (e) {
    console.error('Gagal menyiapkan berkas tautan', { tautanId: t.id, berkasId, e });
    return NextResponse.json({ error: 'Berkas tidak dapat disiapkan. Silakan hubungi pengirimnya.' }, { status: 422, headers: HEADER_AMAN });
  }
  await catatPublik(req, 'UNDUH_TAUTAN', { tautanId: t.id, berkasId: b.id, versiId: b.versi.id, rincian: tampil ? 'dibuka' : 'diunduh' });
  return new NextResponse(isi as BodyInit, {
    headers: {
      ...HEADER_AMAN,
      'Content-Type': b.versi.mime,
      'Content-Disposition': `${tampil ? 'inline' : 'attachment'}; filename="${namaUnduhan(b)}"`,
    },
  });
}
