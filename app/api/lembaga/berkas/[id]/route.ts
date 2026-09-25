import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { getBerkas, ubahDataBerkas, hapusBerkas, catatAkses, segarkanSuratBelumTerkirim } from '@/lib/db/berkas-lembaga-repo';
import { jenisRahasia } from '@/lib/lembaga/berkas';
import { ubahDataBerkasSchema } from '@/lib/validation/berkas-lembaga';
import { validationResponse } from '@/lib/validation/errors';
import { konteksBerkas, bucketBerkas, tolak, PESAN_KELOLA_MATI } from '@/lib/lembaga/konteks-berkas';
import { lupakanAsetPengesahan } from '@/lib/surat/pengesahan';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase, hak } = await konteksBerkas();
    const { id } = await ctx.params;
    const parsed = ubahDataBerkasSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const berkas = await getBerkas(supabase, id);
    if (!berkas) return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 404 });
    const rahasia = jenisRahasia(berkas.jenis);
    if (rahasia ? !hak.rahasia : !hak.kelola) return tolak(rahasia ? 'Cap dan tanda tangan hanya bisa diubah Superadmin' : PESAN_KELOLA_MATI);
    const p = parsed.data;
    if (berkas.jenis === 'LAINNYA' && p.namaLainnya === null) return NextResponse.json({ error: 'Tuliskan nama berkas', fields: { namaLainnya: 'Tuliskan nama berkas' } }, { status: 400 });
    const patch = {
      nomorDokumen: p.nomorDokumen, tanggalTerbit: p.tanggalTerbit, berlakuSampai: p.berlakuSampai,
      ...(berkas.jenis === 'LAINNYA' ? { namaLainnya: p.namaLainnya } : {}),
      ...(berkas.jenis === 'TANDA_TANGAN' ? { namaPenandatangan: p.namaPenandatangan } : {}),
    };
    const hasil = await ubahDataBerkas(supabase, id, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    await catatAkses(supabase, 'UBAH_DATA', { berkasId: id });
    if (berkas.jenis === 'TANDA_TANGAN' && hasil.namaPenandatangan !== berkas.namaPenandatangan) {
      // Nama di bawah tanda tangan berubah → surat yang belum terkirim dirender ulang.
      lupakanAsetPengesahan();
      await segarkanSuratBelumTerkirim(supabase);
    }
    return NextResponse.json({ success: true, data: hasil });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ubah berkas lembaga error:', e);
    return NextResponse.json({ error: e.message || 'Gagal memperbarui berkas' }, { status: 500 });
  }
}

/** Hapus berkas beserta semua versinya (Superadmin). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase, hak } = await konteksBerkas();
    if (!hak.hapus) return tolak('Hanya Superadmin yang bisa menghapus berkas lembaga');
    const { id } = await ctx.params;
    const berkas = await getBerkas(supabase, id);
    if (!berkas) return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 404 });
    const paths = await hapusBerkas(supabase, id);
    if (paths.length) {
      const { error } = await supabase.storage.from(bucketBerkas()).remove(paths);
      if (error) console.error('Gagal menghapus file berkas lembaga', { id, error: error.message });
    }
    await catatAkses(supabase, 'HAPUS', { berkasId: id, rincian: berkas.jenis });
    if (jenisRahasia(berkas.jenis)) { lupakanAsetPengesahan(); await segarkanSuratBelumTerkirim(supabase); }
    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Hapus berkas lembaga error:', e);
    return NextResponse.json({ error: e.message || 'Gagal menghapus berkas' }, { status: 500 });
  }
}
