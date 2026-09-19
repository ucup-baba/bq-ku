export interface ExtractedDocumentData {
  kategori: string;
  nik?: string; // 16 digits
  noKk?: string; // 16 digits
  nisn?: string; // 10 digits
  namaLengkap?: string;
  tempatLahir?: string;
  tanggalLahir?: string; // ISO format YYYY-MM-DD
  jenisKelamin?: 'IKHWAN' | 'AKHWAT';
  namaAyah?: string;
  namaIbu?: string;
  pekerjaanOrtu?: string;
  alamat?: string;
  asalSekolahSebelumnya?: string;
  nomorDokumen?: string;
  rawText?: string;
  confidence?: number;
}

export function cleanOcrDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[OlIzZBSGAqD]/gi, (match) => {
    switch (match.toUpperCase()) {
      case 'O':
      case 'D': // not in regex but often 0
        return '0';
      case 'I':
      case 'L':
        return '1';
      case 'Z':
        return '2';
      case 'S':
        return '5';
      case 'B':
        return '8';
      case 'G':
        return '6';
      case 'A':
        return '4';
      case 'Q':
        return '9';
      default:
        return match;
    }
  }).replace(/\D/g, ''); // keep only digits just in case, or maybe not if we just want to replace specific letters. The prompt says: corrects 'O'/'D' -> '0', 'I'/'l' -> '1', etc. for numeric codes.
}

const MONTHS: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
};

export function parseIndonesianDate(input: string): string | null {
  if (!input) return null;
  
  // Try DD-MM-YYYY or DD/MM/YYYY
  let match = input.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }

  // Try text months
  match = input.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const monthName = match[2].toLowerCase();
    const m = MONTHS[monthName];
    if (m) {
      const y = match[3];
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

function extractKtp(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};
  
  const nikMatch = text.match(/NIK\s*:\s*([0-9A-Za-z]+)/i);
  if (nikMatch) data.nik = cleanOcrDigits(nikMatch[1]).slice(0, 16);

  const namaMatch = text.match(/Nama\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  const ttlMatch = text.match(/Tempat\/Tgl Lahir\s*:\s*([^,]+),\s*(.+)/i);
  if (ttlMatch) {
    data.tempatLahir = ttlMatch[1].trim();
    const parsedDate = parseIndonesianDate(ttlMatch[2].trim());
    if (parsedDate) data.tanggalLahir = parsedDate;
  }

  const jkMatch = text.match(/Jenis Kelamin\s*:\s*(.+)/i);
  if (jkMatch) {
    const jk = jkMatch[1].trim().toUpperCase();
    if (jk.includes('LAKI')) data.jenisKelamin = 'IKHWAN';
    else if (jk.includes('PEREMPUAN')) data.jenisKelamin = 'AKHWAT';
  }

  const alamatLines = [];
  const alamatMatch = text.match(/Alamat\s*:\s*(.+)/i);
  if (alamatMatch) alamatLines.push(alamatMatch[1].trim());
  const kelMatch = text.match(/Kel\/Desa\s*:\s*(.+)/i);
  if (kelMatch) alamatLines.push(kelMatch[1].trim());
  const kecMatch = text.match(/Kecamatan\s*:\s*(.+)/i);
  if (kecMatch) alamatLines.push(kecMatch[1].trim());
  if (alamatLines.length) data.alamat = alamatLines.join(', ');

  const kerjaMatch = text.match(/Pekerjaan\s*:\s*(.+)/i);
  if (kerjaMatch) data.pekerjaanOrtu = kerjaMatch[1].trim();

  return data;
}

function extractKk(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};
  
  const noMatch = text.match(/No\.\s*([0-9A-Za-z]+)/i);
  if (noMatch) data.noKk = cleanOcrDigits(noMatch[1]).slice(0, 16);

  const namaMatch = text.match(/Nama Kepala Keluarga\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  const ibuMatch = text.match(/Nama Ibu\s*:\s*(.+)/i);
  if (ibuMatch) data.namaIbu = ibuMatch[1].trim();

  const ayahMatch = text.match(/Nama Ayah\s*:\s*(.+)/i);
  if (ayahMatch) data.namaAyah = ayahMatch[1].trim();

  const alamatLines = [];
  const alamatMatch = text.match(/Alamat\s*:\s*(.+)/i);
  if (alamatMatch) alamatLines.push(alamatMatch[1].trim());
  const kelMatch = text.match(/Desa\/Kelurahan\s*:\s*(.+)/i);
  if (kelMatch) alamatLines.push(kelMatch[1].trim());
  const kecMatch = text.match(/Kecamatan\s*:\s*(.+)/i);
  if (kecMatch) alamatLines.push(kecMatch[1].trim());
  if (alamatLines.length) data.alamat = alamatLines.join(', ');

  return data;
}

function extractAkta(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};

  const noMatch = text.match(/Nomor\s*([0-9A-Z-]+)/i);
  if (noMatch) data.nomorDokumen = noMatch[1].trim();

  const namaMatch = text.match(/Telah lahir\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  const tempatMatch = text.match(/Bahwa di\s*:\s*(.+)/i);
  if (tempatMatch) data.tempatLahir = tempatMatch[1].trim();

  const tglMatch = text.match(/Pada tanggal\s*:\s*(.+)/i);
  if (tglMatch) {
    const parsedDate = parseIndonesianDate(tglMatch[1].trim());
    if (parsedDate) data.tanggalLahir = parsedDate;
  }

  const ayahMatch = text.match(/Dari ayah\s*:\s*(.+)/i);
  if (ayahMatch) data.namaAyah = ayahMatch[1].trim();

  const ibuMatch = text.match(/Dan ibu\s*:\s*(.+)/i);
  if (ibuMatch) data.namaIbu = ibuMatch[1].trim();

  return data;
}

function extractSkl(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};

  const noMatch = text.match(/Nomor\s*:\s*(.+)/i);
  if (noMatch) data.nomorDokumen = noMatch[1].trim();

  const namaMatch = text.match(/Nama\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  const ttlMatch = text.match(/Tempat dan Tanggal Lahir\s*:\s*([^,]+),\s*(.+)/i);
  if (ttlMatch) {
    data.tempatLahir = ttlMatch[1].trim();
    const parsedDate = parseIndonesianDate(ttlMatch[2].trim());
    if (parsedDate) data.tanggalLahir = parsedDate;
  }

  const nisnMatch = text.match(/Nomor Induk Siswa Nasional\s*:\s*([0-9A-Za-z]+)/i);
  if (nisnMatch) data.nisn = cleanOcrDigits(nisnMatch[1]).slice(0, 10);

  const sekolahMatch = text.match(/Kepala\s+(SMP\s+.+|MTs\s+.+|SD\s+.+)/i);
  if (sekolahMatch) data.asalSekolahSebelumnya = sekolahMatch[1].trim();

  return data;
}

function extractKip(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};
  
  const noMatch = text.match(/Nomor KIP\s*:\s*(.+)/i);
  if (noMatch) data.nomorDokumen = noMatch[1].trim();

  const namaMatch = text.match(/Nama\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  const asalMatch = text.match(/Asal Sekolah\s*:\s*(.+)/i);
  if (asalMatch) data.asalSekolahSebelumnya = asalMatch[1].trim();

  return data;
}

function extractKks(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};
  
  const noMatch = text.match(/Nomor Kartu\s*:\s*(.+)/i);
  if (noMatch) data.nomorDokumen = noMatch[1].trim();

  const namaMatch = text.match(/Nama Peserta\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  return data;
}

function extractSktm(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};
  
  const noMatch = text.match(/Nomor Surat\s*:\s*(.+)/i);
  if (noMatch) data.nomorDokumen = noMatch[1].trim();

  const namaMatch = text.match(/Nama\s*:\s*(.+)/i);
  if (namaMatch) data.namaLengkap = namaMatch[1].trim();

  return data;
}

export function parseOcrText(rawText: string, kategori: string): ExtractedDocumentData {
  let data: Partial<ExtractedDocumentData> = {};
  
  try {
    switch (kategori) {
      case 'KTP_ORTU':
        data = extractKtp(rawText);
        break;
      case 'KARTU_KELUARGA':
        data = extractKk(rawText);
        break;
      case 'AKTA_KELAHIRAN':
        data = extractAkta(rawText);
        break;
      case 'SKL_IJAZAH':
        data = extractSkl(rawText);
        break;
      case 'KIP_PIP':
        data = extractKip(rawText);
        break;
      case 'KRM_PKH_KKS':
        data = extractKks(rawText);
        break;
      case 'SKTM':
        data = extractSktm(rawText);
        break;
    }
  } catch (e) {
    // Fail silently on parse errors
  }

  return {
    kategori,
    rawText,
    ...data,
  };
}
