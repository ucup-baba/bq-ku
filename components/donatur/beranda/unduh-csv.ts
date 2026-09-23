import type { Rekap } from '@/lib/db/donatur-repo';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { toCsv } from '@/lib/utils/csv';
import { labelBulan } from '@/lib/utils/rekap';

export function unduhCsv(data: Rekap, dari: string, sampai: string) {
  const barisUang = data.perBulan.map(pb => ({ bulan: labelBulan(pb.bulan), total: pb.total }));
  const barisBarang = data.barang.map(b => ({ tanggal: formatDateIndonesian(b.tanggal), donatur: b.donatur, deskripsi: b.deskripsi }));
  const bagian = [
    'Donasi Uang per Bulan',
    barisUang.length ? toCsv(barisUang) : '(tidak ada data)',
    '',
    'Donasi Barang',
    barisBarang.length ? toCsv(barisBarang) : '(tidak ada data)',
  ].join('\n');
  // BOM UTF-8 agar Excel versi Indonesia membaca karakter dengan benar.
  const blob = new Blob(['﻿' + bagian], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-${dari}-${sampai}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
