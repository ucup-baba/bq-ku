import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, setSuratStoragePath } from '@/lib/db/donatur-repo';
import { buildSuratData } from '@/lib/surat/data';
import { loadSuratAssets, loadSuratFonts } from '@/lib/surat/assets';
import { SuratTemplate } from '@/components/donatur/SuratTemplate';
import { parseNomorSurat } from '@/lib/utils/nomor-surat';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });

    const [assets, fonts] = await Promise.all([loadSuratAssets(), loadSuratFonts()]);
    const image = new ImageResponse(
      <SuratTemplate data={buildSuratData(surat)} assets={assets} />,
      { width: 1240, height: 1754, fonts },
    );
    const png = Buffer.from(await image.arrayBuffer());

    // Simpan ke bucket privat agar bisa diunduh ulang tanpa render berulang
    const parsed = parseNomorSurat(surat.nomorSurat);
    const tahun = parsed?.tahun ?? new Date(surat.tanggalSurat).getFullYear();
    const path = `surat/${tahun}/${surat.nomorSurat.replace(/\//g, '-')}.png`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
    const { error: upErr } = await supabase.storage.from(bucket)
      .upload(path, png, { contentType: 'image/png', upsert: true });
    if (!upErr && surat.storagePath !== path) await setSuratStoragePath(supabase, id, path);

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${surat.nomorSurat.replace(/\//g, '-')}.png"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal membuat gambar surat: ' + e.message }, { status: 500 });
  }
}
