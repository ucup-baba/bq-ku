import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { House, Plus } from '@phosphor-icons/react/dist/ssr';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { TombolIkon, TautanUtama } from '@/components/ui/Tombol';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { DoodleCoretan, DoodleLingkaran } from '@/components/ui/DoodleStickers';
import { kelasField } from '@/components/ui/kelas';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('IkonUbin', () => {
  it('dekoratif (aria-hidden), memakai warna ubin & doodle yang bisa bergoyang', () => {
    const h = html(<IkonUbin ikon={House} warna="biru" doodle="bintang" />);
    expect(h).toContain('aria-hidden="true"');
    expect(h).toContain('bg-sky-100');
    expect(h).toContain('doodle-goyang');
  });
});

describe('TombolIkon', () => {
  it('tautan & tombol selalu punya aria-label', () => {
    expect(html(<TombolIkon ikon={Plus} label="Tambah donatur" href="/x" />)).toContain('aria-label="Tambah donatur"');
    expect(html(<TombolIkon ikon={Plus} label="Tutup" />)).toMatch(/<button[^>]*aria-label="Tutup"/);
  });
});

describe('TautanUtama', () => {
  it('tidak menambahkan teks "+" di samping ikon', () => {
    const h = html(<TautanUtama href="/donatur/surat/baru" ikon={Plus}>Buat Surat</TautanUtama>);
    expect(h).toContain('Buat Surat');
    expect(h).not.toMatch(/>\s*\+/);
  });
});

describe('ChipPilihan', () => {
  it('menandai pilihan aktif dengan aria-pressed dan grup berlabel', () => {
    const h = html(
      <ChipPilihan label="Periode" nilai="b" onPilih={() => {}} opsi={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', jumlah: 3 }]} />,
    );
    expect(h).toContain('role="group"');
    expect(h).toContain('aria-label="Periode"');
    expect(h).toMatch(/aria-pressed="true"[^>]*>B/);
    expect(h).toContain('>3<');
  });
});

describe('KepalaHalaman', () => {
  it('judul sebagai h1 dan tombol kembali berlabel', () => {
    const h = html(<KepalaHalaman judul="Donatur" sub="Cari donatur" kembali={{ href: '/donatur', label: 'Kembali' }} />);
    expect(h).toMatch(/<h1[^>]*>Donatur<\/h1>/);
    expect(h).toContain('aria-label="Kembali"');
    expect(h).toContain('hidden sm:block');
  });
  it('sub bisa selalu tampil di HP', () => {
    const h = html(<KepalaHalaman judul="Ruang Donatur" sub="Assalamu'alaikum" subTampilDiHp />);
    expect(h).not.toContain('hidden sm:block');
  });
});

describe('Doodle baru', () => {
  it('punya path yang bisa digambar', () => {
    expect(html(<DoodleCoretan />)).toContain('data-doodle-garis');
    expect(html(<DoodleLingkaran />)).toContain('data-doodle-garis');
  });
});

describe('kelasField', () => {
  it('menambah border merah saat ada galat', () => {
    expect(kelasField('wajib diisi')).toContain('border-rose-400');
    expect(kelasField()).not.toContain('border-rose-400');
  });
});
