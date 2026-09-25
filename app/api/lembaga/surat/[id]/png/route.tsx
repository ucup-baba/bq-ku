import { NextResponse, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat } from '@/lib/db/donatur-repo';
import { pathPngSurat } from '@/lib/surat/path-png';
import { renderPngSurat, responsPng } from '@/lib/surat/render-png';

export const runtime = 'nodejs';

/** PNG surat untuk Ruang Lembaga: baca dari storage bila ada; bila belum, render TANPA menyimpan (Pengurus tak punya izin tulis). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });
    const path = pathPngSurat(surat.nomorSurat, surat.tanggalSurat);
    if (surat.storagePath === path) {
      const { data, error } = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').download(path);
      if (!error && data) return responsPng(new Uint8Array(await data.arrayBuffer()), surat.nomorSurat);
    }
    return responsPng(await renderPngSurat(surat), surat.nomorSurat);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal membuat gambar surat (lembaga)', e);
    return NextResponse.json({ error: 'Gagal membuat gambar surat' }, { status: 500 });
  }
}
