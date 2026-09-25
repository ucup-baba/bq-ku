'use client';
import { useState } from 'react';
import { ShareNetwork, Copy, Check, WhatsappLogo, Warning } from '@phosphor-icons/react';
import type { BerkasDenganVersi } from '@/lib/db/berkas-lembaga-repo';
import { jenisRahasia, labelJenisBerkas } from '@/lib/lembaga/berkas';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasField, kelasLabel } from '@/components/ui/kelas';
import { ambil, kirimJson } from './umum';

type Hasil = { id: string; url: string; pin: string | null; kedaluwarsaAt: string };

function Saklar({ label, sub, nilai, onUbah }: { label: string; sub: string; nilai: boolean; onUbah: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-bq-garis p-3">
      <span>
        <span className="block text-sm font-bold text-bq-tinta">{label}</span>
        <span className="block text-xs text-bq-redup">{sub}</span>
      </span>
      <input type="checkbox" role="switch" checked={nilai} onChange={e => onUbah(e.target.checked)} className="h-5 w-5 accent-[#0E9F54]" />
    </label>
  );
}

function TombolSalin({ teks, label }: { teks: string; label: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <button type="button" aria-label={label} onClick={async () => { try { await navigator.clipboard.writeText(teks); setTersalin(true); setTimeout(() => setTersalin(false), 1500); } catch { /* izin clipboard ditolak */ } }}
      className="tekan inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-bq-garis px-3 text-xs font-bold text-bq-tinta hover:border-bq-biru">
      {tersalin ? <Check size={14} weight="bold" aria-hidden="true" /> : <Copy size={14} weight="bold" aria-hidden="true" />} {tersalin ? 'Tersalin' : 'Salin'}
    </button>
  );
}

/** Buat tautan bagikan; hasilnya (tautan & PIN) ditampilkan SEKALI. */
export function FormTautan({ berkas, onSelesai }: { berkas: BerkasDenganVersi[]; onSelesai: () => void }) {
  const bisaDibagikan = berkas.filter(b => !jenisRahasia(b.jenis) && b.versi.length > 0);
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [penerima, setPenerima] = useState('');
  const [catatan, setCatatan] = useState('');
  const [hari, setHari] = useState<'1' | '7' | '30'>('7');
  const [tandaAir, setTandaAir] = useState(true);
  const [pakaiPin, setPakaiPin] = useState(false);
  const [pakaiBatas, setPakaiBatas] = useState(false);
  const [batas, setBatas] = useState('5');
  const [galat, setGalat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);

  const alih = (id: string) => setDipilih(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const label = (b: BerkasDenganVersi) => (b.jenis === 'LAINNYA' ? b.namaLainnya ?? 'Lainnya' : labelJenisBerkas(b.jenis));

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault(); setGalat(null); setBusy(true);
    try {
      setHasil(await ambil<Hasil>('/api/lembaga/tautan', kirimJson('POST', {
        penerima, catatan, hari: Number(hari), tandaAir, pakaiPin, batasBuka: pakaiBatas ? Number(batas) : null, berkasIds: [...dipilih],
      })));
    } catch (err) { setGalat(err instanceof Error ? err.message : 'Gagal membuat tautan.'); }
    finally { setBusy(false); }
  };

  if (hasil) {
    const pesan = `Assalamu'alaikum. Berikut berkas dari Panti Asuhan Baitul Qowwam untuk ${penerima}:\n${hasil.url}\n\nTautan berlaku sampai ${formatDateIndonesian(hasil.kedaluwarsaAt.slice(0, 10))}.${hasil.pin ? ' PIN akan kami kirim terpisah.' : ''}`;
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-2xl bg-orange-50 p-3 text-xs font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          Tautan{hasil.pin ? ' dan PIN' : ''} hanya ditampilkan sekarang. Simpan atau kirim sebelum menutup. Bila hilang, cabut lalu buat tautan baru.
        </p>
        <div className="space-y-1">
          <span className={kelasLabel}>Tautan</span>
          <div className="flex items-center gap-2">
            <input readOnly value={hasil.url} aria-label="Tautan bagikan" className={kelasField()} onFocus={e => e.currentTarget.select()} />
            <TombolSalin teks={hasil.url} label="Salin tautan" />
          </div>
        </div>
        {hasil.pin && (
          <div className="space-y-1">
            <span className={kelasLabel}>PIN (kirim terpisah)</span>
            <div className="flex items-center gap-2">
              <p className="flex-1 rounded-2xl border border-bq-garis px-4 py-2.5 text-center text-2xl font-black tracking-[0.4em] text-bq-tinta" aria-label="PIN">{hasil.pin}</p>
              <TombolSalin teks={hasil.pin} label="Salin PIN" />
            </div>
          </div>
        )}
        <a href={`https://wa.me/?text=${encodeURIComponent(pesan)}`} target="_blank" rel="noopener noreferrer"
          className="tekan flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-bold text-white">
          <WhatsappLogo size={20} weight="fill" aria-hidden="true" /> Kirim tautan lewat WhatsApp{hasil.pin ? ' (tanpa PIN)' : ''}
        </a>
        <button type="button" onClick={onSelesai} className="tekan h-11 w-full rounded-2xl border border-bq-garis text-sm font-bold text-bq-tinta">Selesai</button>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="space-y-4">
      {galat && <PesanGalat pesan={galat} />}
      <fieldset className="space-y-1.5">
        <legend className={kelasLabel}>Berkas yang dibagikan</legend>
        {bisaDibagikan.length === 0 ? <p className="text-xs text-bq-redup">Belum ada berkas yang bisa dibagikan.</p> : (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {bisaDibagikan.map(b => (
              <li key={b.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <input type="checkbox" checked={dipilih.has(b.id)} onChange={() => alih(b.id)} className="h-4 w-4 accent-[#0E9F54]" />
                  <span className="font-bold text-bq-tinta">{label(b)}</span>
                  {b.nomorDokumen && <span className="truncate text-xs text-bq-redup">{b.nomorDokumen}</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-bq-redup">Cap dan tanda tangan tidak bisa dibagikan.</p>
      </fieldset>
      <label className="block space-y-1">
        <span className={kelasLabel}>Penerima</span>
        <input value={penerima} onChange={e => setPenerima(e.target.value)} required placeholder="Mis. CSR Bank X" className={kelasField()} />
      </label>
      <label className="block space-y-1">
        <span className={kelasLabel}>Catatan (opsional)</span>
        <input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Mis. proposal Ramadan 2027" className={kelasField()} />
      </label>
      <div className="space-y-1">
        <span className={kelasLabel}>Masa berlaku</span>
        <ChipPilihan<'1' | '7' | '30'> label="Masa berlaku" nilai={hari} onPilih={setHari}
          opsi={[{ value: '1', label: '1 hari' }, { value: '7', label: '7 hari' }, { value: '30', label: '30 hari' }]} />
      </div>
      <Saklar label="Tanda air" sub={`"Untuk: ${penerima || 'penerima'} · tanggal" di setiap berkas`} nilai={tandaAir} onUbah={setTandaAir} />
      <Saklar label="PIN 6 angka" sub="Penerima harus memasukkan PIN yang dikirim terpisah" nilai={pakaiPin} onUbah={setPakaiPin} />
      <Saklar label="Batas jumlah buka" sub="Tautan mati setelah dibuka sekian kali" nilai={pakaiBatas} onUbah={setPakaiBatas} />
      {pakaiBatas && (
        <label className="block space-y-1">
          <span className={kelasLabel}>Maksimal dibuka</span>
          <input type="number" min={1} max={1000} value={batas} onChange={e => setBatas(e.target.value)} className={kelasField()} />
        </label>
      )}
      <TombolUtama type="submit" ikon={ShareNetwork} disabled={busy || dipilih.size === 0 || !penerima.trim()} className="h-12 w-full">
        {busy ? 'Membuat…' : `Buat tautan (${dipilih.size} berkas)`}
      </TombolUtama>
    </form>
  );
}
