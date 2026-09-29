import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { validationResponse } from '@/lib/validation/errors';
import { skemaSetelanAi } from '@/lib/ai/model';
import { bacaSetelanAi, simpanSetelanAi, statusKunci, type DataHalamanAi } from '@/lib/ai/setelan';
import { ambilRingkasanPemakaian } from '@/lib/ai/pemakaian';

/** Setelan AI & ringkasan pemakaian. Baca & ubah: Superadmin. */
export async function GET() {
  try {
    await requireUser(['SUPERADMIN']);
    const data: DataHalamanAi = { setelan: await bacaSetelanAi(), kunci: statusKunci(), ringkasan: await ambilRingkasanPemakaian() };
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Muat setelan AI error:', e);
    return NextResponse.json({ error: e.message || 'Gagal memuat setelan AI' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, supabase } = await requireUser(['SUPERADMIN']);
    const parsed = skemaSetelanAi.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    await simpanSetelanAi(supabase, parsed.data, user.id);
    return NextResponse.json({ success: true, data: parsed.data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Simpan setelan AI error:', e);
    return NextResponse.json({ error: e.message || 'Gagal menyimpan setelan AI' }, { status: 500 });
  }
}
