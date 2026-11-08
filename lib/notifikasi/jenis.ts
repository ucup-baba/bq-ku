import type { Room } from '@/lib/auth/rooms';

export type Notifikasi = {
  id: 'surat-belum-terkirim' | 'donatur-tanpa-wa' | 'akun-menunggu' | 'berkas-lembaga' | 'perpus-pengajuan' | 'perpus-klaim' | 'perpus-cek';
  judul: string;
  sub: string;
  href: string;
  jumlah: number;
  ruang: Room | 'akun';
};

/** Total untuk titik/angka di avatar akun. */
export function totalNotifikasi(list: Notifikasi[]): number {
  return list.reduce((a, n) => a + n.jumlah, 0);
}

/** Angka pada lencana notifikasi: maksimal "9+". */
export function labelLencana(total: number): string {
  return total > 9 ? '9+' : String(total);
}

/** Menyusun daftar notifikasi dari hitungan mentah; hitungan 0/undefined tidak ditampilkan. */
export function susunNotifikasi(h: { suratBelumTerkirim?: number; donaturTanpaWa?: number; akunMenunggu?: number; berkasLembaga?: number; perpusPengajuan?: number; perpusKlaim?: number;
  /** dicek null = sesi bulan ini belum dimulai. */
  perpusCek?: { label: string; dicek: number | null; total?: number };
}): Notifikasi[] {
  const out: Notifikasi[] = [];
  if (h.berkasLembaga) out.push({
    id: 'berkas-lembaga', ruang: 'lembaga', jumlah: h.berkasLembaga,
    judul: `${h.berkasLembaga} berkas lembaga perlu diperpanjang`, sub: 'Masa berlaku ≤ 90 hari atau sudah lewat',
    href: '/lembaga/berkas',
  });
  if (h.suratBelumTerkirim) out.push({
    id: 'surat-belum-terkirim', ruang: 'donatur', jumlah: h.suratBelumTerkirim,
    judul: `${h.suratBelumTerkirim} surat belum dikirim`, sub: 'Kirim lewat WhatsApp lalu tandai terkirim',
    href: '/donatur/surat?status=BELUM',
  });
  if (h.donaturTanpaWa) out.push({
    id: 'donatur-tanpa-wa', ruang: 'donatur', jumlah: h.donaturTanpaWa,
    judul: `${h.donaturTanpaWa} donatur belum punya nomor WA`, sub: 'Lengkapi agar surat bisa dikirim',
    href: '/donatur/daftar?tanpaWa=1',
  });
  if (h.perpusPengajuan) out.push({
    id: 'perpus-pengajuan', ruang: 'perpus', jumlah: h.perpusPengajuan,
    judul: `${h.perpusPengajuan} pengajuan pinjaman baru`, sub: 'ACC atau tolak di antrian',
    href: '/perpus',
  });
  if (h.perpusKlaim) out.push({
    id: 'perpus-klaim', ruang: 'perpus', jumlah: h.perpusKlaim,
    judul: `${h.perpusKlaim} klaim pengembalian menunggu verifikasi`, sub: 'Periksa bukunya lalu verifikasi',
    href: '/perpus',
  });
  if (h.perpusCek) out.push({
    id: 'perpus-cek', ruang: 'perpus', jumlah: 1,
    judul: h.perpusCek.dicek === null
      ? `Cek buku ${h.perpusCek.label} belum dimulai`
      : `Cek buku ${h.perpusCek.label} belum selesai: ${h.perpusCek.dicek}/${h.perpusCek.total ?? 0}`,
    sub: 'Stok opname bulanan buku di rak', href: '/perpus/cek',
  });
  if (h.akunMenunggu) out.push({
    id: 'akun-menunggu', ruang: 'akun', jumlah: h.akunMenunggu,
    judul: `${h.akunMenunggu} akun menunggu diaktifkan`, sub: 'Masuk dengan Google tapi belum diizinkan',
    href: '/pengguna',
  });
  return out;
}
