import type { Room } from '@/lib/auth/rooms';

export type Notifikasi = {
  id: 'surat-belum-terkirim' | 'donatur-tanpa-wa' | 'akun-menunggu';
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
export function susunNotifikasi(h: { suratBelumTerkirim?: number; donaturTanpaWa?: number; akunMenunggu?: number }): Notifikasi[] {
  const out: Notifikasi[] = [];
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
  if (h.akunMenunggu) out.push({
    id: 'akun-menunggu', ruang: 'akun', jumlah: h.akunMenunggu,
    judul: `${h.akunMenunggu} akun menunggu diaktifkan`, sub: 'Masuk dengan Google tapi belum diizinkan',
    href: '/pengguna',
  });
  return out;
}
