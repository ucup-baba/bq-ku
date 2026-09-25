import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { BagianRingkasan } from '@/components/lembaga/BagianRingkasan';
import { hitungRingkasan, type InputRingkasan } from '@/lib/lembaga/ringkasan';

const dasar: InputRingkasan = {
  hariIni: new Date(2026, 8, 25),
  periode: { dari: '2026-09-01', sampai: '2026-09-30' },
  santri: [{ id: 's2', namaLengkap: 'Aisyah', jenjang: 'SMA', jenisKelamin: 'AKHWAT', statusSosial: 'YATIM' }],
  statusBerkas: new Map(),
  donasi: [{ donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'UANG', nominal: 12_500_000, jenis: 'ZIS' }],
  jumlahDonatur: 7,
  surat: [{ tanggalSurat: '2026-09-05', terkirimWa: false }],
};
const tampil = (i: InputRingkasan, berkasNull = false) => {
  const r = hitungRingkasan(i);
  return renderToStaticMarkup(<BagianRingkasan r={berkasNull ? { ...r, berkas: null } : r} periode="bulan-ini" onPeriode={() => {}} onUnduh={() => {}} />);
};

describe('BagianRingkasan', () => {
  const h = tampil(dasar);
  it('kalimat ringkasan di kartu utama', () => {
    expect(h).toContain('Ringkasan yayasan · Sep 2026');
    expect(h).toContain('1 santri aktif');
    expect(h).toContain('Rp 12,5 jt donasi');
    expect(h).toContain('2 hal perlu perhatian');
  });
  it('pilihan periode & unduh CSV ada di kartu utama', () => {
    expect(h).toContain('aria-label="Periode"');
    expect(h).toContain('aria-label="Unduh ringkasan (CSV)"');
  });
  it('perlu perhatian menaut ke halaman Lembaga', () => {
    expect(h).toContain('1 santri berkasnya belum lengkap');
    expect(h).toContain('href="/lembaga/surat?status=BELUM"');
    expect(h).toContain('Berkas lembaga');
  });
  it('kelengkapan: santri belum lengkap menuju detail Lembaga', () => {
    expect(h).toContain('href="/lembaga/santri/s2"');
    expect(h).toContain('0 dari 1 santri aktif');
  });
  it('komposisi akad menggantikan kartu donasi periode (tanpa "Lainnya 1×")', () => {
    expect(h).toContain('Komposisi akad');
    expect(h).not.toContain('Donasi periode ini');
    expect(h).toContain('Tren 12 bulan');
  });
  it('santri kosong: pesan kosong, tanpa batang nol & tanpa "0 dari 0"', () => {
    const k = tampil({ ...dasar, santri: [], surat: [] });
    expect(k).toContain('Belum ada santri terdaftar');
    expect(k).toContain('Belum ada santri aktif');
    expect(k).not.toContain('0 dari 0');
    expect(k).toContain('Semua beres');
  });
  it('status berkas gagal dimuat → pesan, bagian lain tetap', () => {
    const t = tampil(dasar, true);
    expect(t).toContain('Status berkas tidak dapat dimuat');
    expect(t).toContain('Rp 12,5 jt donasi');
  });
  it('komposisi akad tidak menampilkan akad barang sebagai 0%', () => {
    const t = tampil({ ...dasar, donasi: [{ donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'BARANG', nominal: null, jenis: 'LAINNYA' }] });
    expect(t).toContain('Belum ada data');
    expect(t).not.toMatch(/Lainnya[\s\S]{0,120}0%/);
  });
});
