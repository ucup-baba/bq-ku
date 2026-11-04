import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listPenulisAdmin, simpanPenulis } from '@/lib/db/perpus-penulis-repo';
import { penulisSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listPenulisAdmin(supabase) });
  } catch (e: unknown) {
    const res = authErrorResponse(e);
    if (res) return res;
    console.error('List penulis error:', e);
    return NextResponse.json({ error: 'Gagal memuat penulis' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const parsed = penulisSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await simpanPenulis(supabase, parsed.data) });
  } catch (e: unknown) {
    const res = authErrorResponse(e);
    if (res) return res;
    console.error('Simpan penulis error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan penulis' }, { status: 500 });
  }
}
