import { ImageResponse } from 'next/og';
import { NextResponse, after, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, setSuratStoragePath } from '@/lib/db/donatur-repo';
import { buildSuratData } from '@/lib/surat/data';
import { loadSuratAssets, loadSuratFonts } from '@/lib/surat/assets';
import { SuratTemplate } from '@/components/donatur/SuratTemplate';
import { pathPngSurat } from '@/lib/surat/path-png';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
    const path = pathPngSurat(surat.nomorSurat, surat.tanggalSurat);
    // Nama berkas untuk header disaring dari karakter selain [A-Za-z0-9._-]
    // agar tidak menyisipkan karakter tak terduga ke header HTTP.
    const namaBerkas = `${surat.nomorSurat.replace(/\//g, '-')}.png`.replace(/[^A-Za-z0-9._-]/g, '_');
    const kirim = (png: Uint8Array) => new NextResponse(png as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${namaBerkas}"`,
        // Isi surat tidak berubah setelah dibuat → aman di-cache sehari di browser.
        'Cache-Control': 'private, max-age=86400',
      },
    });

    // Sudah pernah dirender dengan template versi ini → kirim dari storage tanpa render ulang.
    if (surat.storagePath === path) {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (!error && data) return kirim(new Uint8Array(await data.arrayBuffer()));
      console.error('PNG surat di storage tidak bisa diunduh, dirender ulang', { suratId: id, path, error: error?.message });
    }

    const [assets, fonts] = await Promise.all([loadSuratAssets(), loadSuratFonts()]);
    const image = new ImageResponse(
      <SuratTemplate data={buildSuratData(surat)} assets={assets} />,
      { width: 1240, height: 1754, fonts },
    );
    const png = new Uint8Array(await image.arrayBuffer());

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

    return kirim(png);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal membuat gambar surat', e);
    return NextResponse.json({ error: 'Gagal membuat gambar surat' }, { status: 500 });
  }
}
