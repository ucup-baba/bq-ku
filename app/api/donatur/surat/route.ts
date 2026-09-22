import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { createDonasi, createSurat, listSurat, peekNomorUrut, bumpNomorUrut, NomorSuratDipakaiError } from '@/lib/db/donatur-repo';
import { donasiSchema, suratSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';
import { formatNomorSurat, parseNomorSurat } from '@/lib/utils/nomor-surat';

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

function tanggalValid(v: string): boolean {
  return TANGGAL_RE.test(v) && !Number.isNaN(Date.parse(v));
}

const bodySchema = z.object({
  donasi: donasiSchema.optional(),
  donasiId: z.string().trim().min(1).optional(),
  nomorSurat: suratSchema.shape.nomorSurat,
  tanggalSurat: suratSchema.shape.tanggalSurat,
}).refine(d => d.donasi || d.donasiId, { path: ['donasi'], message: 'Data donasi wajib ada' });

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const dari = p.get('dari') || undefined;
    const sampai = p.get('sampai') || undefined;
    if (dari && !tanggalValid(dari)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    if (sampai && !tanggalValid(sampai)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const terkirimParam = p.get('terkirim');
    const limitRaw = p.get('limit');
    const limitNum = limitRaw ? Number.parseInt(limitRaw, 10) : NaN;
    const limit = Number.isInteger(limitNum) && limitNum >= 1 && limitNum <= 500 ? limitNum : undefined;
    const data = await listSurat(supabase, {
      dari,
      sampai,
      terkirim: terkirimParam === null ? undefined : terkirimParam === 'true',
      limit,
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List surat error:', e);
    return NextResponse.json({ error: 'Gagal memuat surat' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRoom('donatur');
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { donasi, donasiId, nomorSurat, tanggalSurat } = parsed.data;

    const donasiRow = donasi ? await createDonasi(supabase, donasi, user.id) : null;
    const idDonasi = donasiRow?.id ?? donasiId!;

    try {
      const surat = await createSurat(supabase, { donasiId: idDonasi, nomorSurat, tanggalSurat }, user.id);
      const p = parseNomorSurat(nomorSurat)!;
      await bumpNomorUrut(supabase, p.tahun, p.bulan, p.urut);
      return NextResponse.json({ success: true, data: surat }, { status: 201 });
    } catch (e) {
      if (e instanceof NomorSuratDipakaiError) {
        // Donasi baru yang tadi dibuat di permintaan ini jadi yatim tanpa
        // surat karena nomornya bentrok — hapus lagi agar tidak tertinggal.
        // RLS hanya mengizinkan SUPERADMIN menghapus donasi; bila gagal
        // karena izin, jangan gagalkan respons ini, cukup catat di log.
        if (donasiRow) {
          const { error: delErr } = await supabase.from('donasi').delete().eq('id', donasiRow.id);
          if (delErr) console.error('Gagal menghapus donasi yatim setelah nomor surat bentrok:', delErr);
        }
        const d = new Date(tanggalSurat + 'T00:00:00');
        const urut = await peekNomorUrut(supabase, d.getFullYear(), d.getMonth() + 1);
        return NextResponse.json(
          { error: `Nomor ${nomorSurat} sudah dipakai`, nomorUsulan: formatNomorSurat(urut, d) },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Create surat error:', e);
    return NextResponse.json({ error: 'Gagal membuat surat' }, { status: 500 });
  }
}
