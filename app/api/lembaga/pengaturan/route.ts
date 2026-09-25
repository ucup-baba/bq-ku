import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { getPengaturanKelola, setPengaturanKelola } from '@/lib/db/berkas-lembaga-repo';
import { validationResponse } from '@/lib/validation/errors';

/** Saklar "Pengurus boleh mengelola berkas lembaga". Baca: Superadmin & Pengurus; ubah: Superadmin. */
export async function GET() {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'PENGURUS']);
    return NextResponse.json({ success: true, data: { pengurusKelolaBerkas: await getPengaturanKelola(supabase) } });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat pengaturan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, supabase } = await requireUser(['SUPERADMIN']);
    const parsed = z.object({ pengurusKelolaBerkas: z.boolean() }).safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    await setPengaturanKelola(supabase, parsed.data.pengurusKelolaBerkas, user.id);
    return NextResponse.json({ success: true, data: parsed.data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Simpan pengaturan error:', e);
    return NextResponse.json({ error: e.message || 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
