import { describe, it, expect } from 'vitest';
import { sesuaikanDenganSantri } from '@/lib/ocr/anggota-santri';
import type { FamilyMemberCandidate } from '@/lib/ocr/parser';

const kk = {
  noKk: '3310000000000001', namaAyah: 'Ahmad Allaydrus',
  // Pilihan OCR untuk "calon santri" jatuh ke anak lain.
  namaLengkap: 'CINDELARAS ALLAYDRUS', nik: '3310000000000003', tempatLahir: 'KLATEN', tanggalLahir: '2012-01-01', jenisKelamin: 'AKHWAT' as const,
  anggotaKeluarga: [
    { nama: 'AHMAD ALLAYDRUS', nik: '3310000000000002', hubungan: 'KEPALA KELUARGA' },
    { nama: 'CINDELARAS ALLAYDRUS', nik: '3310000000000003', hubungan: 'ANAK', gender: 'PEREMPUAN' },
    { nama: 'KHOTIJAH ALLAYDRUS', nik: '3310000000000004', tempatLahir: 'SOLO', tanggalLahir: '2010-05-06', hubungan: 'ANAK', gender: 'PEREMPUAN' },
  ] as FamilyMemberCandidate[],
};

describe('sesuaikanDenganSantri', () => {
  it('memakai data anggota yang cocok dengan nama ketikan (ejaan lama pun cocok)', () => {
    const h = sesuaikanDenganSantri('Chotidjah Allaydrus', kk);
    expect(h).toMatchObject({ namaLengkap: 'KHOTIJAH ALLAYDRUS', nik: '3310000000000004', tempatLahir: 'SOLO', tanggalLahir: '2010-05-06', jenisKelamin: 'AKHWAT' });
  });
  it('tak ada yang cocok: data pribadi anak lain dikosongkan, data keluarga tetap', () => {
    const h = sesuaikanDenganSantri('Zahra Allaydrus', kk);
    expect(h.namaLengkap).toBeUndefined();
    expect(h.nik).toBeUndefined();
    expect(h.tanggalLahir).toBeUndefined();
    expect(h).toMatchObject({ noKk: '3310000000000001', namaAyah: 'Ahmad Allaydrus' });
  });
  it('tanpa nama ketikan: hasil OCR apa adanya', () => {
    expect(sesuaikanDenganSantri('', kk)).toBe(kk);
  });
});
