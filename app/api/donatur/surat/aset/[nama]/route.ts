import fs from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ASET_KLIEN, asetDiizinkan } from '@/lib/surat/aset-klien';

export const runtime = 'nodejs';

// Aset surat (TTD, stempel, kop, font) sengaja tidak di public/: hanya pengguna
// ruang donatur yang boleh memuatnya, dan hanya berkas dalam daftar putih.
const ASET_DIR = path.join(process.cwd(), 'assets', 'surat');

export async function GET(_req: NextRequest, ctx: { params: Promise<{ nama: string }> }) {
  try {
    await requireRoom('donatur');
    const { nama } = await ctx.params;
    if (!asetDiizinkan(nama)) return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    const [folder, mime] = ASET_KLIEN[nama];
    const isi = await fs.readFile(path.join(ASET_DIR, folder, nama));
    return new NextResponse(new Uint8Array(isi), {
      headers: { 'Content-Type': mime, 'Cache-Control': 'private, max-age=604800' },
    });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal memuat aset surat', e);
    return NextResponse.json({ error: 'Gagal memuat aset surat' }, { status: 500 });
  }
}
