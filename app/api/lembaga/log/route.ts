import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { listLog } from '@/lib/db/berkas-lembaga-repo';
import { konteksBerkas } from '@/lib/lembaga/konteks-berkas';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Catatan akses (50 per halaman, terbaru dulu). Nama pengguna diperkaya dari profiles lewat kunci admin
 * (RLS profiles hanya mengizinkan membaca diri sendiri); hanya kolom id & nama yang diambil.
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await konteksBerkas();
    const p = new URL(req.url).searchParams;
    const sebelum = Number(p.get('sebelum')) || undefined;
    const log = await listLog(supabase, { berkasId: p.get('berkasId') || undefined, tautanId: p.get('tautanId') || undefined, sebelum });
    const ids = [...new Set(log.map(l => l.userId).filter((x): x is string => !!x))];
    const nama: Record<string, string> = {};
    if (ids.length) {
      const { data } = await createAdminSupabase().from('profiles').select('id, nama').in('id', ids);
      for (const r of (data ?? []) as Array<{ id: string; nama: string }>) nama[r.id] = r.nama;
    }
    return NextResponse.json({ success: true, data: log.map(l => ({ ...l, namaPengguna: l.userId ? nama[l.userId] ?? null : null })) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Log akses error:', e);
    return NextResponse.json({ error: 'Gagal memuat catatan akses' }, { status: 500 });
  }
}
