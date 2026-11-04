import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { terapkanAksi } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { aksiPustakawanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = aksiPustakawanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await terapkanAksi(supabase, id, parsed.data, user.id) });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Aksi pinjaman error:', e);
    return NextResponse.json({ error: 'Gagal memproses pinjaman' }, { status: 500 });
  }
}
