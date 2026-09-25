import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { getBerkas, tambahVersi, catatAkses, segarkanSuratBelumTerkirim } from '@/lib/db/berkas-lembaga-repo';
import { jenisRahasia, validasiUnggah } from '@/lib/lembaga/berkas';
import { fileUnggahSchema } from '@/lib/validation/berkas-lembaga';
import { validationResponse } from '@/lib/validation/errors';
import { konteksBerkas, periksaObjekUnggahan, tolak, PESAN_KELOLA_MATI } from '@/lib/lembaga/konteks-berkas';
import { lupakanAsetPengesahan } from '@/lib/surat/pengesahan';

type Ctx = { params: Promise<{ id: string }> };

/** Ganti versi: versi lama tetap tersimpan sebagai riwayat. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { user, supabase, hak } = await konteksBerkas();
    const { id } = await ctx.params;
    const parsed = fileUnggahSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const file = parsed.data;
    const berkas = await getBerkas(supabase, id);
    if (!berkas) return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 404 });
    const rahasia = jenisRahasia(berkas.jenis);
    if (rahasia ? !hak.rahasia : !hak.kelola) return tolak(rahasia ? 'Cap dan tanda tangan hanya bisa diganti Superadmin' : PESAN_KELOLA_MATI);
    if (rahasia !== file.path.startsWith('lembaga/rahasia/')) return NextResponse.json({ error: 'Lokasi berkas tidak valid' }, { status: 400 });
    const galat = validasiUnggah({ jenis: berkas.jenis, mime: file.mime, ukuran: file.ukuran }) ?? await periksaObjekUnggahan(file.path, file.ukuran, file.mime);
    if (galat) return NextResponse.json({ error: galat }, { status: 400 });

    const versi = await tambahVersi(supabase, id, { storagePath: file.path, namaFile: file.namaFile, mime: file.mime, ukuran: file.ukuran }, user.id);
    await catatAkses(supabase, 'VERSI_BARU', { berkasId: id, versiId: versi.id, rincian: `v${versi.versi}` });
    if (rahasia) { lupakanAsetPengesahan(); await segarkanSuratBelumTerkirim(supabase); }
    return NextResponse.json({ success: true, data: versi }, { status: 201 });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Versi berkas lembaga error:', e);
    return NextResponse.json({ error: e.message || 'Gagal menyimpan versi baru' }, { status: 500 });
  }
}
