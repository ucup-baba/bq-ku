import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { getSantriById, updateSantri, deleteSantri, saveDocument, DuplicateNikError } from '@/lib/db/santri-repo';
import { santriUpdateSchema, documentInputSchema } from '@/lib/validation/santri';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser();
    const { id } = await ctx.params;
    const santri = await getSantriById(supabase, id);
    if (!santri) return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: santri });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'PANITIA']);
    const { id } = await ctx.params;
    const parsed = santriUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const updated = await updateSantri(supabase, id, parsed.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    if (error instanceof DuplicateNikError) {
      return NextResponse.json({ error: 'NIK sudah terdaftar', existingId: error.existingId }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const ok = await deleteSantri(supabase, id);
    if (!ok) return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Data santri berhasil dihapus' });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    return NextResponse.json({ error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'PANITIA']);
    const { id } = await ctx.params;
    const parsed = documentInputSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const doc = await saveDocument(supabase, { santriId: id, ...parsed.data });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    return NextResponse.json({ error: 'Gagal menambah dokumen: ' + error.message }, { status: 500 });
  }
}
