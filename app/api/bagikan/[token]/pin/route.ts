import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cocokPin } from '@/lib/bagikan/keamanan';
import {
  cariTautan, masihBerlaku, batasHabis, terkunciPin, bukaTautan, pasangSesi, catatPublik, catatPinGagal, resetPinGagal,
} from '@/lib/bagikan/tautan-publik';
import { HEADER_AMAN, tidakBerlaku } from '@/lib/bagikan/respons';

/** Verifikasi PIN. Salah 5× → terkunci 15 menit. Benar → hitung buka + cookie sesi. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const t = await cariTautan(token);
  if (!t || !masihBerlaku(t) || batasHabis(t)) return tidakBerlaku();
  if (!t.pinHash) return NextResponse.json({ success: true }, { headers: HEADER_AMAN });
  if (terkunciPin(t)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.', terkunciSampai: t.pinTerkunciSampai }, { status: 429, headers: HEADER_AMAN });
  }
  const parsed = z.object({ pin: z.string().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !(await cocokPin(parsed.data.pin, t.pinHash))) {
    const sisa = await catatPinGagal(t.id);
    await catatPublik(req, 'PIN_SALAH', { tautanId: t.id, rincian: sisa === 0 ? 'terkunci 15 menit' : `sisa ${sisa}` });
    return sisa === 0
      ? NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }, { status: 429, headers: HEADER_AMAN })
      : NextResponse.json({ error: `PIN salah. Sisa ${sisa} percobaan.`, sisa }, { status: 401, headers: HEADER_AMAN });
  }
  await resetPinGagal(t.id);
  if (!(await bukaTautan(t.id))) return tidakBerlaku();
  const res = NextResponse.json({ success: true }, { headers: HEADER_AMAN });
  pasangSesi(res, t);
  await catatPublik(req, 'BUKA_TAUTAN', { tautanId: t.id, rincian: 'dengan PIN' });
  return res;
}
