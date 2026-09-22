import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { listSantri, createSantri, DuplicateNikError, type SantriFilter } from '@/lib/db/santri-repo';
import { santriInputSchema } from '@/lib/validation/santri';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireUser();
    const { searchParams } = new URL(req.url);
    const filter: SantriFilter = {};
    const q = searchParams.get('q'); if (q) filter.q = q;
    const jk = searchParams.get('jenisKelamin'); if (jk === 'IKHWAN' || jk === 'AKHWAT') filter.jenisKelamin = jk;
    const jj = searchParams.get('jenjang'); if (jj === 'SMP' || jj === 'SMA' || jj === 'SMK' || jj === 'ALUMNI') filter.jenjang = jj;
    return NextResponse.json({ success: true, data: await listSantri(supabase, filter) });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    console.error('List santri error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data santri: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'PANITIA']);
    const parsed = santriInputSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const santri = await createSantri(supabase, parsed.data);
    return NextResponse.json({ success: true, data: santri }, { status: 201 });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    if (error instanceof DuplicateNikError) {
      return NextResponse.json({ error: 'NIK sudah terdaftar', existingId: error.existingId }, { status: 409 });
    }
    console.error('Create santri error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data santri: ' + error.message }, { status: 500 });
  }
}
