import { describe, it, expect } from 'vitest';
import { tandaiDonaturBaru } from '@/lib/donatur/tandai-donatur-baru';

describe('tandaiDonaturBaru', () => {
  it('donatur lama dari ?donaturId (nama & id terisi sekaligus) -> false', () => {
    expect(tandaiDonaturBaru({
      modeBaru: true,
      namaSebelumnya: '',
      donaturIdSebelumnya: undefined,
      donaturIdSekarang: 'donatur-lama-1',
    })).toBe(false);
  });

  it('donatur baru setelah nama diketik lalu id terisi -> true', () => {
    expect(tandaiDonaturBaru({
      modeBaru: true,
      namaSebelumnya: 'Budi Santoso',
      donaturIdSebelumnya: undefined,
      donaturIdSekarang: 'donatur-baru-1',
    })).toBe(true);
  });

  it('id dikosongkan -> false', () => {
    expect(tandaiDonaturBaru({
      modeBaru: true,
      namaSebelumnya: 'Budi Santoso',
      donaturIdSebelumnya: 'donatur-baru-1',
      donaturIdSekarang: undefined,
    })).toBe(false);
  });

  it('bukan mode baru (memilih dari hasil pencarian) -> false meski nama terisi', () => {
    expect(tandaiDonaturBaru({
      modeBaru: false,
      namaSebelumnya: 'Budi Santoso',
      donaturIdSebelumnya: undefined,
      donaturIdSekarang: 'donatur-lama-2',
    })).toBe(false);
  });

  it('donaturId sebelumnya sudah terisi (bukan transisi baru) -> false', () => {
    expect(tandaiDonaturBaru({
      modeBaru: true,
      namaSebelumnya: 'Budi Santoso',
      donaturIdSebelumnya: 'donatur-baru-1',
      donaturIdSekarang: 'donatur-baru-1',
    })).toBe(false);
  });
});
