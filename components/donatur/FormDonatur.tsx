'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Warning } from '@phosphor-icons/react';
import type { Donatur, Sapaan } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { cariDonaturMirip } from '@/lib/donatur/daftar';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasField, kelasLabel } from '@/components/ui/kelas';

export const OPSI_SAPAAN: Array<{ value: Sapaan; label: string }> = [
  { value: 'BAPAK', label: 'Bapak' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'SDR', label: 'Sdr.' },
  { value: 'SDRI', label: 'Sdri.' },
  { value: 'BAPAK_IBU', label: 'Bapak/Ibu' },
];

const Galat = ({ pesan }: { pesan?: string }) => (pesan ? <span className="text-xs text-rose-600">{pesan}</span> : null);

/**
 * Form donatur untuk tambah (tanpa `awal`) maupun ubah (dengan `awal`). Nomor WA wajib.
 * `daftar` (opsional) dipakai memperingatkan donatur yang kemungkinan sudah tersimpan.
 */
export function FormDonatur({ awal, daftar, onSelesai }: {
  awal?: Donatur;
  daftar?: Array<Pick<Donatur, 'id' | 'nama' | 'sapaan' | 'noWa'>>;
  onSelesai: (d: Donatur) => void;
}) {
  const [nama, setNama] = useState(awal?.nama ?? '');
  const [sapaan, setSapaan] = useState<Sapaan>(awal?.sapaan ?? 'BAPAK');
  const [noWa, setNoWa] = useState(awal?.noWa ?? '');
  const [alamat, setAlamat] = useState(awal?.alamat ?? '');
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mirip = useMemo(
    () => (daftar ? cariDonaturMirip(daftar, { nama, noWa }, awal?.id).slice(0, 3) : []),
    [daftar, nama, noWa, awal?.id],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null); setFields({});
    try {
      const res = await fetch(awal ? `/api/donatur/${encodeURIComponent(awal.id)}` : '/api/donatur', {
        method: awal ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, sapaan, noWa, alamat, catatan }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.fields) { setFields(data.fields); return; }
      if (!res.ok) { setError(data.error || 'Gagal menyimpan donatur.'); return; }
      onSelesai(data.data);
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <PesanGalat pesan={error} />}
      <label className="block space-y-1">
        <span className={kelasLabel}>Nama</span>
        <input autoFocus value={nama} onChange={e => setNama(e.target.value)} required placeholder="Nama lengkap" className={kelasField(fields.nama)} />
        <Galat pesan={fields.nama} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={kelasLabel}>Sapaan</span>
          <select value={sapaan} onChange={e => setSapaan(e.target.value as Sapaan)} className={kelasField(fields.sapaan)}>
            {OPSI_SAPAAN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Galat pesan={fields.sapaan} />
        </label>
        <label className="block space-y-1">
          <span className={kelasLabel}>No. WhatsApp</span>
          <input value={noWa} onChange={e => setNoWa(e.target.value)} required inputMode="tel" placeholder="08…" className={kelasField(fields.noWa)} />
          <Galat pesan={fields.noWa} />
        </label>
      </div>

      {mirip.length > 0 && (
        <div role="status" className="space-y-1.5 rounded-2xl bg-orange-50 p-3 text-xs text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
          <p className="flex items-center gap-1.5 font-bold">
            <Warning size={15} weight="fill" aria-hidden="true" /> Mungkin sudah tersimpan:
          </p>
          <ul className="space-y-1">
            {mirip.map(d => (
              <li key={d.id}>
                <Link href={`/donatur/daftar/${d.id}`} className="font-semibold underline underline-offset-2">
                  {labelSapaan(d.sapaan)} {d.nama}
                </Link>
                {d.noWa && <span className="text-orange-800/80 dark:text-orange-200/80"> · {d.noWa}</span>}
              </li>
            ))}
          </ul>
          <p>Pakai yang sudah ada agar riwayat donasinya tidak terpecah.</p>
        </div>
      )}

      <label className="block space-y-1">
        <span className={kelasLabel}>Alamat (opsional)</span>
        <input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Alamat donatur" className={kelasField(fields.alamat)} />
        <Galat pesan={fields.alamat} />
      </label>
      <label className="block space-y-1">
        <span className={kelasLabel}>Catatan (opsional)</span>
        <input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Mis. donatur rutin tiap Jumat" className={kelasField(fields.catatan)} />
        <Galat pesan={fields.catatan} />
      </label>
      <TombolUtama type="submit" ikon={Check} disabled={busy} className="h-12 w-full">
        {busy ? 'Menyimpan…' : awal ? 'Simpan perubahan' : 'Simpan donatur'}
      </TombolUtama>
    </form>
  );
}
