import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { PerluDilengkapi } from '@/components/santri/beranda/PerluDilengkapi';
import { SantriTerbaru } from '@/components/santri/beranda/SantriTerbaru';
import { HeroSantri } from '@/components/santri/beranda/HeroSantri';
import { CarouselAngkaSantri } from '@/components/santri/beranda/CarouselAngkaSantri';

const s = (id: string, nama: string) => ({ id, namaLengkap: nama, jenjang: 'SMP' as const, kelas: '7', kontakWali: '0812', documents: [{ kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED' }] });
const ringkasan = { total: 3, ikhwan: 2, akhwat: 1, smp: 1, smaSmk: 1, alumni: 1, berkasLengkap: 0 };

describe('Beranda Santri', () => {
  it('Perlu dilengkapi kosong → pesan sukses', () => {
    expect(renderToStaticMarkup(<PerluDilengkapi santri={[]} />)).toContain('Semua berkas wajib sudah lengkap');
  });
  it('Perlu dilengkapi berisi → tautan ke tab berkas & keterangan kurang', () => {
    const h = renderToStaticMarkup(<PerluDilengkapi santri={[s('a', 'Ahmad')]} />);
    expect(h).toContain('href="/santri/a?tab=berkas"');
    expect(h).toContain('kurang Akta, KTP Ortu, SKL');
    expect(h).toContain('Ingatkan wali lewat WhatsApp');
  });
  it('Santri terbaru: item ke-3 disembunyikan di HP', () => {
    const h = renderToStaticMarkup(<SantriTerbaru santri={[s('a', 'A'), s('b', 'B'), s('c', 'C')] as never} />);
    expect(h.match(/<li class="hidden md:block"/g)).toHaveLength(1);
  });
  it('tidak ada tautan ganda ke /tambah di komponen beranda', () => {
    const semua = [
      renderToStaticMarkup(<HeroSantri ringkasan={ringkasan} />),
      renderToStaticMarkup(<CarouselAngkaSantri ringkasan={ringkasan} />),
      renderToStaticMarkup(<PerluDilengkapi santri={[s('a', 'A')]} />),
      renderToStaticMarkup(<SantriTerbaru santri={[s('a', 'A')] as never} />),
    ].join('');
    expect(semua).not.toContain('href="/tambah"');
  });
});
