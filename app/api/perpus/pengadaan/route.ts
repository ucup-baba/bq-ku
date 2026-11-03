import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listPengadaan, tambahPengadaan } from '@/lib/db/perpus-repo';
import { pengadaanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listPengadaan(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List pengadaan error:', e);
    return NextResponse.json({ error: 'Gagal memuat pengadaan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const parsed = pengadaanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await tambahPengadaan(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Tambah pengadaan error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan pengadaan' }, { status: 500 });
  }
}
