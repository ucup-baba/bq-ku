import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { listCatatanku } from '@/lib/db/perpus-catatan-repo';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';

export async function GET() {
  try {
    const { supabase } = await requireMasuk();
    return NextResponse.json({ success: true, data: await listCatatanku(supabase) });
  } catch (e: unknown) {
    const res = authErrorResponse(e);
    if (res) return res;
    console.error('Catatanku error:', e);
    return NextResponse.json({ error: 'Gagal memuat catatan' }, { status: 500 });
  }
}
