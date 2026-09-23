/** Menandai surat sudah terkirim via WhatsApp. Mengembalikan pesan galat, atau null bila berhasil. */
export async function tandaiTerkirim(suratId: string, f: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await f(`/api/donatur/surat/${encodeURIComponent(suratId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terkirimWa: true }),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error || 'Gagal menandai surat sebagai terkirim';
  } catch {
    return 'Tidak dapat terhubung ke server.';
  }
}
