import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { cabutTautan, catatAkses } from '@/lib/db/berkas-lembaga-repo';
import { konteksBerkas, tolak, PESAN_KELOLA_MATI } from '@/lib/lembaga/konteks-berkas';

/** Cabut tautan: langsung tidak berlaku bagi penerima. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, hak } = await konteksBerkas();
    if (!hak.kelola) return tolak(PESAN_KELOLA_MATI);
    const { id } = await ctx.params;
    const berhasil = await cabutTautan(supabase, id);
    if (!berhasil) return NextResponse.json({ error: 'Tautan tidak ditemukan atau sudah dicabut' }, { status: 404 });
    await catatAkses(supabase, 'CABUT_TAUTAN', { tautanId: id });
    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Cabut tautan error:', e);
    return NextResponse.json({ error: 'Gagal mencabut tautan' }, { status: 500 });
  }
}
