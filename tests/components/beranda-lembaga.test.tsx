import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { BagianRingkasan } from '@/components/lembaga/BagianRingkasan';
import { hitungRingkasan } from '@/lib/lembaga/ringkasan';

const r = hitungRingkasan({
  hariIni: new Date(2026, 8, 25),
  periode: { dari: '2026-09-01', sampai: '2026-09-30' },
  santri: [{ id: 's2', namaLengkap: 'Aisyah', jenjang: 'SMA', jenisKelamin: 'AKHWAT', statusSosial: 'YATIM' }],
  statusBerkas: new Map(),
  donasi: [{ donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'UANG', nominal: 150000, jenis: 'ZIS' }],
  jumlahDonatur: 7,
  surat: [{ tanggalSurat: '2026-09-05', terkirimWa: false }],
});

describe('BagianRingkasan', () => {
  const h = renderToStaticMarkup(<BagianRingkasan r={r} />);
  it('angka utama', () => {
    expect(h).toContain('Rp 150.000');
    expect(h).toContain('>7<');
  });
  it('santri belum lengkap menuju detail Lembaga', () => {
    expect(h).toContain('href="/lembaga/santri/s2"');
    expect(h).toContain('0 dari 1 santri aktif lengkap');
  });
  it('surat belum terkirim menuju daftar surat Lembaga tersaring', () => {
    expect(h).toContain('href="/lembaga/surat?status=BELUM"');
  });
  it('kartu berkas lembaga segera hadir & tren 12 bulan', () => {
    expect(h).toContain('Berkas lembaga');
    expect(h).toContain('Segera hadir');
    expect(h).toContain('Tren 12 bulan');
  });
  it('status berkas gagal dimuat → pesan, bagian lain tetap', () => {
    const t = renderToStaticMarkup(<BagianRingkasan r={{ ...r, berkas: null }} />);
    expect(t).toContain('Status berkas tidak dapat dimuat');
    expect(t).toContain('Rp 150.000');
  });
});
