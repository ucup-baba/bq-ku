import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { validasiUnggah, jenisRahasia, MIME_DIIZINKAN } from '@/lib/lembaga/berkas';
import { unggahUrlSchema } from '@/lib/validation/berkas-lembaga';
import { validationResponse } from '@/lib/validation/errors';
import { konteksBerkas, bucketBerkas, tolak, PESAN_KELOLA_MATI } from '@/lib/lembaga/konteks-berkas';

/**
 * Tiket unggah langsung browser → Storage (menghindari batas body 4,5 MB Vercel).
 * Path diterbitkan server; tanda tangan dibuat dengan klien pengguna sehingga policy storage ikut berlaku.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, hak } = await konteksBerkas();
    const parsed = unggahUrlSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { jenis, mime, ukuran } = parsed.data;
    const rahasia = jenisRahasia(jenis);
    if (rahasia ? !hak.rahasia : !hak.kelola) return tolak(rahasia ? 'Cap dan tanda tangan hanya bisa diunggah Superadmin' : PESAN_KELOLA_MATI);
    const galat = validasiUnggah({ jenis, mime, ukuran });
    if (galat) return NextResponse.json({ error: galat, fields: { file: galat } }, { status: 400 });
    const path = `lembaga/${rahasia ? 'rahasia/' : ''}${crypto.randomUUID()}.${MIME_DIIZINKAN[mime]}`;
    const { data, error } = await supabase.storage.from(bucketBerkas()).createSignedUploadUrl(path);
    if (error || !data) return tolak('Tidak dapat menyiapkan unggahan');
    return NextResponse.json({ success: true, data: { bucket: bucketBerkas(), path, token: data.token } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Unggah-url berkas error:', e);
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan' }, { status: 500 });
  }
}
