import { NextResponse, after, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, setSuratStoragePath } from '@/lib/db/donatur-repo';
import { pathPngSurat } from '@/lib/surat/path-png';
import { renderPngSurat, responsPng } from '@/lib/surat/render-png';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
    const path = pathPngSurat(surat.nomorSurat, surat.tanggalSurat);

    // Sudah pernah dirender dengan template versi ini → kirim dari storage tanpa render ulang.
    if (surat.storagePath === path) {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (!error && data) return responsPng(new Uint8Array(await data.arrayBuffer()), surat.nomorSurat);
      console.error('PNG surat di storage tidak bisa diunduh, dirender ulang', { suratId: id, path, error: error?.message });
    }

    const png = await renderPngSurat(surat);

    // Simpan ke bucket privat SETELAH respons terkirim, agar pengguna tidak ikut menunggu unggahan.
    after(async () => {
      const { error: upErr } = await supabase.storage.from(bucket)
        .upload(path, png, { contentType: 'image/png', upsert: true });
      if (upErr) {
        // Jangan diam-diam: kegagalan menyimpan (mis. policy storage menolak) harus terlihat di log server.
        console.error('Gagal menyimpan PNG surat ke storage', { suratId: id, path, error: upErr.message });
        return;
      }
      await setSuratStoragePath(supabase, id, path);
    });

    return responsPng(png, surat.nomorSurat);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal membuat gambar surat', e);
    return NextResponse.json({ error: 'Gagal membuat gambar surat' }, { status: 500 });
  }
}
