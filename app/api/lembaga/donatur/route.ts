import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonatur } from '@/lib/db/donatur-repo';

/** Daftar donatur untuk Ruang Lembaga (baca saja). */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const q = new URL(req.url).searchParams.get('q') || undefined;
    return NextResponse.json({ success: true, data: await listDonatur(supabase, q) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List donatur (lembaga) error:', e);
    return NextResponse.json({ error: 'Gagal memuat donatur' }, { status: 500 });
  }
}
