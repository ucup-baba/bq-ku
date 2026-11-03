import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { terapkanAudit } from '@/lib/db/perpus-repo';
import { auditTerapkanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const parsed = auditTerapkanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await terapkanAudit(supabase, parsed.data.items) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof NomorBentrokError) return NextResponse.json({ error: e.message, nomor: e.nomor }, { status: 409 });
    console.error('Terapkan audit error:', e);
    return NextResponse.json({ error: 'Gagal menerapkan nomor baru' }, { status: 500 });
  }
}
