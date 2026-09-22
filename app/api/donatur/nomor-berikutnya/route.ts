import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { nextNomorUrut } from '@/lib/db/donatur-repo';
import { formatNomorSurat } from '@/lib/utils/nomor-surat';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const tanggal = new URL(req.url).searchParams.get('tanggal') || new Date().toISOString().slice(0, 10);
    const d = new Date(tanggal + 'T00:00:00');
    const urut = await nextNomorUrut(supabase, d.getFullYear(), d.getMonth() + 1);
    return NextResponse.json({ success: true, urut, nomor: formatNomorSurat(urut, d) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal mengambil nomor surat: ' + e.message }, { status: 500 });
  }
}
