const BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/** 'YYYY-MM' -> 'Sep 2026'. Mengembalikan input apa adanya bila format tidak dikenali. */
export function labelBulan(bulan: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bulan);
  if (!m) return bulan;
  const tahun = m[1];
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return bulan;
  return `${BULAN_SINGKAT[idx]} ${tahun}`;
}

export type PilihanPeriode = 'bulan-ini' | '3-bulan' | 'tahun-ini';

const dua = (n: number) => String(n).padStart(2, '0');
/** Format Date lokal (bukan UTC) menjadi 'YYYY-MM-DD', menghindari pergeseran zona waktu. */
function keTanggalIso(d: Date): string {
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/** Hari terakhir bulan `tahun`-`bulan` (bulan 0-based), dihitung lokal. */
function akhirBulan(tahun: number, bulan: number): Date {
  return new Date(tahun, bulan + 1, 0);
}

/**
 * Menghitung rentang tanggal (format YYYY-MM-DD) untuk pilihan periode cepat,
 * dihitung memakai komponen tanggal lokal (bukan toISOString) agar tidak
 * bergeser sehari akibat zona waktu (mis. WIB).
 */
export function rentangPeriode(pilihan: PilihanPeriode, hariIni: Date): { dari: string; sampai: string } {
  const tahun = hariIni.getFullYear();
  const bulan = hariIni.getMonth();

  if (pilihan === 'bulan-ini') {
    return {
      dari: keTanggalIso(new Date(tahun, bulan, 1)),
      sampai: keTanggalIso(akhirBulan(tahun, bulan)),
    };
  }

  if (pilihan === '3-bulan') {
    return {
      dari: keTanggalIso(new Date(tahun, bulan - 2, 1)),
      sampai: keTanggalIso(akhirBulan(tahun, bulan)),
    };
  }

  // 'tahun-ini'
  return {
    dari: `${tahun}-01-01`,
    sampai: `${tahun}-12-31`,
  };
}
