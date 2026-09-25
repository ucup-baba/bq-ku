import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { getBerkas, catatAkses, versiTerbaru } from '@/lib/db/berkas-lembaga-repo';
import { jenisRahasia } from '@/lib/lembaga/berkas';
import { konteksBerkas, bucketBerkas, tolak } from '@/lib/lembaga/konteks-berkas';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Buka (?tampil=1) atau unduh satu versi berkas: dicatat, lalu dialihkan ke signed URL 5 menit.
 * RLS menyembunyikan versi berkas rahasia dari Pengurus, jadi hasilnya 403.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase, hak } = await konteksBerkas();
    const { id } = await ctx.params;
    const p = new URL(req.url).searchParams;
    const berkas = await getBerkas(supabase, id);
    if (!berkas) return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 404 });
    if (jenisRahasia(berkas.jenis) && !hak.rahasia) return tolak('Cap dan tanda tangan hanya bisa dibuka Superadmin');
    const versi = p.get('versi') ? berkas.versi.find(v => v.id === p.get('versi')) : versiTerbaru(berkas);
    if (!versi) return NextResponse.json({ error: 'Versi berkas tidak ditemukan' }, { status: 404 });
    const tampil = p.get('tampil') === '1';
    const { data, error } = await supabase.storage.from(bucketBerkas())
      .createSignedUrl(versi.storagePath, 300, tampil ? undefined : { download: versi.namaFile });
    if (error || !data) return tolak('Berkas tidak dapat dibuka');
    await catatAkses(supabase, tampil ? 'LIHAT' : 'UNDUH', { berkasId: id, versiId: versi.id, rincian: `v${versi.versi}` });
    return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Unduh berkas lembaga error:', e);
    return NextResponse.json({ error: 'Gagal membuka berkas' }, { status: 500 });
  }
}
