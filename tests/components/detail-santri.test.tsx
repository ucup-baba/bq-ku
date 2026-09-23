import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=berkas'),
  usePathname: () => '/santri/s1',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { DetailSantri } from '@/components/profile/DetailSantri';

const santri = {
  id: 's1', namaLengkap: 'Ahmad Faiz', nik: '3404000000000001', tempatLahir: 'Sleman', tanggalLahir: '2010-01-01',
  jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP IT BQ',
  documents: [{ id: 'd1', santriId: 's1', kategori: 'KARTU_KELUARGA', storagePath: 'x', fileUrl: 'https://x/kk.jpg', statusVerifikasi: 'VERIFIED' }],
} as never;

describe('DetailSantri', () => {
  const h = renderToStaticMarkup(<DetailSantri santri={santri} />);
  it('judul nama, tombol Edit, tab Berkas aktif dari ?tab=berkas', () => {
    expect(h).toMatch(/<h1[^>]*>Ahmad Faiz<\/h1>/);
    expect(h).toContain('href="/santri/s1/edit"');
    expect(h).toMatch(/aria-pressed="true"[^>]*>Berkas 1\/4/);
  });
  it('berkas kurang → Lengkapi berkas; baris KK bisa dipratinjau', () => {
    expect(h).toContain('Lengkapi berkas');
    expect(h).toContain('aria-label="Lihat Kartu Keluarga"');
    expect(h).not.toMatch(/text-\[1[01]px\]/);
  });
});
