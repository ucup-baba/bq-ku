import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { DetailDonatur } from '@/components/donatur/DetailDonatur';

const donatur = {
  id: 'p1', nama: 'Aris Eko', sapaan: 'BAPAK' as const, noWa: '6281', alamat: 'Sleman', catatan: null, createdAt: '', updatedAt: '',
  donasi: [
    { id: 'd1', donaturId: 'p1', tanggal: '2026-09-20', jenis: 'INFAQ' as const, bentuk: 'UANG' as const, nominal: 20000, deskripsiBarang: null, keterangan: null, createdAt: '', createdBy: null },
  ],
};

describe('DetailDonatur', () => {
  const h = renderToStaticMarkup(<DetailDonatur donatur={donatur} />);
  it('satu tombol "Donasi lagi" dan tombol kembali berlabel', () => {
    expect(h.match(/Donasi lagi/g)).toHaveLength(1);
    expect(h).toContain('aria-label="Kembali ke daftar donatur"');
  });
  it('riwayat sebagai timeline', () => {
    expect(h).toContain('<ol');
    expect(h).toContain('Rp 20.000');
  });
});
