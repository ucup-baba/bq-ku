import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonasi, createDonasi } from '@/lib/db/donatur-repo';
import { donasiSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const data = await listDonasi(supabase, {
      dari: p.get('dari') || undefined,
      sampai: p.get('sampai') || undefined,
      donaturId: p.get('donaturId') || undefined,
      limit: p.get('limit') ? Number(p.get('limit')) : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat donasi: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRoom('donatur');
    const parsed = donasiSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await createDonasi(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menyimpan donasi: ' + e.message }, { status: 500 });
  }
}
