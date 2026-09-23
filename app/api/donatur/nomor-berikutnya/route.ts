import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { peekNomorUrut } from '@/lib/db/donatur-repo';
import { formatNomorSurat } from '@/lib/utils/nomor-surat';

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const tanggal = new URL(req.url).searchParams.get('tanggal') || new Date().toISOString().slice(0, 10);
    if (!TANGGAL_RE.test(tanggal) || Number.isNaN(Date.parse(tanggal))) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const d = new Date(tanggal + 'T00:00:00');
    const urut = await peekNomorUrut(supabase, d.getFullYear(), d.getMonth() + 1);
    return NextResponse.json({ success: true, data: { urut, nomor: formatNomorSurat(urut, d) } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Nomor berikutnya error:', e);
    return NextResponse.json({ error: 'Gagal mengambil nomor surat' }, { status: 500 });
  }
}
