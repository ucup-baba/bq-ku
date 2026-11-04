import { NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { listCatatanModerasi } from '@/lib/db/perpus-catatan-repo';

export async function GET() {
  try {
    const { supabase } = await requireUser(['SUPERADMIN']);
    return NextResponse.json({ success: true, data: await listCatatanModerasi(supabase) });
  } catch (e: unknown) {
    const res = authErrorResponse(e);
    if (res) return res;
    console.error('List moderasi error:', e);
    return NextResponse.json({ error: 'Gagal memuat catatan' }, { status: 500 });
  }
}
