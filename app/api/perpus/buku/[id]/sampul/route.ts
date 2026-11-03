import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { unggahSampulBuku } from '@/lib/db/perpus-repo';

/** Di bawah batas body 4,5 MB Vercel; klien sudah mengecilkan gambar sebelum mengirim. */
const BATAS = 4 * 1024 * 1024;
const salah = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const berkas = (await req.formData()).get('berkas');
    if (!(berkas instanceof File)) return salah('Pilih gambar sampul');
    if (!berkas.type.startsWith('image/')) return salah('Berkas harus berupa gambar');
    if (berkas.size > BATAS) return salah('Gambar terlalu besar (maks. 4 MB)');
    let webp: Buffer;
    try {
      webp = await sharp(Buffer.from(await berkas.arrayBuffer())).rotate()
        .resize({ width: 600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch {
      return salah('Gambar tidak dapat dibaca');
    }
    return NextResponse.json({ success: true, data: await unggahSampulBuku(supabase, id, webp) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Unggah sampul error:', e);
    return NextResponse.json({ error: 'Gagal mengunggah sampul' }, { status: 500 });
  }
}
