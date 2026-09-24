import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, requireUser, authErrorResponse } from '@/lib/auth/session';
import { getDonatur, updateDonatur, hapusDonatur, DonaturPunyaDonasiError, HapusDonaturDitolakError } from '@/lib/db/donatur-repo';
import { donaturUpdateSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const donatur = await getDonatur(supabase, id);
    if (!donatur) return NextResponse.json({ success: false, error: 'Donatur tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: donatur });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Get donatur error:', e);
    return NextResponse.json({ error: 'Gagal memuat donatur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const parsed = donaturUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await updateDonatur(supabase, id, parsed.data) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Update donatur error:', e);
    return NextResponse.json({ error: 'Gagal memperbarui donatur' }, { status: 500 });
  }
}

/** Hapus donatur tanpa donasi. Admin Donatur & Superadmin (policy RLS 0009). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'ADMIN_DONATUR']);
    const { id } = await ctx.params;
    await hapusDonatur(supabase, id);
    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof DonaturPunyaDonasiError) {
      return NextResponse.json({ error: e.message, code: 'PUNYA_DONASI', jumlahDonasi: e.jumlah }, { status: 409 });
    }
    if (e instanceof HapusDonaturDitolakError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error('Delete donatur error:', e);
    return NextResponse.json({ error: 'Gagal menghapus donatur' }, { status: 500 });
  }
}
