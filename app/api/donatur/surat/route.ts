import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { createDonasi, createSurat, listSurat, peekNomorUrut, bumpNomorUrut, NomorSuratDipakaiError } from '@/lib/db/donatur-repo';
import { donasiSchema, suratSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';
import { isTanggalIso, parseLimit } from '@/lib/validation/query';
import { formatNomorSurat, parseNomorSurat } from '@/lib/utils/nomor-surat';
import type { SupabaseClient } from '@supabase/supabase-js';

const bodySchema = z.object({
  donasi: donasiSchema.optional(),
  donasiId: z.string().trim().min(1).optional(),
  nomorSurat: suratSchema.shape.nomorSurat,
  tanggalSurat: suratSchema.shape.tanggalSurat,
}).refine(d => d.donasi || d.donasiId, { path: ['donasi'], message: 'Data donasi wajib ada' });

/** Balasan 409 standar berikut usulan nomor pengganti (hanya mengintip, tidak menaikkan counter). */
async function nomorDipakaiResponse(supabase: SupabaseClient, nomorSurat: string, tanggalSurat: string) {
  const d = new Date(tanggalSurat + 'T00:00:00');
  const urut = await peekNomorUrut(supabase, d.getFullYear(), d.getMonth() + 1);
  return NextResponse.json(
    { error: `Nomor ${nomorSurat} sudah dipakai`, nomorUsulan: formatNomorSurat(urut, d) },
    { status: 409 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const dari = p.get('dari') || undefined;
    const sampai = p.get('sampai') || undefined;
    if (dari && !isTanggalIso(dari)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    if (sampai && !isTanggalIso(sampai)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const terkirimParam = p.get('terkirim');
    const limit = parseLimit(p.get('limit'));
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

    // Lapisan 1: nomorSurat dikirim klien, jadi bentrok sering terjadi
    // (dua admin, formulir lama) bukan cuma saat balapan murni. Periksa
    // dulu SEBELUM createDonasi agar donasi baru tidak sempat dibuat sama
    // sekali untuk kasus yang sudah pasti gagal ini.
    const { data: existing, error: cekErr } = await supabase
      .from('surat').select('id').eq('nomorSurat', nomorSurat).maybeSingle();
    if (cekErr) throw new Error(`Gagal memeriksa nomor surat: ${cekErr.message}`);
    if (existing) return await nomorDipakaiResponse(supabase, nomorSurat, tanggalSurat);

    const donasiRow = donasi ? await createDonasi(supabase, donasi, user.id) : null;
    const idDonasi = donasiRow?.id ?? donasiId!;

    // Lapisan 2 (jaring pengaman): dua permintaan lolos pemeriksaan di atas
    // secara bersamaan (balapan murni) tetap bisa bentrok di constraint
    // unik database. Bila itu terjadi dan donasi baru sempat dibuat di
    // permintaan ini, hapus lagi agar tidak tertinggal donasi tanpa surat.
    // RLS hanya mengizinkan SUPERADMIN menghapus donasi; bila gagal karena
    // izin, jangan gagalkan respons ini, cukup catat di log.
    try {
      const surat = await createSurat(supabase, { donasiId: idDonasi, nomorSurat, tanggalSurat }, user.id);

      // Menaikkan counter nomor surat adalah housekeeping, bukan syarat sah
      // surat tersimpan (constraint unik di database sudah mencegah nomor
      // ganda). Bila gagal setelah surat tersimpan, jangan balas 500 —
      // klien perlu tahu surat sudah dibuat.
      try {
        const p = parseNomorSurat(nomorSurat)!;
        await bumpNomorUrut(supabase, p.tahun, p.bulan, p.urut);
      } catch (bumpErr) {
        console.error('Gagal memperbarui counter nomor surat setelah surat tersimpan:', bumpErr);
      }

      return NextResponse.json({ success: true, data: surat }, { status: 201 });
    } catch (e) {
      if (e instanceof NomorSuratDipakaiError) {
        if (donasiRow) {
          const { error: delErr } = await supabase.from('donasi').delete().eq('id', donasiRow.id);
          if (delErr) console.error('Gagal menghapus donasi yatim setelah nomor surat bentrok:', delErr);
        }
        return await nomorDipakaiResponse(supabase, nomorSurat, tanggalSurat);
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
