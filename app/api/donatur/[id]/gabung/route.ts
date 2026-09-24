import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { getDonatur, gabungDonatur, HapusDonaturDitolakError } from '@/lib/db/donatur-repo';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

const gabungSchema = z.object({ keId: z.string().trim().min(1, 'Pilih donatur tujuan') });

/** Gabungkan donatur dobel: donasi [id] dipindah ke `keId`, lalu [id] dihapus. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'ADMIN_DONATUR']);
    const { id } = await ctx.params;
    const parsed = gabungSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { keId } = parsed.data;
    if (keId === id) return NextResponse.json({ error: 'Pilih donatur lain sebagai tujuan' }, { status: 400 });
    const [dari, ke] = await Promise.all([getDonatur(supabase, id), getDonatur(supabase, keId)]);
    if (!dari || !ke) return NextResponse.json({ error: 'Donatur tidak ditemukan' }, { status: 404 });
    const dipindah = await gabungDonatur(supabase, id, keId);
    return NextResponse.json({ success: true, data: { keId, dipindah } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof HapusDonaturDitolakError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error('Gabung donatur error:', e);
    return NextResponse.json({ error: 'Gagal menggabungkan donatur' }, { status: 500 });
  }
}
