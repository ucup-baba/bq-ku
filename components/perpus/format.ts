export const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
export const tanggalPendek = (iso: string | null, cadangan?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (cadangan || '—');
