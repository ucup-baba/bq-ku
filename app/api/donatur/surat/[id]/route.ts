import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, markSuratTerkirim, hapusSuratBesertaDonasi, ubahSurat, HapusDitolakError, SuratTerkunciError } from '@/lib/db/donatur-repo';
import { validationResponse } from '@/lib/validation/errors';
import { donasiSchema, suratSchema } from '@/lib/validation/donatur';
import { parseNomorSurat, bulanRomawi } from '@/lib/utils/nomor-surat';

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = z.object({ terkirimWa: z.literal(true) }).strict();
const ubahSchema = z.object({
  donasi: donasiSchema,
  tanggalSurat: suratSchema.shape.tanggalSurat,
  gayaTulisan: suratSchema.shape.gayaTulisan,
});

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: surat });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Get surat error:', e);
    return NextResponse.json({ error: 'Gagal memuat surat' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await markSuratTerkirim(supabase, id) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Mark surat terkirim error:', e);
    return NextResponse.json({ error: 'Gagal menandai surat' }, { status: 500 });
  }
}

/** Mengubah isi surat yang belum terkirim (nomor & donatur tetap). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const parsed = ubahSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });
    if (surat.terkirimWa) return NextResponse.json({ error: 'Surat sudah terkirim sehingga tidak bisa diubah' }, { status: 409 });

    // Nomor surat memuat bulan & tahun (mis. 5/PBQ/IX/2026); tanggal surat harus tetap di bulan itu.
    const p = parseNomorSurat(surat.nomorSurat);
    const [th, bl] = parsed.data.tanggalSurat.split('-').map(Number);
    if (p && (p.tahun !== th || p.bulan !== bl)) {
      return NextResponse.json({
        error: 'Validasi gagal',
        fields: { tanggalSurat: `Tanggal surat harus di bulan ${bulanRomawi(p.bulan)}/${p.tahun} sesuai nomor surat` },
      }, { status: 400 });
    }

    await ubahSurat(supabase, surat, parsed.data);
    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof SuratTerkunciError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error('Ubah surat error:', e);
    return NextResponse.json({ error: 'Gagal mengubah surat' }, { status: 500 });
  }
}

/** Menghapus surat beserta catatan donasinya (dan PNG-nya di storage). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });

    const path = await hapusSuratBesertaDonasi(supabase, surat);
    if (path) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) console.error('Gagal menghapus PNG surat dari storage', { suratId: id, path, error: error.message });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof HapusDitolakError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error('Hapus surat error:', e);
    return NextResponse.json({ error: 'Gagal menghapus surat' }, { status: 500 });
  }
}
