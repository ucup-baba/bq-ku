import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { getDocumentById } from '@/lib/db/santri-repo';
import { signPaths } from '@/lib/storage/signed';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await ctx.params;
    const doc = await getDocumentById(supabase, id);
    if (!doc) return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
    const map = await signPaths(supabase, [doc.storagePath]);
    return NextResponse.json({ success: true, url: map[doc.storagePath] || null, expiresIn: 3600 });
  } catch (e) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal membuat tautan' }, { status: 500 });
  }
}
