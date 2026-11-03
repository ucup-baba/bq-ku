import { describe, it, expect } from 'vitest';
import {
  kodePengarang, kodeJudul, susunNomorPanggil, uraiNomorPanggil, selesaikanBentrok, NomorBentrokError,
} from '@/lib/perpus/nomor-panggil';

describe('kodePengarang', () => {
  it.each([
    ['Tere Liye', 'LIY'], ['Felix Y Siauw', 'SIA'], ['J.S. Khairen', 'KHA'], ['Habiburrahman El Shirazy', 'SHI'],
    ['@terimakasihayah', 'TER'], ['Ibnu Qayyim Al-Jauziyyah', 'JAU'], ['Dr. M. Zainuri Nur,M.S.I.', 'NUR'],
    ['Dr. Muhammad Fahd Ats-Tsuwaini', 'TSU'], ['Aan Wulandari U.', 'WUL'], ['Sahal Fikri,dkk', 'FIK'],
    ['Ulin Nuha, M.Pd.I.', 'NUH'], ['Abu Ahmad, Lc & Abu Fahya', 'AHM'], ['Ichiro Kishimi & Fumitake Koga', 'KIS'],
    ['Penerbit Andi', 'AND'], ['Sir Arthur Conan Doyle', 'DOY'], ['Orwell;', 'ORW'], ['(Herman Melville)', 'MEL'],
    ['Abu al-Qosim an-Naisaburi', 'NAI'], ['Susy Ong', 'ONG'], ['', ''],
  ])('%s → %s', (penulis, kode) => expect(kodePengarang(penulis)).toBe(kode));
});

describe('kodeJudul', () => {
  it('huruf pertama, artikel Inggris & awalan penerbit dilewati', () => {
    expect(kodeJudul('Bumi')).toBe('b');
    expect(kodeJudul('The Power of Habit')).toBe('p');
    expect(kodeJudul('Penerbit Andi - Crazy Corel')).toBe('c');
    expect(kodeJudul('[Mizan] Para Pencari Ilmu')).toBe('p');
    expect(kodeJudul('A')).toBe('a');
  });
  it('panjang melintasi kata', () => {
    expect(kodeJudul('Rasa', 2)).toBe('ra');
    expect(kodeJudul('Si Anak Badai', 3)).toBe('sia');
  });
});

describe('susun & urai', () => {
  it('susun dengan dan tanpa seri', () => {
    expect(susunNomorPanggil({ kelasDdc: '899.221', kodePengarang: 'LIY', kodeJudul: 'b', noSeri: 1 })).toBe('899.221 LIY b.01');
    expect(susunNomorPanggil({ kelasDdc: '823', kodePengarang: 'ORW', kodeJudul: 'a', noSeri: null })).toBe('823 ORW a');
  });
  it('urai kode lama yang tidak rapi', () => {
    expect(uraiNomorPanggil('158 NUR  T')).toEqual({ kelasDdc: '158', kodePengarang: 'NUR', kodeJudul: 't', noSeri: null });
    expect(uraiNomorPanggil('813 LIY b.01')).toEqual({ kelasDdc: '813', kodePengarang: 'LIY', kodeJudul: 'b', noSeri: 1 });
    expect(uraiNomorPanggil('004 AND Si ')).toEqual({ kelasDdc: '004', kodePengarang: 'AND', kodeJudul: 'si', noSeri: null });
    expect(uraiNomorPanggil('500 YAH p.10')?.noSeri).toBe(10);
    expect(uraiNomorPanggil('TMP-0001')).toBeNull();
    expect(uraiNomorPanggil('')).toBeNull();
  });
});

describe('selesaikanBentrok', () => {
  const dasar = { kelasDdc: '899.221', kodePengarang: 'LIY', judul: 'Rasa', seri: null };
  it('tanpa bentrok memakai 1 huruf', () => {
    expect(selesaikanBentrok(dasar, new Set()).nomorPanggil).toBe('899.221 LIY r');
  });
  it('bentrok → huruf judul diperpanjang', () => {
    const h = selesaikanBentrok(dasar, new Set(['899.221 LIY r']));
    expect(h).toEqual({ kelasDdc: '899.221', kodePengarang: 'LIY', kodeJudul: 'ra', noSeri: null, nomorPanggil: '899.221 LIY ra' });
  });
  it('semua perpanjangan terpakai → angka', () => {
    const terpakai = new Set(['332 KIY b', '332 KIY bu', '332 KIY bus', '332 KIY busi']);
    expect(selesaikanBentrok({ kelasDdc: '332', kodePengarang: 'KIY', judul: 'The Business School', seri: null }, terpakai).nomorPanggil)
      .toBe('332 KIY b2');
  });
  it('seri memakai kode seri; bentrok seri melempar', () => {
    const seri = { kelasDdc: '823', kodePengarang: 'DOY', judul: 'Seri Sherlock Holmes 3', seri: { kode: 's', nomor: 3 } };
    expect(selesaikanBentrok(seri, new Set()).nomorPanggil).toBe('823 DOY s.03');
    expect(() => selesaikanBentrok(seri, new Set(['823 DOY s.03']))).toThrow(NomorBentrokError);
  });
});
