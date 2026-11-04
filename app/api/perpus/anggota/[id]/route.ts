import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ubahAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { ubahAnggotaSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = ubahAnggotaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await ubahAnggota(supabase, id, parsed.data) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ubah anggota error:', e);
    return NextResponse.json({ error: 'Gagal mengubah anggota' }, { status: 500 });
  }
}
