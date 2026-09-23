import { BERKAS_WAJIB, statusBerkas, type DokRingkas } from './ringkasan';

/** Nomor WhatsApp wali dalam format internasional 62xxx, atau null bila kosong. */
export function nomorWali(kontak: string | null | undefined): string | null {
  const digit = (kontak ?? '').replace(/[^0-9]/g, '');
  if (!digit) return null;
  if (digit.startsWith('0')) return '62' + digit.substring(1);
  if (!digit.startsWith('62')) return '62' + digit;
  return digit;
}

/** Pesan pengingat kelengkapan berkas untuk wali (teks sama dengan versi kartu santri lama). */
export function pesanPengingat(nama: string, docs: DokRingkas[] | undefined, uploadUrl: string): string {
  const s = statusBerkas(docs);
  const kurang = BERKAS_WAJIB
    .filter(w => !(docs ?? []).some(d => d.kategori === w.kategori && d.statusVerifikasi !== 'REJECTED'))
    .map(w => `• ${w.label}`);
  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nYth. Bapak/Ibu Wali dari Ananda *${nama}*.\n\nKami menginfokan bahwa kelengkapan berkas administrasi santri di *Pondok Pesantren Baitul Qowwam* saat ini masih belum lengkap (${s.ada}/4 berkas wajib terunggah).\n\nBerkas yang belum lengkap:\n${kurang.join('\n')}\n\nMohon berkenan mengunggah foto atau pindaian berkas tersebut melalui tautan mandiri resmi berikut:\n${uploadUrl}\n\n_(Tautan di atas aman, resmi, dan dapat langsung difoto lewat HP tanpa perlu login)_\n\nAtas kerja sama Bapak/Ibu, kami ucapkan jazakumullah khairan katsiran.\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n— *Panitia Administrasi Baitul Qowwam*`;
}
