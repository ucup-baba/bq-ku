import { FamilyMemberCandidate } from '@/lib/ocr/parser';

/**
 * Mengubah string menjadi format Title Case (huruf awal kata besar)
 * Contoh: "muhammad hanif" -> "Muhammad Hanif"
 * Menangani gelar/singkatan umum secara wajar.
 */
export function toTitleCase(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      // Jika kata seperti S.Pd, S.T, Lc, dll.
      if (word.includes('.')) {
        return word
          .split('.')
          .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
          .join('.');
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Mencocokkan nama input santri dengan anggota keluarga dari dokumen (KK)
 * secara case-insensitive, token matching, & toleransi OCR noise (Levenshtein).
 * Contoh: "Rahmat Kurniawan" akan cocok dengan "Rama Kurmawan" atau "RAHMAT KURNIAWAN"
 */
export function matchBestFamilyMember(
  targetName: string,
  members: FamilyMemberCandidate[]
): FamilyMemberCandidate | null {
  if (!targetName || !targetName.trim() || !members || members.length === 0) {
    return null;
  }

  const cleanTarget = targetName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const targetTokens = cleanTarget.split(/\s+/).filter((t) => t.length >= 2);

  if (targetTokens.length === 0) return null;

  let bestMatch: FamilyMemberCandidate | null = null;
  let highestScore = 0;

  for (const member of members) {
    const cleanMember = member.nama.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const memberTokens = cleanMember.split(/\s+/).filter((t) => t.length >= 2);

    let score = 0;

    // Exact match
    if (cleanTarget === cleanMember) {
      score += 100;
    }

    // Token inclusion & fuzzy match
    for (const t of targetTokens) {
      if (cleanMember.includes(t)) {
        score += 25;
      }
      for (const mt of memberTokens) {
        if (t === mt) {
          score += 35;
        } else {
          const maxLen = Math.max(t.length, mt.length);
          const dist = levenshteinDistance(t, mt);
          if (dist <= 2 && maxLen >= 4) {
            score += 25;
          } else if (t.includes(mt) || mt.includes(t)) {
            score += 15;
          }
        }
      }
    }

    // Prioritize child over parents if relationship is known
    if (member.hubungan === 'ANAK') {
      score += 10;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = member;
    }
  }

  // Minimum score threshold to consider a valid match
  return highestScore >= 20 ? bestMatch : null;
}

/**
 * Menghitung umur secara presisi dari tanggal lahir (format YYYY-MM-DD atau date valid).
 * Mengembalikan objek umur { years, months, days, text } atau null jika tanggal tidak valid.
 * Contoh:
 * - "2006-08-11" -> { years: 18, months: 1, days: 10, text: "18 Tahun" }
 */
export function calculateAge(birthDateInput?: string | null): {
  years: number;
  months: number;
  days: number;
  text: string;
} | null {
  if (!birthDateInput) return null;

  // Mendukung format YYYY-MM-DD
  const parts = birthDateInput.split(/[-/]/);
  let birthDate: Date;
  if (parts.length === 3 && parts[0].length === 4) {
    birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    birthDate = new Date(birthDateInput);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  if (birthDate > today) return null; // tanggal di masa depan

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let text = '';
  if (years > 0) {
    if (months > 0 && years < 7) {
      text = `${years} Thn ${months} Bln`;
    } else {
      text = `${years} Tahun`;
    }
  } else if (months > 0) {
    text = `${months} Bulan`;
  } else {
    text = `${days} Hari`;
  }

  return { years, months, days, text };
}

/**
 * Format tanggal ke format Indonesia ramah dibaca.
 * Contoh: "2006-08-11" -> "11 Agustus 2006"
 */
export function formatDateIndonesian(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/[-/]/);
  let date: Date;
  if (parts.length === 3 && parts[0].length === 4) {
    date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  const day = date.getDate();
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Mengekstrak jam dan menit dari string ISO/timestamp.
 * Menghasilkan format "HH:mm" (mis. "14:25").
 */
export function formatJam(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${jam}:${menit}`;
}

/**
 * Menentukan otomatis jenjang pendidikan di Baitul Qowwam, kelas awal,
 * dan sekolah tujuan berdasarkan nama asal sekolah sebelumnya:
 * - Asal SD/MI -> Masuk SMP IT Baitul Qowwam (Kelas 7)
 * - Asal SMP/MTs -> Masuk SMA IT Baitul Qowwam (Kelas 10)
 * - Asal SMA/SMK/MA -> Lulusan menengah -> ALUMNI BQ (Lulus)
 */
export function deriveEducationFromPreviousSchool(schoolName?: string | null): {
  jenjang: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
  kelas: string;
  sekolahSekarang: string;
  label: string;
  noticeText: string;
} | null {
  if (!schoolName || !schoolName.trim()) return null;
  const s = schoolName.toUpperCase().trim();

  // 1. Asal SMA / SMK / MA -> Santri Purna / ALUMNI
  if (/\bSMA|\bSMK|MADRASAH\s+ALIYAH|\bMAN?\b|SEKOLAH\s+MENENGAH\s+ATAS|SEKOLAH\s+MENENGAH\s+KEJURUAN/i.test(s)) {
    return {
      jenjang: 'ALUMNI',
      kelas: `Lulus ${new Date().getFullYear()}`,
      sekolahSekarang: '',
      label: 'Alumni (Lulusan SMA/SMK)',
      noticeText: `Terdeteksi lulusan SMA/SMK (${schoolName}): Jenjang otomatis disetel ke "ALUMNI".`,
    };
  }

  // 2. Asal SMP / MTs -> Naik ke SMA (Kelas 10)
  if (/\bSMP|\bMTS|MADRASAH\s+TSANAWIYAH|SEKOLAH\s+MENENGAH\s+PERTAMA/i.test(s)) {
    return {
      jenjang: 'SMA',
      kelas: '10',
      sekolahSekarang: '',
      label: 'Jenjang SMA (Kelas 10)',
      noticeText: `Terdeteksi lulusan SMP/MTs (${schoolName}): Jenjang otomatis disetel ke "SMA" (Kelas 10).`,
    };
  }

  // 3. Asal SD / MI -> Naik ke SMP (Kelas 7)
  if (/\bSD|\bMIN?\b|MADRASAH\s+IBTIDAIYAH|SEKOLAH\s+DASAR/i.test(s)) {
    return {
      jenjang: 'SMP',
      kelas: '7',
      sekolahSekarang: '',
      label: 'Jenjang SMP (Kelas 7)',
      noticeText: `Terdeteksi lulusan SD/MI (${schoolName}): Jenjang otomatis disetel ke "SMP" (Kelas 7).`,
    };
  }

  return null;
}

/**
 * Jenjang & kelas dari satu berkas hasil OCR. Nama asal sekolah diutamakan,
 * lalu `jenjangTerdeteksi`. Berkas tanpa info sekolah (KK, KTP, dsb.) → null,
 * supaya tidak menimpa jenjang yang sudah ditetapkan berkas sekolah.
 */
export function deriveEducationFromDocument(ext: {
  kategori?: string;
  asalSekolahSebelumnya?: string;
  jenjangTerdeteksi?: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
  tahunLulus?: string;
}): { jenjang: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI'; kelas: string; noticeText: string } | null {
  // Kolom pendidikan KK ("TAMAT SD/SEDERAJAT") dsb. bukan jenjang calon santri.
  if (ext.kategori && ['KARTU_KELUARGA', 'KTP_ORTU', 'AKTA_KELAHIRAN'].includes(ext.kategori)) return null;
  const dariNama = deriveEducationFromPreviousSchool(ext.asalSekolahSebelumnya);
  const jenjang = dariNama?.jenjang ?? ext.jenjangTerdeteksi;
  if (!jenjang) return null;
  const kelas = jenjang === 'ALUMNI'
    ? `Lulus ${ext.tahunLulus || new Date().getFullYear()}`
    : jenjang === 'SMP' ? '7' : '10';
  const noticeText = dariNama?.noticeText ?? (
    jenjang === 'ALUMNI' ? 'Terdeteksi jenjang ALUMNI! Status disesuaikan ke Lulusan SMA/SMK.'
    : `Terdeteksi jenjang ${jenjang}! Jenjang disetel ke ${jenjang} (Kelas ${kelas}).`
  );
  return { jenjang, kelas, noticeText };
}

/**
 * Memeriksa apakah nama santri di formulir cocok dengan nama yang terdeteksi di dokumen.
 * Menghasilkan isMatch = false jika dokumen terindikasi kuat milik santri yang berbeda.
 */
export function checkNameMatch(
  nameInForm?: string | null,
  nameInDoc?: string | null
): { isMatch: boolean; confidence: number; reason?: string } {
  if (!nameInForm || !nameInForm.trim()) {
    return { isMatch: true, confidence: 100, reason: 'Formulir belum memiliki nama santri.' };
  }
  if (!nameInDoc || !nameInDoc.trim()) {
    return { isMatch: true, confidence: 50, reason: 'Dokumen tidak memiliki deteksi nama calon santri.' };
  }

  const clean = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(muhammad|muh|mhd|mohammed|ahmad|achmad|m)\b/g, 'm')
      .replace(/\s+/g, ' ')
      .trim();

  const strA = clean(nameInForm);
  const strB = clean(nameInDoc);

  // 1. Identik persis setelah normalisasi
  if (strA === strB) {
    return { isMatch: true, confidence: 100, reason: 'Nama identik sempurna.' };
  }

  // 2. Salah satu string mengandung string lainnya secara utuh (contoh: "Hanif" di dalam "Muhammad Hanif")
  if (strA.length >= 3 && strB.length >= 3 && (strA.includes(strB) || strB.includes(strA))) {
    return { isMatch: true, confidence: 90, reason: 'Nama merupakan bagian dari nama lengkap dokumen.' };
  }

  const tokensA = strA.split(' ').filter(t => t.length >= 2);
  const tokensB = strB.split(' ').filter(t => t.length >= 2);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { isMatch: true, confidence: 50 };
  }

  // Hitung jumlah token yang sama persis atau sangat mirip
  let sharedTokens = 0;

  for (const ta of tokensA) {
    if (ta === 'm') continue;

    for (const tb of tokensB) {
      if (tb === 'm') continue;

      if (ta === tb) {
        sharedTokens++;
        break;
      } else if (ta.length >= 4 && tb.length >= 4 && levenshteinDistance(ta, tb) <= 1) {
        sharedTokens += 0.8;
        break;
      }
    }
  }

  const realTokensA = tokensA.filter(t => t !== 'm').length;
  const realTokensB = tokensB.filter(t => t !== 'm').length;
  const realMax = Math.max(realTokensA, realTokensB, 1);

  const confidence = Math.round((sharedTokens / realMax) * 100);

  if (sharedTokens === 0) {
    return {
      isMatch: false,
      confidence: 0,
      reason: `Nama di dokumen "${nameInDoc}" berbeda dengan nama santri "${nameInForm}".`,
    };
  }

  if (sharedTokens >= 1) {
    return { isMatch: true, confidence: Math.max(confidence, 70), reason: 'Ditemukan kesesuaian kata nama.' };
  }

  return {
    isMatch: false,
    confidence,
    reason: `Tingkat kecocokan nama rendah (${confidence}%). Kemungkinan santri yang berbeda.`,
  };
}

/**
 * Memformat string angka 16 digit (NIK / No KK) menjadi kelompok 4 digit dengan spasi
 * Contoh: "3404145501100001" -> "3404 1455 0110 0001"
 */
export function formatNikDisplay(val?: string | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

const LABEL_ALAMAT = /\b(?:DUSUN|DSN|DESA\s*\/\s*KELURAHAN|DESA|KELURAHAN|KEL|KECAMATAN|KEC|KABUPATEN\s*\/\s*KOTA|KABUPATEN|KAB|PROVINSI|PROV)\b\.?/gi;
const SINGKATAN_ALAMAT = /^(?:RT|RW|RT\/RW|DIY|DKI|NTB|NTT|[IVX]{1,4})$/i;

/**
 * Alamat KK → ringkas & enak dibaca: label (Dusun, Desa/Kelurahan, Kecamatan,
 * Kabupaten/Kota, Provinsi) dibuang, nama berulang dirapatkan, dan HURUF KAPITAL
 * semua diubah ke Kapital Awal Kata (singkatan & angka Romawi tetap kapital).
 * Alamat yang sudah memuat huruf kecil dipertahankan penulisan hurufnya.
 */
export function rapikanAlamat(alamat?: string | null): string {
  if (!alamat?.trim()) return '';
  const semuaKapital = alamat === alamat.toUpperCase();
  const bagian = alamat.split(',').map((b) => {
    const kata = b.replace(LABEL_ALAMAT, ' ').trim().split(/\s+/).filter(Boolean);
    // "DOMBAN DUSUN. DOMBAN" → setelah label dibuang "DOMBAN DOMBAN" → "DOMBAN"
    const separuh = kata.length / 2;
    const ulang = kata.length % 2 === 0 && kata.slice(0, separuh).join(' ').toLowerCase() === kata.slice(separuh).join(' ').toLowerCase();
    return (ulang ? kata.slice(0, separuh) : kata).join(' ');
  }).filter((b, i, arr) => b && b.toLowerCase() !== arr[i - 1]?.toLowerCase());
  const hasil = bagian.join(', ');
  if (!semuaKapital) return hasil;
  return hasil.split(' ').map((k) =>
    SINGKATAN_ALAMAT.test(k.replace(/[.,]/g, '')) || /\d/.test(k) ? k : k.charAt(0) + k.slice(1).toLowerCase()
  ).join(' ');
}

/** NIK untuk tampilan publik/cetak: 4 digit awal & akhir saja, mis. "3404 •••• •••• 0001". */
export function samarkanNik(val?: string | null): string {
  const digits = (val ?? '').replace(/\D/g, '');
  if (digits.length < 8) return digits ? '•'.repeat(digits.length) : '';
  return `${digits.slice(0, 4)} •••• •••• ${digits.slice(-4)}`;
}

/**
 * Membersihkan input menjadi hanya angka murni (maksimal panjang tertentu jika ditentukan)
 */
export function cleanNumericInput(val: string, maxLen?: number): string {
  const digits = val.replace(/\D/g, '');
  return maxLen ? digits.slice(0, maxLen) : digits;
}
