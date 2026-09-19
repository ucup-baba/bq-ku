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

/**
 * Mencocokkan nama input santri dengan anggota keluarga dari dokumen (KK)
 * secara case-insensitive & token matching.
 * Contoh: "hanif" atau "Muhammad Hanif" akan mencocokkan "MUHAMMAD HANIF"
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

    // Token inclusion
    for (const t of targetTokens) {
      if (cleanMember.includes(t)) {
        score += 20;
      }
      if (memberTokens.includes(t)) {
        score += 30;
      }
    }

    // Prioritize child over parents if relationship is known
    if (member.hubungan === 'ANAK') {
      score += 5;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = member;
    }
  }

  // Minimum score threshold to consider a valid match
  return highestScore >= 20 ? bestMatch : null;
}
