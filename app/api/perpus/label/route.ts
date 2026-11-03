import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listBuku } from '@/lib/db/perpus-repo';
import { barisLabel, keCsv } from '@/lib/perpus/audit';
import { susunLabelPdf } from '@/lib/perpus/label-pdf';

/** Daftar label yang perlu dicetak (ulang), satu baris per eksemplar. */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const baris = barisLabel(await listBuku(supabase, { statusKode: 'baku' }));
    if (new URL(req.url).searchParams.get('format') === 'pdf') {
      return new NextResponse(Buffer.from(await susunLabelPdf(baris)), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="label-perpus.pdf"' },
      });
    }
    const csv = keCsv([['Judul', 'Nomor lama', 'Nomor baru'], ...baris.map(b => [b.judul, b.lama, b.baru])]);
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="label-perpus.csv"' },
    });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Label perpus error:', e);
    return NextResponse.json({ error: 'Gagal menyusun label' }, { status: 500 });
  }
}
