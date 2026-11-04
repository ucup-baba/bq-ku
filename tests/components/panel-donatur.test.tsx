import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelDonatur } from '@/components/perpus-publik/PanelDonatur';
import type { DonasiPublik, RingkasanPublik } from '@/lib/perpus/tipe';

const ringkasan: RingkasanPublik = { judul: 1, eksemplar: 1, donatur: 2, totalInfaq: 1500000, totalPengadaan: 500000, saldo: 1000000, sedangDipinjam: 0 };
const donasi: DonasiPublik[] = [
  { id: '1', tanggal: '2026-03-05', tanggalTeks: null, nama: 'Fulan', jenis: 'uang', jumlahBuku: null, buku: [] },
  { id: '2', tanggal: null, tanggalTeks: 'Ramadhan', nama: 'Fulanah', jenis: 'buku', jumlahBuku: 2, buku: [{ idPendek: 'abcd1234', judul: 'Bumi' }] },
  { id: '3', tanggal: null, tanggalTeks: null, nama: 'Hamba Allah', jenis: 'buku', jumlahBuku: 3, buku: [] },
];
const render = (tab: 'infaq' | 'wakaf') => renderToStaticMarkup(<PanelDonatur lang="id" tab={tab} donasi={donasi} ringkasan={ringkasan} />);

describe('PanelDonatur', () => {
  it('Infaq: nama & tanggal, nominal hanya di ringkasan', () => {
    const html = render('infaq');
    expect(html).toContain('Fulan');
    expect(html).toContain('5 Mar 2026');
    expect(html).not.toContain('Fulanah');
    expect(html).toContain('Rp1.500.000');
    expect(html.match(/Rp/g)).toHaveLength(3);
  });
  it('Wakaf: judul tertaut ke katalog; tanpa tautan → jumlah buku', () => {
    const html = render('wakaf');
    expect(html).toContain('href="/id/buku/abcd1234"');
    expect(html).toContain('3 buku');
  });
  it('tab aktif ditandai', () => {
    expect(render('wakaf')).toMatch(/aria-current="true"[^>]*>Wakaf buku/);
  });
});
