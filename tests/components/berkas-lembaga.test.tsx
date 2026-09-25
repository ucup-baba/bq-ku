import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/lib/supabase/client', () => ({ createBrowserSupabase: () => ({}) }));
import { KartuBerkas } from '@/components/lembaga/berkas/KartuBerkas';
import { DetailBerkas } from '@/components/lembaga/berkas/DetailBerkas';
import { FormTautan } from '@/components/lembaga/berkas/FormTautan';
import type { BerkasDenganVersi } from '@/lib/db/berkas-lembaga-repo';

const hariIni = new Date(2026, 8, 25);
const versi = { id: 'v2', berkasId: 'b1', versi: 2, storagePath: 'lembaga/x.pdf', namaFile: 'izin.pdf', mime: 'application/pdf' as const, ukuran: 200_000, createdAt: '2026-09-20T00:00:00Z', createdBy: null };
const berkas = (p: Partial<BerkasDenganVersi>): BerkasDenganVersi => ({
  id: 'b1', jenis: 'IZIN_OPERASIONAL', namaLainnya: null, nomorDokumen: '466/0574', tanggalTerbit: '2020-01-01',
  berlakuSampai: '2026-10-16', namaPenandatangan: null, createdAt: '', createdBy: null, updatedAt: '', versi: [versi], ...p,
});
const noop = () => {};
const kartu = (p: Parameters<typeof KartuBerkas>[0]) => renderToStaticMarkup(<KartuBerkas {...p} />);
const superadmin = { lihat: true, kelola: true, rahasia: true, hapus: true, aturSaklar: true };
const pengurus = { lihat: true, kelola: false, rahasia: false, hapus: false, aturSaklar: false };

describe('KartuBerkas', () => {
  it('belum diunggah: tombol Unggah hanya bila boleh', () => {
    const a = kartu({ jenis: 'NPWP', berkas: null, bolehUnggah: true, lihatRahasia: true, hariIni, onBuka: noop, onUnggah: noop });
    expect(a).toContain('Belum diunggah');
    expect(a).toContain('aria-label="Unggah NPWP"');
    expect(kartu({ jenis: 'NPWP', berkas: null, bolehUnggah: false, lihatRahasia: false, hariIni, onBuka: noop, onUnggah: noop })).not.toContain('Unggah NPWP');
  });
  it('masa berlaku 21 hari → Mendesak', () => {
    const h = kartu({ jenis: 'IZIN_OPERASIONAL', berkas: berkas({}), bolehUnggah: true, lihatRahasia: true, hariIni, onBuka: noop, onUnggah: noop });
    expect(h).toContain('Mendesak');
    expect(h).toContain('21 hari lagi');
    expect(h).toContain('466/0574 · v2');
  });
  it('rahasia bagi Pengurus: tersimpan, hanya Superadmin', () => {
    const h = kartu({ jenis: 'CAP', berkas: berkas({ jenis: 'CAP', berlakuSampai: null, versi: [] }), bolehUnggah: true, lihatRahasia: false, hariIni, onBuka: noop, onUnggah: noop });
    expect(h).toContain('hanya Superadmin');
    expect(h).toContain('aria-label="rahasia"');
  });
});

describe('DetailBerkas', () => {
  it('Superadmin: buka, unduh, riwayat versi, ganti versi, hapus', () => {
    const h = renderToStaticMarkup(<DetailBerkas b={berkas({})} hak={superadmin} onGantiVersi={noop} onUbah={noop} onTerhapus={noop} />);
    expect(h).toContain('href="/api/lembaga/berkas/b1/unduh?tampil=1"');
    expect(h).toContain('aria-label="Unduh versi 2"');
    expect(h).toContain('Ganti versi');
    expect(h).toContain('Hapus berkas');
  });
  it('Pengurus tanpa saklar: unduh ya, kelola & hapus tidak; cap terkunci', () => {
    const h = renderToStaticMarkup(<DetailBerkas b={berkas({})} hak={pengurus} onGantiVersi={noop} onUbah={noop} onTerhapus={noop} />);
    expect(h).toContain('Unduh');
    expect(h).not.toContain('Ganti versi');
    expect(h).not.toContain('Hapus berkas');
    const cap = renderToStaticMarkup(<DetailBerkas b={berkas({ jenis: 'CAP', versi: [] })} hak={pengurus} onGantiVersi={noop} onUbah={noop} onTerhapus={noop} />);
    expect(cap).toContain('hanya bisa dibuka Superadmin');
    expect(cap).not.toContain('/unduh');
  });
});

describe('FormTautan', () => {
  it('cap/tanda tangan & berkas tanpa versi tidak bisa dipilih; tanda air bawaan nyala', () => {
    const h = renderToStaticMarkup(<FormTautan onSelesai={noop} berkas={[
      berkas({ id: 'b1', jenis: 'NPWP' }), berkas({ id: 'b2', jenis: 'CAP' }), berkas({ id: 'b3', jenis: 'AKREDITASI', versi: [] }),
    ]} />);
    expect(h).toContain('NPWP');
    expect(h).not.toContain('Cap / stempel');
    expect(h).not.toContain('Sertifikat akreditasi');
    expect(h).toMatch(/Tanda air[\s\S]*?checked=""/);
  });
});
