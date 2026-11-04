import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { aksiAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { aksiAnggotaSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireMasuk();
    const { id } = await params;
    const parsed = aksiAnggotaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await aksiAnggota(supabase, id, parsed.data.aksi) });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Aksi pinjaman anggota error:', e);
    return NextResponse.json({ error: 'Gagal memproses pinjaman' }, { status: 500 });
  }
}
