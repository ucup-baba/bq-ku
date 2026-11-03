import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listBuku, tambahBuku } from '@/lib/db/perpus-repo';
import { bukuSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';
import type { StatusKode } from '@/lib/perpus/tipe';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const p = new URL(req.url).searchParams;
    const status = p.get('status');
    const statusKode = status === 'baku' || status === 'perlu_audit' ? (status as StatusKode) : undefined;
    return NextResponse.json({ success: true, data: await listBuku(supabase, { q: p.get('q') || undefined, statusKode }) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List buku error:', e);
    return NextResponse.json({ error: 'Gagal memuat buku' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const parsed = bukuSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await tambahBuku(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof NomorBentrokError) return NextResponse.json({ error: e.message, nomor: e.nomor }, { status: 409 });
    console.error('Tambah buku error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan buku' }, { status: 500 });
  }
}
