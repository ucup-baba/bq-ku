import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, markSuratTerkirim } from '@/lib/db/donatur-repo';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = z.object({ terkirimWa: z.literal(true) }).strict();

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: surat });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Get surat error:', e);
    return NextResponse.json({ error: 'Gagal memuat surat' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await markSuratTerkirim(supabase, id) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Mark surat terkirim error:', e);
    return NextResponse.json({ error: 'Gagal menandai surat' }, { status: 500 });
  }
}
