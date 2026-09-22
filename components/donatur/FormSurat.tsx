'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FloppyDisk, Warning, ArrowClockwise } from '@phosphor-icons/react';
import { terbilang, formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian, toTitleCase } from '@/lib/utils/formatters';
import type { SuratData } from '@/lib/surat/data';
import type { Sapaan, JenisDonasi } from '@/lib/db/donatur-repo';
import { PilihDonatur, type PilihDonaturValue } from '@/components/donatur/PilihDonatur';
import { PratinjauSurat } from '@/components/donatur/PratinjauSurat';

export type FormState = {
  nama: string; sapaan: Sapaan; bentuk: 'UANG' | 'BARANG'; nominal: number;
  deskripsiBarang: string; tanggalSurat: string; nomorSurat: string; keterangan: string;
};

/** Menyusun data pratinjau tanpa memanggil server. */
export function hitungPratinjau(s: FormState): SuratData {
  return {
    nomorSurat: s.nomorSurat,
    tanggalTeks: formatDateIndonesian(s.tanggalSurat),
    sapaan: s.sapaan,
    namaDonatur: toTitleCase(s.nama || ''),
    barisNilai: s.bentuk === 'UANG'
      ? { tipe: 'UANG', rupiah: formatRupiah(s.nominal || 0), terbilang: terbilang(s.nominal || 0) }
      : { tipe: 'BARANG', deskripsi: s.deskripsiBarang || '-' },
    keterangan: s.keterangan || null,
  };
}

const OPSI_JENIS: Array<{ value: JenisDonasi; label: string }> = [
  { value: 'ZAKAT', label: 'Zakat' },
  { value: 'INFAQ', label: 'Infaq' },
  { value: 'SHADAQAH', label: 'Shadaqah' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

function hariIni(): string {
  return new Date().toISOString().slice(0, 10);
}

const field = 'w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5] min-h-11';

export function FormSurat() {
  const router = useRouter();

  const [donatur, setDonatur] = useState<PilihDonaturValue>({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
  const [jenis, setJenis] = useState<JenisDonasi>('INFAQ');
  const [bentuk, setBentuk] = useState<'UANG' | 'BARANG'>('UANG');
  const [nominal, setNominal] = useState(0);
  const [nominalTeks, setNominalTeks] = useState('');
  const [deskripsiBarang, setDeskripsiBarang] = useState('');
  const [tanggalDonasi, setTanggalDonasi] = useState(hariIni());
  const [tanggalSurat, setTanggalSurat] = useState(hariIni());
  const [keterangan, setKeterangan] = useState('');

  const [nomorSurat, setNomorSurat] = useState('');
  const [nomorOtomatis, setNomorOtomatis] = useState('');
  const [nomorDiedit, setNomorDiedit] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [nomorUsulan, setNomorUsulan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const belumPernahDiisi = useRef(true);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/donatur/nomor-berikutnya?tanggal=${encodeURIComponent(tanggalSurat)}`);
        const data = await res.json();
        if (batal || !res.ok) return;
        const nomor: string = data.data.nomor;
        setNomorOtomatis(nomor);
        if (belumPernahDiisi.current || !nomorDiedit) {
          setNomorSurat(nomor);
        }
        belumPernahDiisi.current = false;
      } catch {
        // koneksi bermasalah — nomor otomatis tetap bisa diisi manual
      }
    })();
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggalSurat]);

  const pakaiNomorOtomatis = () => {
    setNomorSurat(nomorOtomatis);
    setNomorDiedit(false);
  };

  const state: FormState = {
    nama: donatur.nama, sapaan: donatur.sapaan, bentuk, nominal,
    deskripsiBarang, tanggalSurat, nomorSurat, keterangan,
  };
  const pratinjau = hitungPratinjau(state);

  const ubahNominal = (teks: string) => {
    const digit = teks.replace(/\D/g, '');
    const angka = digit === '' ? 0 : parseInt(digit, 10);
    setNominal(angka);
    setNominalTeks(digit === '' ? '' : formatRupiah(angka));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNomorUsulan(null);
    setFieldErrors({});
    try {
      let donaturId = donatur.donaturId;
      if (!donaturId) {
        const resDonatur = await fetch('/api/donatur', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama: donatur.nama, sapaan: donatur.sapaan, noWa: donatur.noWa || undefined }),
        });
        const dataDonatur = await resDonatur.json();
        if (resDonatur.status === 400 && dataDonatur.fields) { setFieldErrors(dataDonatur.fields); return; }
        if (!resDonatur.ok) { setError(dataDonatur.error || 'Gagal menyimpan donatur.'); return; }
        donaturId = dataDonatur.data.id;
      }

      const body = {
        donasi: {
          donaturId,
          tanggal: tanggalDonasi,
          jenis,
          bentuk,
          ...(bentuk === 'UANG' ? { nominal } : { deskripsiBarang }),
          keterangan: keterangan || undefined,
        },
        nomorSurat,
        tanggalSurat,
      };
      const res = await fetch('/api/donatur/surat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(data.error || 'Nomor surat sudah dipakai.');
        setNomorUsulan(data.nomorUsulan || null);
        return;
      }
      if (res.status === 400 && data.fields) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries<string>(data.fields)) {
          mapped[k.startsWith('donasi.') ? k.slice('donasi.'.length) : k] = v;
        }
        setFieldErrors(mapped);
        return;
      }
      if (!res.ok) { setError(data.error || 'Gagal membuat surat.'); return; }

      router.push('/donatur/surat/' + data.data.id);
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setBusy(false);
    }
  };

  const pakaiNomorUsulan = () => {
    if (!nomorUsulan) return;
    setNomorSurat(nomorUsulan);
    setNomorDiedit(false);
    setNomorUsulan(null);
    setError(null);
  };

  const border = (k: string) => fieldErrors[k] ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700';

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        {error && (
          <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex items-start gap-2">
            <Warning size={18} weight="bold" className="shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{error}</p>
              {nomorUsulan && (
                <button type="button" onClick={pakaiNomorUsulan}
                  className="text-xs font-bold underline underline-offset-2">
                  Pakai nomor {nomorUsulan}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-semibold">Donatur</span>
          <PilihDonatur value={donatur} onChange={setDonatur} />
          {fieldErrors.nama && <p className="text-xs text-rose-600">{fieldErrors.nama}</p>}
          {fieldErrors.donaturId && <p className="text-xs text-rose-600">{fieldErrors.donaturId}</p>}
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold">Jenis donasi</span>
          <select value={jenis} onChange={e => setJenis(e.target.value as JenisDonasi)} className={`${field} ${border('jenis')}`}>
            {OPSI_JENIS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {fieldErrors.jenis && <p className="text-xs text-rose-600">{fieldErrors.jenis}</p>}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Bentuk</span>
            <select value={bentuk} onChange={e => setBentuk(e.target.value as 'UANG' | 'BARANG')} className={field}>
              <option value="UANG">Uang</option>
              <option value="BARANG">Barang</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Tanggal donasi</span>
            <input type="date" value={tanggalDonasi} onChange={e => setTanggalDonasi(e.target.value)} className={`${field} ${border('tanggal')}`} />
            {fieldErrors.tanggal && <p className="text-xs text-rose-600">{fieldErrors.tanggal}</p>}
          </label>
        </div>

        {bentuk === 'UANG' ? (
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Nominal (Rp)</span>
            <input
              inputMode="numeric"
              value={nominalTeks}
              onChange={e => ubahNominal(e.target.value)}
              placeholder="0"
              className={`${field} ${border('nominal')}`}
            />
            <span className="block text-xs text-slate-500 italic">Terbilang: {terbilang(nominal || 0)} Rupiah</span>
            {fieldErrors.nominal && <p className="text-xs text-rose-600">{fieldErrors.nominal}</p>}
          </label>
        ) : (
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Deskripsi barang</span>
            <input
              value={deskripsiBarang}
              onChange={e => setDeskripsiBarang(e.target.value)}
              placeholder="mis. 50 kg beras"
              className={`${field} ${border('deskripsiBarang')}`}
            />
            {fieldErrors.deskripsiBarang && <p className="text-xs text-rose-600">{fieldErrors.deskripsiBarang}</p>}
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-semibold">Keterangan (opsional)</span>
          <input value={keterangan} onChange={e => setKeterangan(e.target.value)} className={field} />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold">Tanggal surat</span>
          <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)} className={`${field} ${border('tanggalSurat')}`} />
          {fieldErrors.tanggalSurat && <p className="text-xs text-rose-600">{fieldErrors.tanggalSurat}</p>}
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold">Nomor surat</span>
          <input
            value={nomorSurat}
            onChange={e => { setNomorSurat(e.target.value); setNomorDiedit(true); }}
            className={`${field} ${border('nomorSurat')}`}
          />
          {fieldErrors.nomorSurat && <p className="text-xs text-rose-600">{fieldErrors.nomorSurat}</p>}
          {nomorDiedit && nomorOtomatis && nomorOtomatis !== nomorSurat && (
            <button type="button" onClick={pakaiNomorOtomatis}
              className="mt-1 flex items-center gap-1 text-xs font-bold text-[#0B5FA5] underline underline-offset-2">
              <ArrowClockwise size={14} weight="bold" /> Pakai nomor otomatis {nomorOtomatis}
            </button>
          )}
        </label>

        <button type="submit" disabled={busy}
          className="w-full h-12 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
          <FloppyDisk size={20} weight="bold" /> {busy ? 'Menyimpan…' : 'Simpan & Buat Surat'}
        </button>
      </form>

      <PratinjauSurat data={pratinjau} />
    </div>
  );
}
