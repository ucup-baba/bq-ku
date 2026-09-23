import { describe, it, expect } from 'vitest';
import { tandaiDonaturBaru } from '@/lib/donatur/tandai-donatur-baru';
import { labelSapaan } from '@/lib/surat/data';

describe('PilihDonatur logic & integrations', () => {
  it('labelSapaan memformat semua pilihan sapaan donatur dengan benar', () => {
    expect(labelSapaan('BAPAK')).toBe('Bapak');
    expect(labelSapaan('IBU')).toBe('Ibu');
    expect(labelSapaan('SDR')).toBe('Sdr.');
    expect(labelSapaan('SDRI')).toBe('Sdri.');
    expect(labelSapaan('BAPAK_IBU')).toBe('Bapak/Ibu');
  });

  it('alur combobox pencarian: memilih donatur terdaftar tidak memicu label donatur baru', () => {
    // Pengguna mencari "Aris", hasil ditemukan, modeBaru tetap false
    const ditandai = tandaiDonaturBaru({
      modeBaru: false,
      namaSebelumnya: 'Aris',
      donaturIdSebelumnya: undefined,
      donaturIdSekarang: 'donatur-lama-123',
    });
    expect(ditandai).toBe(false);
  });

  it('alur mode baru: membuat donatur baru memicu label donatur baru sudah tersimpan', () => {
    // Pengguna membuka modeBaru: true, mengetik "H. Ahmad", lalu donaturId terisi setelah simpan
    const ditandai = tandaiDonaturBaru({
      modeBaru: true,
      namaSebelumnya: 'H. Ahmad',
      donaturIdSebelumnya: undefined,
      donaturIdSekarang: 'donatur-baru-456',
    });
    expect(ditandai).toBe(true);
  });

  it('ganti donatur mereset status donatur tersimpan', () => {
    const ditandai = tandaiDonaturBaru({
      modeBaru: false,
      namaSebelumnya: '',
      donaturIdSebelumnya: 'donatur-baru-456',
      donaturIdSekarang: undefined,
    });
    expect(ditandai).toBe(false);
  });
});
