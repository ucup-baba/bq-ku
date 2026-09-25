'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKey, CircleNotch } from '@phosphor-icons/react';
import { PESAN_TIDAK_BERLAKU } from '@/lib/bagikan/respons';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';

/** Tanpa PIN: hitung kunjungan & pasang sesi, lalu muat ulang halaman untuk menampilkan berkas. */
export function BukaOtomatis({ token }: { token: string }) {
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(null);
  useEffect(() => {
    let batal = false;
    fetch(`/api/bagikan/${token}/buka`, { method: 'POST' })
      .then(async r => {
        if (batal) return;
        if (r.ok) router.refresh();
        else setGalat((await r.json().catch(() => ({}))).error || PESAN_TIDAK_BERLAKU);
      })
      .catch(() => { if (!batal) setGalat('Tidak dapat terhubung ke server.'); });
    return () => { batal = true; };
  }, [token, router]);
  return (
    <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
      {galat ? <p className="text-sm font-bold">{galat}</p> : (
        <p className="flex items-center gap-2 text-sm text-bq-redup"><CircleNotch size={18} className="animate-spin" aria-hidden="true" /> Menyiapkan berkas…</p>
      )}
    </Kartu>
  );
}

export function FormPin({ token, terkunciSampai }: { token: string; terkunciSampai: string | null }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [galat, setGalat] = useState<string | null>(
    terkunciSampai ? `Terlalu banyak percobaan. Coba lagi setelah pukul ${new Date(terkunciSampai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.` : null,
  );
  const [busy, setBusy] = useState(false);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    // Tombol tidak dinonaktifkan saat PIN belum lengkap: Enter/tempel cepat tetap terkirim, dicek di sini.
    if (!/^\d{6}$/.test(pin)) { setGalat('PIN harus 6 angka.'); return; }
    setBusy(true); setGalat(null);
    try {
      const r = await fetch(`/api/bagikan/${token}/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      if (r.ok) { router.refresh(); return; }
      setGalat((await r.json().catch(() => ({}))).error || 'PIN tidak dapat diperiksa.');
      setPin('');
    } catch {
      setGalat('Tidak dapat terhubung ke server.');
    } finally { setBusy(false); }
  };

  return (
    <Kartu className="p-6">
      <form onSubmit={kirim} className="space-y-4 text-center">
        <IkonUbin ikon={LockKey} warna="ungu" ukuran="lg" className="mx-auto" />
        <div>
          <h1 className="text-lg font-extrabold">Masukkan PIN</h1>
          <p className="text-xs text-bq-redup">PIN 6 angka dikirim terpisah oleh pengirim tautan.</p>
        </div>
        {galat && <PesanGalat pesan={galat} />}
        <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
          aria-label="PIN 6 angka" placeholder="••••••" className={`${kelasInput} text-center text-2xl font-black tracking-[0.5em]`} autoFocus />
        <TombolUtama type="submit" disabled={busy} className="h-12 w-full">{busy ? 'Memeriksa…' : 'Buka berkas'}</TombolUtama>
      </form>
    </Kartu>
  );
}
