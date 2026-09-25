import { describe, it, expect } from 'vitest';
import { JENIS_BERKAS, jenisRahasia, labelJenisBerkas, statusMasaBerlaku, sisaHari, validasiUnggah, UKURAN_MAKS } from '@/lib/lembaga/berkas';

const hariIni = new Date(2026, 8, 25);
const tambah = (hari: number) => { const d = new Date(2026, 8, 25 + hari); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('jenis berkas', () => {
  it('daftar tetap + Lainnya; cap & tanda tangan rahasia', () => {
    expect(JENIS_BERKAS.map(j => j.kunci)).toContain('NPWP');
    expect(JENIS_BERKAS.at(-1)?.kunci).toBe('LAINNYA');
    expect(jenisRahasia('CAP')).toBe(true);
    expect(jenisRahasia('TANDA_TANGAN')).toBe(true);
    expect(jenisRahasia('NPWP')).toBe(false);
    expect(labelJenisBerkas('IZIN_OPERASIONAL')).toBe('Izin operasional');
  });
});

describe('statusMasaBerlaku', () => {
  it('ambang 90 / 30 hari / lewat, tanpa batas bila kosong', () => {
    expect(statusMasaBerlaku(null, hariIni)).toBe('tanpa-batas');
    expect(statusMasaBerlaku(tambah(91), hariIni)).toBe('berlaku');
    expect(statusMasaBerlaku(tambah(90), hariIni)).toBe('segera');
    expect(statusMasaBerlaku(tambah(31), hariIni)).toBe('segera');
    expect(statusMasaBerlaku(tambah(30), hariIni)).toBe('mendesak');
    expect(statusMasaBerlaku(tambah(0), hariIni)).toBe('mendesak');
    expect(statusMasaBerlaku(tambah(-1), hariIni)).toBe('kedaluwarsa');
    expect(sisaHari(tambah(21), hariIni)).toBe(21);
  });
});

describe('validasiUnggah', () => {
  it('PDF/JPG/PNG ≤ 10 MB; cap & tanda tangan PNG saja', () => {
    expect(validasiUnggah({ jenis: 'NPWP', mime: 'application/pdf', ukuran: 1000 })).toBeNull();
    expect(validasiUnggah({ jenis: 'NPWP', mime: 'image/jpeg', ukuran: 1000 })).toBeNull();
    expect(validasiUnggah({ jenis: 'NPWP', mime: 'application/zip', ukuran: 1000 })).toMatch(/PDF, JPG, atau PNG/);
    expect(validasiUnggah({ jenis: 'NPWP', mime: 'application/pdf', ukuran: UKURAN_MAKS + 1 })).toMatch(/10 MB/);
    expect(validasiUnggah({ jenis: 'CAP', mime: 'image/jpeg', ukuran: 1000 })).toMatch(/PNG/);
    expect(validasiUnggah({ jenis: 'TANDA_TANGAN', mime: 'image/png', ukuran: 1000 })).toBeNull();
    expect(validasiUnggah({ jenis: 'BOS', mime: 'image/png', ukuran: 1000 })).toMatch(/Jenis/);
  });
});
