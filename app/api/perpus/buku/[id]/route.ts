import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ubahBuku } from '@/lib/db/perpus-repo';
import { bukuUbahSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = bukuUbahSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await ubahBuku(supabase, id, parsed.data) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof NomorBentrokError) return NextResponse.json({ error: e.message, nomor: e.nomor }, { status: 409 });
    console.error('Ubah buku error:', e);
    return NextResponse.json({ error: 'Gagal mengubah buku' }, { status: 500 });
  }
}
