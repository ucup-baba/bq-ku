import { NextRequest, NextResponse } from 'next/server';
import { cariTautan, masihBerlaku, sesiValid, namaCookie, bukaTautan, pasangSesi, catatPublik } from '@/lib/bagikan/tautan-publik';
import { HEADER_AMAN, tidakBerlaku } from '@/lib/bagikan/respons';

/** Buka tautan tanpa PIN: hitung satu kunjungan (atomik, hormati batas) lalu pasang cookie sesi. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const t = await cariTautan(token);
  if (!t || !masihBerlaku(t)) return tidakBerlaku();
  if (t.pinHash) return NextResponse.json({ error: 'PIN diperlukan', perluPin: true }, { status: 401, headers: HEADER_AMAN });
  if (sesiValid(t, req.cookies.get(namaCookie(t.id))?.value)) return NextResponse.json({ success: true }, { headers: HEADER_AMAN });
  if (!(await bukaTautan(t.id))) return tidakBerlaku();
  const res = NextResponse.json({ success: true }, { headers: HEADER_AMAN });
  pasangSesi(res, t);
  await catatPublik(req, 'BUKA_TAUTAN', { tautanId: t.id });
  return res;
}
