import path from 'path';
import fs from 'fs';

export interface FileNamingOptions {
  tahunMasuk?: number | string | null;
  jenisKelamin?: string | null;
  namaSantri?: string | null;
  kategori?: string | null;
  originalFileName?: string | null;
  ext?: string | null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getKategoriShorthand(kategori?: string | null): string {
  if (!kategori) return 'berkas';
  const k = kategori.toUpperCase().trim();

  if (k.includes('KARTU_KELUARGA') || k === 'KK') return 'kk';
  if (k.includes('KTP_ORTU') || k.includes('KTP')) return 'ktp-ortu';
  if (k.includes('AKTA_KELAHIRAN') || k.includes('AKTA')) return 'akta';
  if (k.includes('SKL_IJAZAH') || k.includes('IJAZAH') || k.includes('SKL')) return 'ijazah';
  if (k.includes('KIP_PIP') || k.includes('KIP') || k.includes('PIP')) return 'kip';
  if (k.includes('KRM_PKH_KKS') || k.includes('KRM') || k.includes('PKH') || k.includes('KKS')) return 'krm';
  if (k.includes('SKTM')) return 'sktm';
  if (k.includes('SERTIFIKAT')) return 'sertifikat';
  if (k.includes('FOTO_FORMAL') || k.includes('FORMAL')) return 'foto-formal';
  if (k.includes('FOTO_PROFIL') || k.includes('PROFIL') || k.includes('CV')) return 'foto-profil';

  return slugify(kategori) || 'berkas';
}

export function generateStandardizedFileName(options: FileNamingOptions, uploadDir?: string): string {
  const currentYear = new Date().getFullYear();
  const tahun = options.tahunMasuk ? String(options.tahunMasuk).trim() : String(currentYear);
  
  const gRaw = (options.jenisKelamin || '').toLowerCase();
  const gender = /akhwat|perempuan|wanita|f/i.test(gRaw) ? 'akhwat' : 'ikhwan';

  const rawNama = options.namaSantri || '';
  const namaSlug = slugify(rawNama) || 'santri';

  const ketFile = getKategoriShorthand(options.kategori);

  let extension = options.ext || (options.originalFileName ? path.extname(options.originalFileName) : '.jpg');
  if (!extension.startsWith('.')) extension = `.${extension}`;
  extension = extension.toLowerCase();

  const baseName = `${tahun}_${gender}_${namaSlug}_${ketFile}`;
  let finalName = `${baseName}${extension}`;

  // If uploadDir provided, ensure unique filename without accidental overwrites
  if (uploadDir && fs.existsSync(path.join(uploadDir, finalName))) {
    let counter = 1;
    while (fs.existsSync(path.join(uploadDir, `${baseName}_${counter}${extension}`))) {
      counter++;
    }
    finalName = `${baseName}_${counter}${extension}`;
  }

  return finalName;
}
