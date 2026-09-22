import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonatur, createDonatur } from '@/lib/db/donatur-repo';
import { donaturSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const q = new URL(req.url).searchParams.get('q') || undefined;
    return NextResponse.json({ success: true, data: await listDonatur(supabase, q) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat donatur: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const parsed = donaturSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await createDonatur(supabase, parsed.data) }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menyimpan donatur: ' + e.message }, { status: 500 });
  }
}
