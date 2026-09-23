import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { KartuHero } from '@/components/donatur/beranda/KartuHero';
import { DonasiTerbaru } from '@/components/donatur/beranda/DonasiTerbaru';
import { PerluDikirim } from '@/components/donatur/beranda/PerluDikirim';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

const buatSurat = (id: string, nama: string): SuratWithRelasi => ({
  id, donasiId: 'd' + id, nomorSurat: `${id}/PBQ/IX/2026`, tanggalSurat: '2026-09-23', gayaTulisan: 'KALAM',
  storagePath: null, terkirimWa: false, dikirimAt: null, createdAt: '', createdBy: null,
  donasi: {
    id: 'd' + id, donaturId: 'p' + id, tanggal: '2026-09-23', jenis: 'INFAQ', bentuk: 'UANG', nominal: 20000, deskripsiBarang: null,
    keterangan: null, createdAt: '', createdBy: null,
    donatur: { id: 'p' + id, nama, sapaan: 'BAPAK', noWa: '6281', alamat: null, catatan: null, createdAt: '', updatedAt: '' },
  },
});

describe('KartuHero', () => {
  it('chip periode + tombol ⋯ berlabel, tanpa tautan Buat Surat', () => {
    const h = renderToStaticMarkup(
      <KartuHero total={240000} memuat={false} keterangan="Sep 2026 · naik dari Agu" pilihan="bulan-ini"
        onPilih={() => {}} onBukaPeriode={() => {}} tren={[1, 2, 3]} />,
    );
    expect(h).toContain('Rp 240.000');
    expect(h).toContain('aria-label="Periode lain &amp; unduh CSV"');
    expect(h).toMatch(/aria-pressed="true"[^>]*>.*Bulan/);
    expect(h).not.toContain('/donatur/surat/baru"');
    expect(h).toContain('<polyline');
  });
});

describe('DonasiTerbaru', () => {
  it('baris ke-3 dst disembunyikan di HP; tanpa tautan ganda ke daftar donatur', () => {
    const h = renderToStaticMarkup(
      <DonasiTerbaru status="siap" galat={null} surat={[buatSurat('1', 'Aris'), buatSurat('2', 'Budi'), buatSurat('3', 'Citra')]} />,
    );
    expect(h.match(/<li class="hidden md:block"/g)).toHaveLength(1);
    expect(h).not.toContain('href="/donatur/daftar"');
    expect(h).toContain('aria-label="Donasi lagi dari Aris"');
    expect(h).toContain('data-audit-daftar');
  });
});

describe('PerluDikirim', () => {
  it('kosong → pesan sukses dan tautan Arsip surat', () => {
    const h = renderToStaticMarkup(<PerluDikirim status="siap" galat={null} surat={[]} onTerkirim={() => {}} />);
    expect(h).toContain('Semua surat sudah terkirim');
    expect(h).toContain('href="/donatur/surat"');
  });
  it('ada surat → tautan "n surat" ke filter Belum dikirim', () => {
    const h = renderToStaticMarkup(<PerluDikirim status="siap" galat={null} surat={[buatSurat('1', 'Aris'), buatSurat('2', 'Budi')]} onTerkirim={() => {}} />);
    expect(h).toContain('href="/donatur/surat?status=BELUM"');
    expect(h).toContain('2 surat');
  });
});
