import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilRingkasan, kosongkanPerpus, simpanRencana } from '@/lib/db/perpus-repo';
import { ambilRencanaDariSheets } from '@/lib/perpus/sumber';

export const maxDuration = 60;

/** Pratinjau impor: hitungan & judul yang tidak tertaut, tanpa menulis apa pun. */
export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    const [r, ringkas] = await Promise.all([ambilRencanaDariSheets(), ambilRingkasan(supabase)]);
    return NextResponse.json({ success: true, data: {
      buku: r.buku.length, donasi: r.donasi.length, pengadaan: r.pengadaan.length,
      perluAudit: r.buku.filter(b => b.catatanAudit).length, tidakCocok: r.tidakCocok, sudahAda: ringkas.judul,
    } });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Pratinjau impor perpus error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal membaca Google Sheets' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const ulang = (await req.json().catch(() => ({})))?.ulang === true;
    const { judul } = await ambilRingkasan(supabase);
    if (judul > 0 && !ulang) {
      return NextResponse.json({ error: 'Katalog sudah berisi. Impor ulang akan menghapus data perpus yang ada.' }, { status: 409 });
    }
    if (ulang && judul > 0) {
      if (!user.roles.includes('SUPERADMIN')) {
        return NextResponse.json({ error: 'Impor ulang hanya untuk Superadmin' }, { status: 403 });
      }
      await kosongkanPerpus(supabase);
    }
    const r = await ambilRencanaDariSheets();
    return NextResponse.json({ success: true, data: await simpanRencana(supabase, r, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Impor perpus error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal mengimpor' }, { status: 500 });
  }
}
