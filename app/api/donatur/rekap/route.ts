import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { rekap } from '@/lib/db/donatur-repo';
import { rekapQuerySchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const parsed = rekapQuerySchema.safeParse({ dari: p.get('dari'), sampai: p.get('sampai') });
    if (!parsed.success) return validationResponse(parsed.error);
    const data = await rekap(supabase, parsed.data.dari, parsed.data.sampai);
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Rekap donasi error:', e);
    return NextResponse.json({ error: 'Gagal memuat rekap donasi' }, { status: 500 });
  }
}
