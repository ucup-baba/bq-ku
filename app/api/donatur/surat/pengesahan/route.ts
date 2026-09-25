import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilAsetPengesahan } from '@/lib/surat/pengesahan';
import { NAMA_PENANDATANGAN_BAWAAN } from '@/lib/surat/aset-klien';

/** Nama penandatangan surat untuk pratinjau di browser (file cap/tanda tangan lewat rute aset). */
export async function GET() {
  try {
    await requireRoom('donatur');
    const p = await ambilAsetPengesahan();
    return NextResponse.json({ success: true, data: { namaPenandatangan: p.namaPenandatangan ?? NAMA_PENANDATANGAN_BAWAAN } }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Pengesahan surat error:', e);
    return NextResponse.json({ error: 'Gagal memuat data pengesahan' }, { status: 500 });
  }
}
