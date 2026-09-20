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
