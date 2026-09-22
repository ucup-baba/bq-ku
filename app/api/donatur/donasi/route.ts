import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonasi, createDonasi } from '@/lib/db/donatur-repo';
import { donasiSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

function tanggalValid(v: string): boolean {
  return TANGGAL_RE.test(v) && !Number.isNaN(Date.parse(v));
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const dari = p.get('dari') || undefined;
    const sampai = p.get('sampai') || undefined;
    if (dari && !tanggalValid(dari)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    if (sampai && !tanggalValid(sampai)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const limitRaw = p.get('limit');
    const limitNum = limitRaw ? Number.parseInt(limitRaw, 10) : NaN;
    const limit = Number.isInteger(limitNum) && limitNum >= 1 && limitNum <= 500 ? limitNum : undefined;
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
