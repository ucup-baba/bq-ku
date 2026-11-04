import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listAnggota } from '@/lib/db/perpus-pinjaman-repo';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listAnggota(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List anggota error:', e);
    return NextResponse.json({ error: 'Gagal memuat anggota' }, { status: 500 });
  }
}
