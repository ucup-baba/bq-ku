import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilRingkasan } from '@/lib/db/perpus-repo';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await ambilRingkasan(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ringkasan perpus error:', e);
    return NextResponse.json({ error: 'Gagal memuat ringkasan' }, { status: 500 });
  }
}
