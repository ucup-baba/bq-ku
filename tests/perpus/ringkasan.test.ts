import { describe, it, expect } from 'vitest';
import { hitungRingkasan } from '@/lib/perpus/ringkasan';

it('menghitung judul, eksemplar, audit, infaq, pengadaan, saldo, donatur unik', () => {
  const r = hitungRingkasan(
    [{ eksemplar: 2, statusKode: 'baku', aktif: true }, { eksemplar: 1, statusKode: 'perlu_audit', aktif: true }, { eksemplar: 5, statusKode: 'baku', aktif: false }],
    [{ jenis: 'uang', jumlah: 6000, nama: 'Raihan' }, { jenis: 'uang', jumlah: 10000, nama: 'raihan ' }, { jenis: 'buku', jumlah: null, nama: 'Bu Siti' }],
    [{ total: 5000 }],
  );
  expect(r).toEqual({ judul: 2, eksemplar: 3, perluAudit: 1, totalInfaq: 16000, totalPengadaan: 5000, saldo: 11000, donatur: 2 });
});
