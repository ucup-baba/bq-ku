import type { SupabaseClient } from '@supabase/supabase-js';
import { signPaths } from '@/lib/storage/signed';
import { isPathSuratDonatur } from '@/lib/storage/paths';
import type { Santri, SantriDocument } from '@/lib/db/santri-repo';

/**
 * Data santri untuk Ruang Lembaga (baca saja). Sengaja TIDAK memilih documents(*):
 * Pengurus tidak punya akses ke tabel itu (isi OCR) maupun file scan. Status berkas
 * diambil dari RPC status_berkas_santri() yang hanya mengembalikan kategori & status.
 */
export type DokStatus = { kategori: string; statusVerifikasi: string };

export async function ambilStatusBerkas(client: SupabaseClient): Promise<Map<string, DokStatus[]> | null> {
  const { data, error } = await client.rpc('status_berkas_santri');
  if (error || !data) return null;
  const peta = new Map<string, DokStatus[]>();
  for (const r of data as Array<{ santriId: string; kategori: string; statusVerifikasi: string }>) {
    const list = peta.get(r.santriId) ?? [];
    list.push({ kategori: r.kategori, statusVerifikasi: r.statusVerifikasi });
    peta.set(r.santriId, list);
  }
  return peta;
}

const fotoAman = (p?: string | null): p is string => !!p && !isPathSuratDonatur(p);

async function lengkapi(client: SupabaseClient, rows: Santri[], status: Map<string, DokStatus[]> | null): Promise<Santri[]> {
  const map = await signPaths(client, rows.flatMap(s => [s.fotoFormalPath, s.fotoProfilPath].filter(fotoAman)));
  return rows.map(s => ({
    ...s,
    fotoFormalUrl: fotoAman(s.fotoFormalPath) ? map[s.fotoFormalPath] || null : null,
    fotoProfilUrl: fotoAman(s.fotoProfilPath) ? map[s.fotoProfilPath] || null : null,
    documents: (status?.get(s.id) ?? []).map(d => ({ ...d, fileUrl: '', catatanVerifikasi: null })) as unknown as SantriDocument[],
  }));
}

export async function listSantriLembaga(client: SupabaseClient): Promise<Santri[]> {
  const [{ data, error }, status] = await Promise.all([
    client.from('santri').select('*').order('createdAt', { ascending: false }),
    ambilStatusBerkas(client),
  ]);
  if (error) throw new Error(`Gagal mengambil daftar santri: ${error.message}`);
  return lengkapi(client, (data || []) as Santri[], status);
}

export async function getSantriLembaga(client: SupabaseClient, id: string): Promise<Santri | null> {
  const [{ data, error }, status] = await Promise.all([
    client.from('santri').select('*').eq('id', id).maybeSingle(),
    ambilStatusBerkas(client),
  ]);
  if (error || !data) return null;
  const [s] = await lengkapi(client, [data as Santri], status);
  return s;
}
