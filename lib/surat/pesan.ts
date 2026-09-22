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

/** Tautan wa.me (dipakai di HP tanpa WhatsApp Web). */
export function waLink(noWa: string | null | undefined, pesan: string): string | null {
  if (!noWa) return null;
  return `https://wa.me/${noWa}?text=${encodeURIComponent(pesan)}`;
}

/** Tautan WhatsApp Web (dipakai di desktop), dibangun langsung tanpa bergantung pada waLink. */
export function waWebLink(noWa: string | null | undefined, pesan: string): string | null {
  if (!noWa) return null;
  return `https://web.whatsapp.com/send?phone=${noWa}&text=${encodeURIComponent(pesan)}`;
}
