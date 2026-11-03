import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonasi, tambahDonasi } from '@/lib/db/perpus-repo';
import { donasiPerpusSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listDonasi(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List donasi perpus error:', e);
    return NextResponse.json({ error: 'Gagal memuat donasi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const parsed = donasiPerpusSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await tambahDonasi(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Tambah donasi perpus error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan donasi' }, { status: 500 });
  }
}
