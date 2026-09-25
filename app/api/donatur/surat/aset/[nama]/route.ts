import fs from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ASET_KLIEN, asetDiizinkan } from '@/lib/surat/aset-klien';
import { ambilAsetPengesahan } from '@/lib/surat/pengesahan';

export const runtime = 'nodejs';

// Aset surat (TTD, stempel, kop, font) sengaja tidak di public/: hanya pengguna
// ruang donatur yang boleh memuatnya, dan hanya berkas dalam daftar putih.
const ASET_DIR = path.join(process.cwd(), 'assets', 'surat');

export async function GET(_req: NextRequest, ctx: { params: Promise<{ nama: string }> }) {
  try {
    await requireRoom('donatur');
    const { nama } = await ctx.params;
    if (!asetDiizinkan(nama)) return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    // Cap & tanda tangan terbaru dari Berkas lembaga (bila ada) menggantikan aset bawaan, cache singkat.
    if (nama === 'stempel.webp' || nama === 'ttd-rotasi.png') {
      const p = await ambilAsetPengesahan();
      const uri = nama === 'stempel.webp' ? p.stempel : p.ttd;
      if (uri) {
        return new NextResponse(new Uint8Array(Buffer.from(uri.split(',')[1], 'base64')), {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' },
        });
      }
    }
    const [folder, mime] = ASET_KLIEN[nama];
    const isi = await fs.readFile(path.join(ASET_DIR, folder, nama));
    return new NextResponse(new Uint8Array(isi), {
      headers: { 'Content-Type': mime, 'Cache-Control': (nama === 'stempel.webp' || nama === 'ttd-rotasi.png') ? 'private, max-age=300' : 'private, max-age=604800' },
    });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal memuat aset surat', e);
    return NextResponse.json({ error: 'Gagal memuat aset surat' }, { status: 500 });
  }
}
