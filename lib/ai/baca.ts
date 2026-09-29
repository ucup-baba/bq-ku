import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Penyedia, PilihanModel } from './model';
import { AiBatasError, cekBatas } from './batas';
import { hitungBiaya } from './biaya';
import { bacaSetelanAi } from './setelan';
import { ambilRingkasanPemakaian, catatPemakaian, type FiturAi } from './pemakaian';
import { panggilGemini } from './penyedia/gemini';
import { panggilOpenai } from './penyedia/openai';
import type { BerkasAi, HasilPanggil } from './penyedia/tipe';

export type KonteksAi = { fitur: FiturAi; penggunaId: string | null };

const BATAS_PER_PANGGILAN_MS = 60_000;
const SISA_MIN_CADANGAN_MS = 5_000;

const PANGGIL: Record<Penyedia, (model: string, prompt: string, berkas: BerkasAi, batasMs: number) => Promise<HasilPanggil>> = {
  openai: panggilOpenai,
  gemini: panggilGemini,
};

/** Buang pagar ```json dan pastikan JSON valid; jawaban tak valid dianggap gagal (memicu cadangan). */
function jsonBersih(teks: string): string {
  const bersih = teks.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  JSON.parse(bersih);
  return bersih;
}

/**
 * Satu pindai: cek batas → penyedia utama → cadangan (bila ada & sisa waktu cukup).
 * Setiap percobaan dicatat ke pemakaian_ai dengan idPermintaan yang sama.
 */
export async function bacaDokumenAi({ prompt, berkas, konteks, batasTotalMs = BATAS_PER_PANGGILAN_MS }: {
  prompt: string; berkas: BerkasAi; konteks: KonteksAi; batasTotalMs?: number;
}): Promise<{ teks: string; penyedia: Penyedia; model: string }> {
  const setelan = await bacaSetelanAi();
  const pemakaian = await ambilRingkasanPemakaian().catch(() => ({ pindaiHariIni: 0, biayaBulanIni: 0 }));
  const cek = cekBatas(pemakaian, setelan);
  if (!cek.boleh) throw new AiBatasError(cek.alasan);

  const idPermintaan = randomUUID();
  const mulai = Date.now();
  const urutan: [PilihanModel, 'utama' | 'cadangan'][] = [[setelan.utama, 'utama']];
  if (setelan.cadangan) urutan.push([setelan.cadangan, 'cadangan']);
  const galat: string[] = [];

  for (const [pilihan, peran] of urutan) {
    const sisa = batasTotalMs - (Date.now() - mulai);
    if (peran === 'cadangan' && sisa < SISA_MIN_CADANGAN_MS) break;
    let hasil: HasilPanggil | null = null;
    try {
      hasil = await PANGGIL[pilihan.penyedia](pilihan.model, prompt, berkas, Math.min(BATAS_PER_PANGGILAN_MS, sisa));
      const teks = jsonBersih(hasil.teks);
      await catatPemakaian({
        idPermintaan, waktu: new Date().toISOString(), penggunaId: konteks.penggunaId, fitur: konteks.fitur, peran,
        penyedia: pilihan.penyedia, model: pilihan.model, tokenMasuk: hasil.tokenMasuk, tokenKeluar: hasil.tokenKeluar,
        biayaRp: hitungBiaya(hasil.tokenMasuk, hasil.tokenKeluar, setelan.harga[pilihan.model]), berhasil: true, galat: null,
      });
      return { teks, penyedia: pilihan.penyedia, model: pilihan.model };
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e);
      galat.push(`${pilihan.penyedia}/${pilihan.model}: ${pesan}`);
      console.warn(`[ai] ${peran} ${pilihan.penyedia}/${pilihan.model} gagal: ${pesan}`);
      await catatPemakaian({
        idPermintaan, waktu: new Date().toISOString(), penggunaId: konteks.penggunaId, fitur: konteks.fitur, peran,
        penyedia: pilihan.penyedia, model: pilihan.model, tokenMasuk: hasil?.tokenMasuk ?? 0, tokenKeluar: hasil?.tokenKeluar ?? 0,
        biayaRp: hasil ? hitungBiaya(hasil.tokenMasuk, hasil.tokenKeluar, setelan.harga[pilihan.model]) : null,
        berhasil: false, galat: pesan.slice(0, 300),
      });
    }
  }
  throw new Error(`Semua penyedia AI gagal: ${galat.join(' | ')}`);
}
