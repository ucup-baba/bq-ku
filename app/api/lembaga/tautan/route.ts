import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { listTautan, buatTautan, listBerkas, catatAkses, versiTerbaru } from '@/lib/db/berkas-lembaga-repo';
import { jenisRahasia } from '@/lib/lembaga/berkas';
import { tautanSchema } from '@/lib/validation/berkas-lembaga';
import { validationResponse } from '@/lib/validation/errors';
import { konteksBerkas, tolak, PESAN_KELOLA_MATI } from '@/lib/lembaga/konteks-berkas';

export async function GET() {
  try {
    const { supabase } = await konteksBerkas();
    return NextResponse.json({ success: true, data: await listTautan(supabase) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List tautan error:', e);
    return NextResponse.json({ error: 'Gagal memuat tautan' }, { status: 500 });
  }
}

/** Buat tautan bagikan. Tautan & PIN asli hanya dikirim di respons ini. */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, hak } = await konteksBerkas();
    if (!hak.kelola) return tolak(PESAN_KELOLA_MATI);
    const parsed = tautanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const d = parsed.data;
    const semua = await listBerkas(supabase);
    const dipilih = d.berkasIds.map(id => semua.find(b => b.id === id));
    if (dipilih.some(b => !b)) return NextResponse.json({ error: 'Ada berkas yang tidak ditemukan' }, { status: 400 });
    if (dipilih.some(b => jenisRahasia(b!.jenis))) return NextResponse.json({ error: 'Cap dan tanda tangan tidak boleh dibagikan' }, { status: 400 });
    if (dipilih.some(b => !versiTerbaru(b!))) return NextResponse.json({ error: 'Ada berkas yang belum diunggah' }, { status: 400 });

    const hasil = await buatTautan(supabase, { penerima: d.penerima, catatan: d.catatan, hari: d.hari, tandaAir: d.tandaAir, pakaiPin: d.pakaiPin, batasBuka: d.batasBuka }, d.berkasIds, user.id);
    await catatAkses(supabase, 'BUAT_TAUTAN', { tautanId: hasil.id, rincian: `${d.penerima} · ${d.berkasIds.length} berkas · ${d.hari} hari` });
    const url = `${new URL(req.url).origin}/bagikan/${hasil.token}`;
    return NextResponse.json({ success: true, data: { id: hasil.id, url, pin: hasil.pin, kedaluwarsaAt: hasil.kedaluwarsaAt } }, {
      status: 201, headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Buat tautan error:', e);
    return NextResponse.json({ error: e.message || 'Gagal membuat tautan' }, { status: 500 });
  }
}
