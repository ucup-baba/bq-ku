const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function keKata(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} Belas`;
  if (n < 100) {
    const sisa = n % 10;
    return `${SATUAN[Math.floor(n / 10)]} Puluh${sisa ? ' ' + SATUAN[sisa] : ''}`;
  }
  if (n < 200) return `Seratus${n - 100 ? ' ' + keKata(n - 100) : ''}`;
  if (n < 1000) {
    const sisa = n % 100;
    return `${SATUAN[Math.floor(n / 100)]} Ratus${sisa ? ' ' + keKata(sisa) : ''}`;
  }
  if (n < 2000) return `Seribu${n - 1000 ? ' ' + keKata(n - 1000) : ''}`;

  const skala: Array<[number, string]> = [
    [1_000_000_000_000, 'Triliun'],
    [1_000_000_000, 'Miliar'],
    [1_000_000, 'Juta'],
    [1_000, 'Ribu'],
  ];
  for (const [nilai, nama] of skala) {
    if (n >= nilai) {
      const depan = Math.floor(n / nilai);
      const sisa = n % nilai;
      return `${keKata(depan)} ${nama}${sisa ? ' ' + keKata(sisa) : ''}`;
    }
  }
  return keKata(n);
}

/** Bilangan Indonesia dalam huruf, mis. 2500000 -> "Dua Juta Lima Ratus Ribu". */
export function terbilang(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error('Terbilang hanya untuk bilangan bulat non-negatif');
  const bulat = Math.floor(n);
  if (bulat === 0) return 'Nol';
  return keKata(bulat).replace(/\s+/g, ' ').trim();
}

/** 2500000 -> "2.500.000" */
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.floor(n));
}
