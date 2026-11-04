import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { hapusCatatan, tutupPemberitahuan } from '@/lib/db/perpus-catatan-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';

type Ctx = { params: Promise<{ id: string }> };

async function jalankan(ctx: Ctx, aksi: typeof hapusCatatan) {
  try {
    const { supabase } = await requireMasuk();
    const { id } = await ctx.params;
    await aksi(supabase, id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Catatan error:', e);
    return NextResponse.json({ error: 'Gagal memproses catatan' }, { status: 500 });
  }
}

export const DELETE = (_req: NextRequest, ctx: Ctx) => jalankan(ctx, hapusCatatan);

/** Menutup pemberitahuan bahwa catatan dihapus admin. */
export const PATCH = (_req: NextRequest, ctx: Ctx) => jalankan(ctx, tutupPemberitahuan);
