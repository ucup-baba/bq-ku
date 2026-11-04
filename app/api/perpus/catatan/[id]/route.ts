import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { moderasiCatatan } from '@/lib/db/perpus-catatan-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { moderasiSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN']);
    const { id } = await params;
    const parsed = moderasiSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    await moderasiCatatan(supabase, id, parsed.data.alasan);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Moderasi catatan error:', e);
    return NextResponse.json({ error: 'Gagal menghapus catatan' }, { status: 500 });
  }
}
