import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { TombolKirimWa } from '@/components/donatur/TombolKirimWa';
import { StatusSurat } from '@/components/donatur/StatusSurat';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

const surat = {
  id: 's1', donasiId: 'd1', nomorSurat: '1/PBQ/IX/2026', tanggalSurat: '2026-09-23', gayaTulisan: 'KALAM',
  storagePath: null, terkirimWa: false, dikirimAt: null, createdAt: '', createdBy: null,
  donasi: {
    id: 'd1', donaturId: 'p1', tanggal: '2026-09-23', jenis: 'INFAQ', bentuk: 'UANG', nominal: 20000, deskripsiBarang: null,
    keterangan: null, createdAt: '', createdBy: null,
    donatur: { id: 'p1', nama: 'Aris', sapaan: 'BAPAK', noWa: '6281', alamat: null, catatan: null, createdAt: '', updatedAt: '' },
  },
} as SuratWithRelasi;

describe('TombolKirimWa', () => {
  it('saat tidak aktif: tombol berlabel "Kirim WA" nonaktif dan tanpa tombol Unduh', () => {
    const h = renderToStaticMarkup(<TombolKirimWa surat={surat} aktif={false} />);
    expect(h).toContain('Kirim WA');
    expect(h).toMatch(/<button[^>]*disabled/);
    expect(h).not.toContain('Unduh');
  });
});

describe('StatusSurat', () => {
  it('menampilkan status dengan teks', () => {
    expect(renderToStaticMarkup(<StatusSurat terkirim />)).toContain('Terkirim');
    expect(renderToStaticMarkup(<StatusSurat terkirim={false} />)).toContain('Belum dikirim');
  });
});
