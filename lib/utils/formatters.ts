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
  if (/SMA|SMK|MADRASAH\s+ALIYAH|\bMA\b|SEKOLAH\s+MENENGAH\s+ATAS|SEKOLAH\s+MENENGAH\s+KEJURUAN/i.test(s)) {
    return {
      jenjang: 'ALUMNI',
      kelas: 'Lulus 2024',
      sekolahSekarang: 'Alumni BQ / Perguruan Tinggi / Khidmah',
      label: 'Alumni (Lulusan SMA/SMK)',
      noticeText: `🎓 Terdeteksi asal sekolah tingkat SMA/SMK (${schoolName}): Jenjang otomatis disetel ke "ALUMNI" (Status: Lulus).`,
    };
  }

  // 2. Asal SMP / MTs -> Masuk SMA IT Baitul Qowwam (Kelas 10)
  if (/SMP|MTS|MADRASAH\s+TSANAWIYAH|SEKOLAH\s+MENENGAH\s+PERTAMA/i.test(s)) {
    return {
      jenjang: 'SMA',
      kelas: '10',
      sekolahSekarang: 'SMA IT Baitul Qowwam',
      label: 'SMA IT Baitul Qowwam (Kelas 10)',
      noticeText: `🎓 Terdeteksi lulusan SMP/MTs (${schoolName}): Santri baru jenjang SMA! Jenjang otomatis disetel ke "SMA" (Kelas 10 • SMA IT Baitul Qowwam).`,
    };
  }

  // 3. Asal SD / MI -> Masuk SMP IT Baitul Qowwam (Kelas 7)
  if (/SD|MI|MADRASAH\s+IBTIDAIYAH|SEKOLAH\s+DASAR/i.test(s)) {
    return {
      jenjang: 'SMP',
      kelas: '7',
      sekolahSekarang: 'SMP IT Baitul Qowwam',
      label: 'SMP IT Baitul Qowwam (Kelas 7)',
      noticeText: `🎓 Terdeteksi lulusan SD/MI (${schoolName}): Santri baru jenjang SMP! Jenjang otomatis disetel ke "SMP" (Kelas 7 • SMP IT Baitul Qowwam).`,
    };
  }

  return null;
}
