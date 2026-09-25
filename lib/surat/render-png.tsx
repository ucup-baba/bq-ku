import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';
import { buildSuratData } from '@/lib/surat/data';
import { loadSuratAssets, loadSuratFonts } from '@/lib/surat/assets';
import { SuratTemplate } from '@/components/donatur/SuratTemplate';

/** Render surat menjadi PNG 1240×1754 (A4 150 dpi). */
export async function renderPngSurat(surat: SuratWithRelasi): Promise<Uint8Array> {
  const [assets, fonts] = await Promise.all([loadSuratAssets(), loadSuratFonts()]);
  const image = new ImageResponse(
    <SuratTemplate data={buildSuratData(surat)} assets={assets} />,
    { width: 1240, height: 1754, fonts },
  );
  return new Uint8Array(await image.arrayBuffer());
}

/** Respons PNG surat dengan nama berkas aman & cache browser sehari. */
export function responsPng(png: Uint8Array, nomorSurat: string): NextResponse {
  // Nama berkas untuk header disaring dari karakter selain [A-Za-z0-9._-]
  // agar tidak menyisipkan karakter tak terduga ke header HTTP.
  const namaBerkas = `${nomorSurat.replace(/\//g, '-')}.png`.replace(/[^A-Za-z0-9._-]/g, '_');
  return new NextResponse(png as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="${namaBerkas}"`,
      // Isi surat tidak berubah setelah dibuat → aman di-cache sehari di browser.
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
