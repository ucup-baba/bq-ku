import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonasi, createDonasi } from '@/lib/db/donatur-repo';
import { donasiSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';
import { isTanggalIso, parseLimit } from '@/lib/validation/query';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const dari = p.get('dari') || undefined;
    const sampai = p.get('sampai') || undefined;
    if (dari && !isTanggalIso(dari)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    if (sampai && !isTanggalIso(sampai)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const limit = parseLimit(p.get('limit'));
    const data = await listDonasi(supabase, {
      dari,
      sampai,
      donaturId: p.get('donaturId') || undefined,
      limit,
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List donasi error:', e);
    return NextResponse.json({ error: 'Gagal memuat donasi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRoom('donatur');
    const parsed = donasiSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await createDonasi(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Create donasi error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan donasi' }, { status: 500 });
  }
}
