const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function bulanRomawi(bulan: number): string {
  if (bulan < 1 || bulan > 12) throw new Error('Bulan harus 1-12');
  return ROMAWI[bulan];
}

/** 270 + 2026-09-21 -> "270/PBQ/IX/2026" */
export function formatNomorSurat(urut: number, tanggal: Date | string): string {
  const d = typeof tanggal === 'string' ? new Date(tanggal + (tanggal.length === 10 ? 'T00:00:00' : '')) : tanggal;
  return `${urut}/PBQ/${bulanRomawi(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function parseNomorSurat(nomor: string): { urut: number; bulan: number; tahun: number } | null {
  const m = /^(\d+)\/PBQ\/([IVX]+)\/(\d{4})$/.exec(nomor.trim());
  if (!m) return null;
  const bulan = ROMAWI.indexOf(m[2]);
  if (bulan < 1) return null;
  return { urut: Number(m[1]), bulan, tahun: Number(m[3]) };
}
