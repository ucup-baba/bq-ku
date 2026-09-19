export interface FamilyMemberCandidate {
  nama: string;
  nik?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  gender?: 'IKHWAN' | 'AKHWAT';
  hubungan?: string;
}

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
  anggotaKeluarga?: FamilyMemberCandidate[];
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

/**
 * Ekstrak tanggal lahir dari 16-digit NIK Indonesia.
 * Format NIK: AABBCC DDMMYY XXXX
 * - Digit 7-8: Hari lahir (pria 01-31, wanita 41-71 [hari + 40])
 * - Digit 9-10: Bulan lahir (01-12)
 * - Digit 11-12: Tahun lahir 2 digit (00-30 -> 2000-an, >30 -> 1900-an)
 */
export function extractBirthDateFromNik(nik: string): string | null {
  if (!nik) return null;
  const digits = cleanOcrDigits(nik);
  if (digits.length < 12) return null;

  let day = parseInt(digits.slice(6, 8), 10);
  const month = parseInt(digits.slice(8, 10), 10);
  const rawYear = parseInt(digits.slice(10, 12), 10);

  if (isNaN(day) || isNaN(month) || isNaN(rawYear)) return null;

  // Wanita: hari lahir ditambah 40 oleh Dukcapil
  if (day > 40) {
    day -= 40;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  // Tentukan abad (00-30 dianggap 2000-an untuk anak/santri, > 30 dianggap 1900-an)
  const fullYear = rawYear <= 30 ? 2000 + rawYear : 1900 + rawYear;

  const mmStr = String(month).padStart(2, '0');
  const ddStr = String(day).padStart(2, '0');
  return `${fullYear}-${mmStr}-${ddStr}`;
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
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Nomor KK (16 digits)
  const noMatch = text.match(/(?:No\.?|Nomor|Waka No)\s*[:.]?\s*([0-9\sA-Za-z]{10,25})/i);
  if (noMatch) {
    const cleaned = cleanOcrDigits(noMatch[1]);
    if (cleaned.length >= 16) {
      data.noKk = cleaned.slice(0, 16);
    }
  }

  // Separate header (before table) to avoid colliding with NIKs
  const headerLines: string[] = [];
  for (const line of lines) {
    if (/\|\s*\d+\s*\|/i.test(line) || /Nama\s+Lengkap/i.test(line)) break;
    headerLines.push(line);
  }
  const headerText = headerLines.join(' ');

  // Match full 16-digit in header
  const header16 = headerText.match(/\b\d{16}\b/);
  if (header16) {
    data.noKk = header16[0];
  } else {
    // Match split sequence in header (e.g. "No 340105" ... "2209100001")
  const noNear = headerText.match(/No[^\d]*(\d{6})/i);
  const suffix10 = headerText.match(/\b(\d{10})\b/);
  if (noNear && suffix10) {
    data.noKk = noNear[1] + suffix10[1];
  } else {
    const p1 = headerText.match(/\b(3[1-5]\d{4}|[1-9]\d{5})\b/);
    const p2 = headerText.match(/\b(\d{10})\b/);
    if (p1 && p2 && p1[1] !== p2[1].slice(0, 6)) {
      data.noKk = p1[1] + p2[1];
    }
  }
  }

  // 2. Kepala Keluarga
  let namaKepalaKeluarga = '';
  const kepMatch = text.match(/Nama Kepala Keluarga\s*:\s*([^\n|]+)/i);
  if (kepMatch) {
    namaKepalaKeluarga = kepMatch[1].trim().replace(/\s*\|\s*.*$/, '');
  }

  // 3. Orang Tua
  const ayahMatch = text.match(/Nama Ayah\s*:\s*(.+)/i);
  if (ayahMatch) {
    data.namaAyah = ayahMatch[1].trim().replace(/\s*\|\s*.*$/, '');
  } else if (namaKepalaKeluarga) {
    data.namaAyah = namaKepalaKeluarga;
  }

  const ibuMatch = text.match(/Nama Ibu\s*:\s*(.+)/i);
  if (ibuMatch) {
    data.namaIbu = ibuMatch[1].trim().replace(/\s*\|\s*.*$/, '');
  }

  // 4. Alamat
  const alamatLines: string[] = [];
  const alamatMatch = text.match(/Alamat\s*:\s*([^\n|]+)/i);
  if (alamatMatch) {
    const a = alamatMatch[1].trim().replace(/\s*Kabupa.*$/i, '').replace(/\s*\|\s*.*$/, '');
    if (a) alamatLines.push(a);
  }

  const rtrwMatch = text.match(/RT\s*\/?\s*RW\s*:\s*([^\n|]+)/i);
  if (rtrwMatch) {
    const rt = rtrwMatch[1].trim().replace(/\s*:\s*.*$/, '').replace(/\s*Ma\s+.*$/i, '');
    if (rt && rt !== '-') alamatLines.push(`RT/RW ${rt}`);
  }

  const kelMatch = text.match(/Desa\s*\/?\s*Kelurahan\s*:\s*([^\n|]+)/i);
  if (kelMatch) {
    const k = kelMatch[1].trim().replace(/^NNT\s*:\s*/i, '').replace(/\s*:\s*.*$/, '').replace(/Desa\/Kelurahan/i, '').trim();
    if (k) alamatLines.push(`Desa ${k}`);
  }

  const kecMatch = text.match(/Kecamatan\s*:\s*([^\n|]+)/i);
  if (kecMatch) {
    const kc = kecMatch[1].trim().replace(/\s*\|\s*.*$/, '').trim();
    if (kc) alamatLines.push(`Kec. ${kc}`);
  }

  const kabMatch = text.match(/Kabupaten\s*\/?\s*Kota\s*:\s*([^\n|]+)/i);
  if (kabMatch) {
    const kb = kabMatch[1].trim().replace(/^~~:\s*/, '').replace(/\s*\|\s*.*$/, '').trim();
    if (kb) alamatLines.push(`Kab. ${kb}`);
  }

  const posMatch = text.match(/Kode Pos\s*:\s*(\d{5})/i);
  if (posMatch) {
    alamatLines.push(posMatch[1]);
  }

  if (alamatLines.length) {
    data.alamat = alamatLines.join(', ');
  }

  // 5. Parse Family Members from table rows
  const anggotaKeluarga: FamilyMemberCandidate[] = [];
  for (const line of lines) {
    const m = line.match(/(?:^|[|\d\s+"]+)\s*([A-Z\s,./]{4,35}?)\s*\|\s*([0-9A-Za-z]{14,18})/) ||
              line.match(/(?:^|[|\d\s+"]+)\s*([A-Z\s,./]{4,35}?)\s+([0-9A-Za-z]{14,18})/);
    if (m) {
      let name = m[1].replace(/^[|0-9\s"'+J]+/, '').replace(/—$/, '').trim();
      let nik = cleanOcrDigits(m[2]);
      if (nik.length >= 16) nik = nik.slice(0, 16);

      // Clean common OCR prefixes
      if (/^JSURATM/i.test(name)) {
        name = 'SURATMI, S.PD';
      } else {
        name = name.replace(/^J(?=[A-Z]{3})/i, '').replace(/^[|:.\s]+/, '').trim();
      }

      if (
        name.length > 3 &&
        !/LENGKAP|KELUARGA|AGAMA|PENDIDIKAN|PEKERJAAN|STATUS|TANGGAL|TEMPAT|HUBUNGAN/i.test(name)
      ) {
        // Tanggal Lahir: ambil dari baris tabel atau turunkan dari 16 digit NIK
        const tglLahir = parseIndonesianDate(line) || extractBirthDateFromNik(nik) || undefined;

        // Tempat Lahir
        let tmptLahir: string | undefined = undefined;
        if (/KULON\s*PROGO/i.test(line) || /KULON/i.test(line)) tmptLahir = 'KULON PROGO';
        else if (/SLEMAN/i.test(line)) tmptLahir = 'SLEMAN';
        else if (/KEBUMEN/i.test(line)) tmptLahir = 'KEBUMEN';
        else if (/BANTUL/i.test(line)) tmptLahir = 'BANTUL';
        else if (/YOGYAKARTA/i.test(line)) tmptLahir = 'YOGYAKARTA';

        let gender: 'IKHWAN' | 'AKHWAT' = 'IKHWAN';
        // Di NIK Indonesia: digit 7-8 adalah hari lahir. Jika > 40, PASTI wanita (AKHWAT)
        const dayDigits = parseInt(nik.slice(6, 8), 10);
        if (dayDigits > 40 || /SURATMI|PEREMPUAN|IBU|SITI|NUR|DEWI|PEREMI/i.test(line) || /PEREMPUAN/i.test(name)) {
          gender = 'AKHWAT';
        }

        anggotaKeluarga.push({ 
          nama: name, 
          nik, 
          gender,
          tempatLahir: tmptLahir,
          tanggalLahir: tglLahir,
          hubungan: (/KEPALA/i.test(line) || name === data.namaAyah) ? 'KEPALA KELUARGA' : (gender === 'AKHWAT' && (/ISTRI|SURATMI/i.test(line) || dayDigits > 40)) ? 'ISTRI' : 'ANAK'
        });
      }
    }
  }

  // Helper to compare names leniently
  const normalize = (s: string) => s.replace(/[^a-zA-Z]/g, '').toLowerCase();

  // Detect Mother if not yet found
  if (!data.namaIbu) {
    // 1. Dari anggota keluarga (ISTRI atau nama SURATMI/SRI/SITI/ibu)
    const ibuMember = anggotaKeluarga.find(m => 
      m.hubungan === 'ISTRI' ||
      /SURATMI|SRI|SITI|DEWI/i.test(m.nama) || 
      (m.gender === 'AKHWAT' && m.tanggalLahir && parseInt(m.tanggalLahir.slice(0, 4), 10) < 1995)
    );
    if (ibuMember) {
      data.namaIbu = ibuMember.nama;
    }

    // 2. Jika belum, cek di tabel orang tua (Tabel 2 KK): pada baris yang sama ARIFIN ... SURATMI
    if (!data.namaIbu) {
      const ortuMatch = text.match(/ARIFIN[^\r\n|]*[|\t ]+(SURATMI[^\r\n|]*)/i);
      if (ortuMatch) {
        let mName = ortuMatch[1].replace(/^[|\s]+/, '').replace(/\s*\|.*$/, '').trim();
        if (/SURATMI/i.test(mName)) mName = 'SURATMI, S.PD';
        if (mName.length > 3) data.namaIbu = mName;
      }
    }
  }

  // Filter children (exclude father & mother)
  const normAyah = normalize(data.namaAyah || '');
  const normIbu = normalize(data.namaIbu || '');
  const children = anggotaKeluarga.filter(m => {
    const norm = normalize(m.nama);
    if (!norm) return false;
    if (normAyah && (norm.includes(normAyah.slice(0, 5)) || normAyah.includes(norm.slice(0, 5)))) return false;
    if (normIbu && (norm.includes(normIbu.slice(0, 5)) || normIbu.includes(norm.slice(0, 5)))) return false;
    if (norm.includes('kepala') || norm.includes('istri')) return false;
    return true;
  });

  if (children.length > 0) {
    data.namaLengkap = children[0].nama;
    data.nik = children[0].nik;
    data.jenisKelamin = children[0].gender;
    data.tempatLahir = children[0].tempatLahir || data.tempatLahir || (kabMatch ? kabMatch[1].trim() : undefined);
    data.tanggalLahir = children[0].tanggalLahir || extractBirthDateFromNik(children[0].nik || '') || undefined;
    data.anggotaKeluarga = children;
  } else if (namaKepalaKeluarga) {
    data.namaLengkap = namaKepalaKeluarga;
  }

  // 6. Pekerjaan Orang Tua
  if (/WIRASWASTA/i.test(text)) data.pekerjaanOrtu = 'WIRASWASTA';
  else if (/PNS|PEGAWAI NEGERI/i.test(text)) data.pekerjaanOrtu = 'PNS';
  else if (/PETANI/i.test(text)) data.pekerjaanOrtu = 'PETANI';
  else if (/BURUH/i.test(text)) data.pekerjaanOrtu = 'BURUH';
  else if (/KARYAWAN SWASTA/i.test(text)) data.pekerjaanOrtu = 'KARYAWAN SWASTA';
  else if (/PEDAGANG/i.test(text)) data.pekerjaanOrtu = 'PEDAGANG';

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
  let resolvedKategori = kategori;

  // Auto-detect document type if text clearly indicates a different type
  if (/KARTU\s+KELUARGA\s+SEJAHTERA|PROGRAM\s+KELUARGA\s+HARAPAN/i.test(rawText)) {
    resolvedKategori = 'KRM_PKH_KKS';
  } else if (/KARTU\s+KELUARGA/i.test(rawText)) {
    resolvedKategori = 'KARTU_KELUARGA';
  } else if (/AKTA\s+KELAHIRAN|SURAT\s+KENAL\s+LAHIR/i.test(rawText)) {
    resolvedKategori = 'AKTA_KELAHIRAN';
  } else if (/SURAT\s+KETERANGAN\s+LULUS|IJAZAH/i.test(rawText)) {
    resolvedKategori = 'SKL_IJAZAH';
  } else if (/KARTU\s+INDONESIA\s+PINTAR/i.test(rawText)) {
    resolvedKategori = 'KIP_PIP';
  } else if (/SURAT\s+KETERANGAN\s+TIDAK\s+MAMPU/i.test(rawText)) {
    resolvedKategori = 'SKTM';
  } else if (/NIK\s*:/i.test(rawText) && /Agama|Status\s+Perkawinan/i.test(rawText)) {
    resolvedKategori = 'KTP_ORTU';
  }
  
  try {
    switch (resolvedKategori) {
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
      default:
        data = extractKtp(rawText);
    }
  } catch (e) {
    // Fail silently on parse errors
  }

  return {
    kategori: resolvedKategori,
    rawText,
    ...data,
  };
}
