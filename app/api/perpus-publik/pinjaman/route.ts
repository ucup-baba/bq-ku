import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { ajukanPinjaman, listPinjamanku } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { ajukanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireMasuk();
    return NextResponse.json({ success: true, data: await listPinjamanku(supabase) });
  } catch (e: unknown) {
    const res = authErrorResponse(e);
    if (res) return res;
    console.error('List pinjamanku error:', e);
    return NextResponse.json({ error: 'Gagal memuat pinjaman' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMasuk();
    const parsed = ajukanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await ajukanPinjaman(supabase, parsed.data.bukuId) }, { status: 201 });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Ajukan pinjaman error:', e);
    return NextResponse.json({ error: 'Gagal mengajukan pinjaman' }, { status: 500 });
  }
}
