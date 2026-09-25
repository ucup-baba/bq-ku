import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listSurat } from '@/lib/db/donatur-repo';
import { isTanggalIso, parseLimit } from '@/lib/validation/query';

/** Daftar surat untuk Ruang Lembaga (baca saja). Parameter sama dengan GET /api/donatur/surat. */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const p = new URL(req.url).searchParams;
    const dari = p.get('dari') || undefined;
    const sampai = p.get('sampai') || undefined;
    if ((dari && !isTanggalIso(dari)) || (sampai && !isTanggalIso(sampai))) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const terkirimParam = p.get('terkirim');
    const data = await listSurat(supabase, {
      dari, sampai,
      terkirim: terkirimParam === null ? undefined : terkirimParam === 'true',
      limit: parseLimit(p.get('limit')),
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List surat (lembaga) error:', e);
    return NextResponse.json({ error: 'Gagal memuat surat' }, { status: 500 });
  }
}
