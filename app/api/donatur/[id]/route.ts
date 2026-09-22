import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, requireUser, authErrorResponse } from '@/lib/auth/session';
import { getDonatur, updateDonatur } from '@/lib/db/donatur-repo';
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

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const { count, error: countError } = await supabase
      .from('donasi')
      .select('id', { head: true, count: 'exact' })
      .eq('donaturId', id);
    if (countError) throw countError;
    const { error } = await supabase.from('donatur').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true, data: { id, donasiTerhapus: count ?? 0 } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Delete donatur error:', e);
    return NextResponse.json({ error: 'Gagal menghapus donatur' }, { status: 500 });
  }
}
