export type DokRingkas = { kategori: string; statusVerifikasi: string };

export const BERKAS_WAJIB = [
  { kategori: 'KARTU_KELUARGA', label: 'Kartu Keluarga', pendek: 'KK' },
  { kategori: 'AKTA_KELAHIRAN', label: 'Akta Kelahiran', pendek: 'Akta' },
  { kategori: 'KTP_ORTU', label: 'KTP Orang Tua', pendek: 'KTP Ortu' },
  { kategori: 'SKL_IJAZAH', label: 'SKL / Ijazah', pendek: 'SKL' },
] as const;

export const BERKAS_PENDUKUNG = [
  { kategori: 'KIP_PIP', label: 'KIP / PIP', pendek: 'KIP' },
  { kategori: 'KRM_PKH_KKS', label: 'KRM / PKH / KKS', pendek: 'KRM' },
  { kategori: 'SKTM', label: 'SKTM', pendek: 'SKTM' },
  { kategori: 'SERTIFIKAT_PRESTASI', label: 'Sertifikat Prestasi', pendek: 'Sertifikat' },
  { kategori: 'LAINNYA', label: 'Lainnya', pendek: 'Lainnya' },
] as const;

export type StatusBerkas = { ada: number; total: number; kurang: string[]; perluPerbaikan: string[]; lengkap: boolean };

/**
 * Kelengkapan 4 berkas wajib. Dokumen DITOLAK dihitung belum ada; dokumen
 * PERLU PERBAIKAN dihitung ada tetapi membuat berkas belum lengkap.
 */
export function statusBerkas(docs: DokRingkas[] | undefined): StatusBerkas {
  const kurang: string[] = [];
  const perluPerbaikan: string[] = [];
  let ada = 0;
  for (const w of BERKAS_WAJIB) {
    const d = (docs ?? []).find(x => x.kategori === w.kategori && x.statusVerifikasi !== 'REJECTED');
    if (!d) { kurang.push(w.pendek); continue; }
    ada += 1;
    if (d.statusVerifikasi === 'NEED_FIX') perluPerbaikan.push(w.pendek);
  }
  return { ada, total: BERKAS_WAJIB.length, kurang, perluPerbaikan, lengkap: kurang.length === 0 && perluPerbaikan.length === 0 };
}

type SantriRingkas = { jenisKelamin: string; jenjang: string; documents?: DokRingkas[] };

export function ringkasanSantri(list: SantriRingkas[]) {
  return {
    total: list.length,
    ikhwan: list.filter(s => s.jenisKelamin === 'IKHWAN').length,
    akhwat: list.filter(s => s.jenisKelamin === 'AKHWAT').length,
    smp: list.filter(s => s.jenjang === 'SMP').length,
    smaSmk: list.filter(s => s.jenjang === 'SMA' || s.jenjang === 'SMK').length,
    alumni: list.filter(s => s.jenjang === 'ALUMNI').length,
    berkasLengkap: list.filter(s => statusBerkas(s.documents).lengkap).length,
  };
}

export type RingkasanSantri = ReturnType<typeof ringkasanSantri>;

/** Santri yang berkas wajibnya belum lengkap; urutan masukan (terbaru dulu) dipertahankan. */
export function perluDilengkapi<T extends { documents?: DokRingkas[] }>(list: T[], maks = 5): T[] {
  return list.filter(s => !statusBerkas(s.documents).lengkap).slice(0, maks);
}
