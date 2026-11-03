import 'server-only';
import { z } from 'zod';
import { bacaDokumenAi } from '@/lib/ai/baca';
import type { PilihanModel } from '@/lib/ai/model';
import { KELAS_DDC, kelasSah } from '@/lib/perpus/ddc';

/** Permintaan pengguna: klasifikasi buku memakai Gemini, terlepas dari setelan OCR utama. */
export const MODEL_KLASIFIKASI: PilihanModel = { penyedia: 'gemini', model: 'gemini-flash-lite-latest' };

export type UsulanKelas = { kelasDdc: string; alasan: string; yakin: number };

export function promptKlasifikasi(buku: { judul: string; penulis: string }[]): string {
  const kelas = KELAS_DDC.map(k => `${k.kode} — ${k.id}`).join('\n');
  const daftar = buku.map((b, i) => `${i}. "${b.judul}" — ${b.penulis || 'penulis tidak diketahui'}`).join('\n');
  return [
    'Anda pustakawan yang mengklasifikasi buku perpustakaan pesantren dengan Dewey Decimal Classification (DDC) baku.',
    'Pilih SATU kode paling tepat untuk setiap buku, HANYA dari daftar berikut:',
    kelas,
    'Aturan: novel/cerpen karya penulis Indonesia → 899.221; fiksi terjemahan → kelas sastra bahasa aslinya (Inggris 823, Amerika 813, Portugis 869, Jepang 895.6, Norwegia 839.82);',
    'buku Islam pilih subkelas 297.x bila jelas (fikih 297.4, akhlak/tasawuf 297.5, sejarah/tokoh 297.9, Al-Qur\'an/hadis 297.1);',
    'komik edukasi ikut topiknya; motivasi/self-help → 158; keuangan pribadi → 332.',
    'Buku:',
    daftar,
    'Jawab JSON saja: {"hasil":[{"i":<nomor buku>,"kelasDdc":"<kode>","alasan":"<maks 12 kata, bahasa Indonesia>","yakin":<0..1>}]}',
  ].join('\n');
}

const jawabanSchema = z.object({
  hasil: z.array(z.object({
    i: z.number().int(), kelasDdc: z.string(), alasan: z.string().default(''), yakin: z.number().catch(0.5),
  })),
});

/** Urai jawaban AI menjadi array sejajar input; kelas di luar daftar / indeks hilang → null. */
export function uraiJawaban(teks: string, jumlah: number): (UsulanKelas | null)[] {
  const hasil: (UsulanKelas | null)[] = Array(jumlah).fill(null);
  let json: unknown;
  try { json = JSON.parse(teks); } catch { return hasil; }
  const parsed = jawabanSchema.safeParse(json);
  if (!parsed.success) return hasil;
  for (const h of parsed.data.hasil) {
    if (h.i < 0 || h.i >= jumlah || !kelasSah(h.kelasDdc)) continue;
    hasil[h.i] = { kelasDdc: h.kelasDdc, alasan: h.alasan.slice(0, 160), yakin: Math.min(1, Math.max(0, h.yakin)) };
  }
  return hasil;
}

export async function usulkanKelas(buku: { judul: string; penulis: string }[], penggunaId: string): Promise<(UsulanKelas | null)[]> {
  const { teks } = await bacaDokumenAi({
    prompt: promptKlasifikasi(buku), berkas: null, modelPaksa: MODEL_KLASIFIKASI,
    konteks: { fitur: 'klasifikasi_buku', penggunaId },
  });
  return uraiJawaban(teks, buku.length);
}
