import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { klasifikasiSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { usulkanKelas } from '@/lib/perpus/klasifikasi';
import { AiBatasError } from '@/lib/ai/batas';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRoom('perpus');
    const parsed = klasifikasiSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await usulkanKelas(parsed.data.buku, user.id) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof AiBatasError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error('Klasifikasi buku error:', e);
    return NextResponse.json({ error: 'AI gagal mengusulkan kelas. Pilih kelas secara manual.' }, { status: 502 });
  }
}
