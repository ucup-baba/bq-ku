import { NextRequest, NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { selesaikanSesi } from '@/lib/db/perpus-cek-repo';
import { galatCek } from '@/lib/perpus/cek-respon';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const { id } = await params;
    return NextResponse.json({ success: true, data: await selesaikanSesi(supabase, id, user.id) });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal menyelesaikan cek bulanan');
  }
}
