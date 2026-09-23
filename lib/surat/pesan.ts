/** Menyusun teks pesan WhatsApp ucapan terima kasih untuk donatur. */
export function pesanUcapan(namaLengkapDenganSapaan: string, nomorSurat: string): string {
  return [
    `Assalamu'alaikum Wr. Wb.`,
    ``,
    `${namaLengkapDenganSapaan}, terima kasih atas zakat/infaq/shadaqah yang telah disalurkan kepada Panti Asuhan Baitul Qowwam.`,
    `Berikut kami lampirkan surat ucapan terima kasih (No. ${nomorSurat}).`,
    ``,
    `Jazakumullahu khairan jazaa.`,
    `Pengurus Panti Asuhan Baitul Qowwam`,
  ].join('\n');
}

/**
 * encodeURIComponent tidak meng-escape apostrof (') karena termasuk karakter
 * "unreserved" menurut spesifikasinya — tapi teks ucapan kita memuatnya
 * ("Assalamu'alaikum"). Escape manual supaya query string selalu aman
 * disalin/dibuka ulang tanpa karakter mentah yang bisa membingungkan parser.
 */
function encodeTeksWa(pesan: string): string {
  return encodeURIComponent(pesan).replace(/'/g, '%27');
}

/** Tautan wa.me (dipakai di HP tanpa WhatsApp Web). */
export function waLink(noWa: string | null | undefined, pesan: string): string | null {
  if (!noWa) return null;
  return `https://wa.me/${noWa}?text=${encodeTeksWa(pesan)}`;
}

/** Tautan WhatsApp Web (dipakai di desktop), dibangun langsung tanpa bergantung pada waLink. */
export function waWebLink(noWa: string | null | undefined, pesan: string): string | null {
  if (!noWa) return null;
  return `https://web.whatsapp.com/send?phone=${noWa}&text=${encodeTeksWa(pesan)}`;
}
