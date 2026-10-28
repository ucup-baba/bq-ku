import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SuratTemplate } from '@/components/donatur/SuratTemplate';
import { ASET_PRATINJAU } from '@/lib/surat/aset-klien';

const data = {
  nomorSurat: '1/PBQ/IX/2026', nomorUrut: '1', nomorBulanRomawi: 'IX', nomorTahunDuaDigit: '26', tanggalTeks: '25 September 2026',
  sapaan: 'BAPAK' as const, namaDonatur: 'Aris', barisNilai: { tipe: 'UANG' as const, rupiah: '10.000', terbilang: 'sepuluh ribu' },
  keterangan: null as string | null, alamat: null as string | null, gayaTulisan: 'KALAM' as const,
};

describe('SuratTemplate — pengesahan', () => {
  it('nama penandatangan dari aset (bawaan / Berkas lembaga); cap & tanda tangan tidak melar', () => {
    expect(renderToStaticMarkup(<SuratTemplate data={data} assets={ASET_PRATINJAU} />)).toContain('Aris Eko Purwanto, S.T');
    const h = renderToStaticMarkup(<SuratTemplate data={data} assets={{ ...ASET_PRATINJAU, namaPenandatangan: 'H. Fulan, S.Pd' }} />);
    expect(h).toContain('H. Fulan, S.Pd');
    expect(h).not.toContain('Aris Eko Purwanto');
    expect(h.match(/object-fit:contain/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('baris lokasi: alamat donatur, atau "di Tempat" bila kosong', () => {
    expect(renderToStaticMarkup(<SuratTemplate data={data} assets={ASET_PRATINJAU} />)).toContain('di Tempat');
    const h = renderToStaticMarkup(<SuratTemplate data={{ ...data, alamat: 'Jl. Kaliurang Km 14, Sleman' }} assets={ASET_PRATINJAU} />);
    expect(h).toContain('Jl. Kaliurang Km 14, Sleman');
    expect(h).not.toContain('di Tempat');
  });

  it('baris keterangan hanya dicetak bila diisi', () => {
    expect(renderToStaticMarkup(<SuratTemplate data={data} assets={ASET_PRATINJAU} />)).not.toContain('Keterangan');
    const h = renderToStaticMarkup(<SuratTemplate data={{ ...data, keterangan: 'Untuk pembangunan asrama' }} assets={ASET_PRATINJAU} />);
    expect(h).toContain('Keterangan');
    expect(h).toContain('Untuk pembangunan asrama');
  });
});
