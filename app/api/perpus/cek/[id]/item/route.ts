import { NextRequest, NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { hapusItem, simpanItem } from '@/lib/db/perpus-cek-repo';
import { galatCek } from '@/lib/perpus/cek-respon';
import { cekItemSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = cekItemSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await simpanItem(supabase, id, parsed.data, user.id) });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal menyimpan hasil cek');
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const buku = new URL(req.url).searchParams.get('buku');
    if (!buku) return NextResponse.json({ error: 'Buku wajib diisi' }, { status: 400 });
    await hapusItem(supabase, id, buku);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return galatCek(e, 'Gagal membatalkan hasil cek');
  }
}
