import type { Buku, DonasiPerpus, Pengadaan, RingkasanPerpus } from '@/lib/perpus/tipe';

export function hitungRingkasan(
  buku: Pick<Buku, 'eksemplar' | 'statusKode' | 'aktif'>[],
  donasi: Pick<DonasiPerpus, 'jenis' | 'jumlah' | 'nama'>[],
  pengadaan: Pick<Pengadaan, 'total'>[],
): RingkasanPerpus {
  const aktif = buku.filter(b => b.aktif);
  const totalInfaq = donasi.reduce((s, d) => s + (d.jenis === 'uang' ? d.jumlah ?? 0 : 0), 0);
  const totalPengadaan = pengadaan.reduce((s, p) => s + p.total, 0);
  return {
    judul: aktif.length,
    eksemplar: aktif.reduce((s, b) => s + b.eksemplar, 0),
    perluAudit: aktif.filter(b => b.statusKode === 'perlu_audit').length,
    totalInfaq, totalPengadaan, saldo: totalInfaq - totalPengadaan,
    donatur: new Set(donasi.map(d => d.nama.trim().toLowerCase())).size,
  };
}
