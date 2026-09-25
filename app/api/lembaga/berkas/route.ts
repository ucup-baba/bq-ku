import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/lib/auth/session';
import { listBerkas, buatBerkas, tambahVersi, catatAkses, segarkanSuratBelumTerkirim } from '@/lib/db/berkas-lembaga-repo';
import { jenisRahasia, validasiUnggah } from '@/lib/lembaga/berkas';
import { dataBerkasSchema, fileUnggahSchema } from '@/lib/validation/berkas-lembaga';
import { validationResponse } from '@/lib/validation/errors';
import { konteksBerkas, periksaObjekUnggahan, tolak, PESAN_KELOLA_MATI } from '@/lib/lembaga/konteks-berkas';
import { lupakanAsetPengesahan } from '@/lib/surat/pengesahan';

/** Daftar berkas (versi rahasia disaring RLS untuk Pengurus) + hak pengguna untuk tampilan. */
export async function GET() {
  try {
    const { supabase, hak } = await konteksBerkas();
    return NextResponse.json({ success: true, data: { berkas: await listBerkas(supabase), hak } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List berkas lembaga error:', e);
    return NextResponse.json({ error: 'Gagal memuat berkas lembaga' }, { status: 500 });
  }
}

const bodySchema = z.object({ data: dataBerkasSchema, file: fileUnggahSchema });

/** Berkas baru + versi pertamanya (file sudah diunggah langsung ke Storage). */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, hak } = await konteksBerkas();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { data, file } = parsed.data;
    const rahasia = jenisRahasia(data.jenis);
    if (rahasia ? !hak.rahasia : !hak.kelola) return tolak(rahasia ? 'Cap dan tanda tangan hanya bisa diunggah Superadmin' : PESAN_KELOLA_MATI);
    if (rahasia !== file.path.startsWith('lembaga/rahasia/')) return NextResponse.json({ error: 'Lokasi berkas tidak valid' }, { status: 400 });
    const galat = validasiUnggah({ jenis: data.jenis, mime: file.mime, ukuran: file.ukuran }) ?? await periksaObjekUnggahan(file.path, file.ukuran, file.mime);
    if (galat) return NextResponse.json({ error: galat }, { status: 400 });

    const berkas = await buatBerkas(supabase, data as never, user.id);
    const versi = await tambahVersi(supabase, berkas.id, { storagePath: file.path, namaFile: file.namaFile, mime: file.mime, ukuran: file.ukuran }, user.id);
    await catatAkses(supabase, 'UNGGAH', { berkasId: berkas.id, versiId: versi.id });
    if (rahasia) { lupakanAsetPengesahan(); await segarkanSuratBelumTerkirim(supabase); }
    return NextResponse.json({ success: true, data: { ...berkas, versi: [versi] } }, { status: 201 });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Buat berkas lembaga error:', e);
    return NextResponse.json({ error: e.message || 'Gagal menyimpan berkas' }, { status: 500 });
  }
}
