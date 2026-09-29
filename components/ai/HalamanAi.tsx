'use client';
import { useState } from 'react';
import { FloppyDisk, CheckCircle, XCircle } from '@phosphor-icons/react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import { MODEL_AI, LABEL_PENYEDIA, infoModel, type Penyedia, type PilihanModel, type SetelanAi } from '@/lib/ai/model';
import { hargaTerisi } from '@/lib/ai/biaya';
import type { DataHalamanAi } from '@/lib/ai/setelan';

const rp = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
const kelasJudul = 'text-xs font-extrabold uppercase tracking-wider text-bq-redup';

export function persenPakai(dipakai: number, batas: number): number {
  if (batas <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((dipakai / batas) * 100)));
}
export function warnaBar(persen: number): string {
  return persen >= 100 ? 'bg-rose-500' : persen >= 80 ? 'bg-orange-500' : 'bg-emerald-500';
}

function Bar({ persen }: { persen: number }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-bq-garis" aria-hidden="true">
      <div className={`h-full rounded-full ${warnaBar(persen)}`} style={{ width: `${persen}%` }} />
    </div>
  );
}

function PilihModel({ label, nilai, kunci, bolehKosong, onUbah }: {
  label: string; nilai: PilihanModel | null; kunci: Record<Penyedia, boolean>; bolehKosong?: boolean; onUbah: (p: PilihanModel | null) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={kelasLabel}>{label}</label>
      <select id={id} className={kelasInput} value={nilai ? `${nilai.penyedia}|${nilai.model}` : ''}
        onChange={e => {
          if (!e.target.value) return onUbah(null);
          const [penyedia, model] = e.target.value.split('|') as [Penyedia, string];
          onUbah({ penyedia, model });
        }}>
        {bolehKosong && <option value="">Tanpa cadangan</option>}
        {(Object.keys(MODEL_AI) as Penyedia[]).map(p => (
          <optgroup key={p} label={LABEL_PENYEDIA[p]}>
            {MODEL_AI[p].map(m => <option key={m.id} value={`${p}|${m.id}`}>{LABEL_PENYEDIA[p]} · {m.label}</option>)}
          </optgroup>
        ))}
      </select>
      {nilai && (kunci[nilai.penyedia]
        ? <p className="flex items-center gap-1 text-xs font-semibold text-bq-hijau"><CheckCircle size={14} weight="fill" aria-hidden="true" /> Kunci terpasang</p>
        : <p className="flex items-center gap-1 text-xs font-semibold text-rose-600"><XCircle size={14} weight="fill" aria-hidden="true" /> Kunci belum dipasang di Vercel</p>)}
    </div>
  );
}

/** Halaman AI & OCR (Superadmin): pemakaian, penyedia utama/cadangan, batas, harga, riwayat. */
export function HalamanAi({ awal }: { awal: DataHalamanAi }) {
  const [s, setS] = useState<SetelanAi>(awal.setelan);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const r = awal.ringkasan;
  const persenHari = persenPakai(r.pindaiHariIni, s.batasHarian);
  const plafonAktif = hargaTerisi(s.harga[s.utama.model]);
  const persenBulan = plafonAktif ? persenPakai(r.biayaBulanIni, s.plafonBulananRp) : 0;
  const modelDipakai = [s.utama, s.cadangan].filter((x): x is PilihanModel => !!x);

  const ubahHarga = (model: string, kunci: 'masukPerJuta' | 'keluarPerJuta', nilai: number) =>
    setS(v => ({ ...v, harga: { ...v.harga, [model]: { ...(v.harga[model] ?? { masukPerJuta: 0, keluarPerJuta: 0 }), [kunci]: nilai } } }));

  const simpan = async () => {
    setBusy(true); setGalat(null); setPesan(null);
    try {
      const res = await fetch('/api/ai', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan');
      setPesan('Setelan AI tersimpan.');
    } catch (e) { setGalat(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman judul="AI & OCR" sub="Penyedia, pemakaian & batas biaya pembacaan berkas." kembali={{ href: '/akun', label: 'Kembali ke Akun' }} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Kartu className="p-4">
          <h2 className={kelasJudul}>Hari ini</h2>
          <p className="mt-1 text-2xl font-black text-bq-tinta">{r.pindaiHariIni} / {s.batasHarian} <span className="text-sm font-bold text-bq-redup">pindai</span></p>
          <Bar persen={persenHari} />
          <p className="mt-2 text-xs text-bq-redup">{r.gagalHariIni} gagal{persenHari >= 100 && ' · AI berhenti — isi manual'}</p>
        </Kartu>
        <Kartu className="p-4">
          <h2 className={kelasJudul}>Bulan ini</h2>
          <p className="mt-1 text-2xl font-black text-bq-tinta">
            {plafonAktif ? <>± {rp(r.biayaBulanIni)} <span className="text-sm font-bold text-bq-redup">/ {rp(s.plafonBulananRp)}</span></> : '–'}
          </p>
          {plafonAktif && <Bar persen={persenBulan} />}
          <p className="mt-2 text-xs text-bq-redup">
            {r.tokenBulanIni.toLocaleString('id-ID')} token · cadangan dipakai {r.cadanganBulanIni}×
            {!plafonAktif && ' · isi harga model utama untuk mengaktifkan plafon Rp'}
            {plafonAktif && persenBulan >= 100 && ' · AI berhenti — isi manual'}
          </p>
        </Kartu>
      </div>

      <Kartu className="space-y-4 p-4">
        <h2 className={kelasJudul}>Penyedia</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PilihModel label="Utama" nilai={s.utama} kunci={awal.kunci} onUbah={p => p && setS(v => ({ ...v, utama: p }))} />
          <PilihModel label="Cadangan" nilai={s.cadangan} kunci={awal.kunci} bolehKosong onUbah={p => setS(v => ({ ...v, cadangan: p }))} />
        </div>
      </Kartu>

      <Kartu className="space-y-4 p-4">
        <h2 className={kelasJudul}>Batas</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="batas-harian" className={kelasLabel}>Pindai per hari</label>
            <input id="batas-harian" type="number" min={0} className={kelasInput} value={s.batasHarian}
              onChange={e => setS(v => ({ ...v, batasHarian: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="plafon" className={kelasLabel}>Plafon per bulan (Rp)</label>
            <input id="plafon" type="number" min={0} step={1000} className={kelasInput} value={s.plafonBulananRp}
              onChange={e => setS(v => ({ ...v, plafonBulananRp: Math.max(0, Number(e.target.value) || 0) }))} />
          </div>
        </div>
      </Kartu>

      <Kartu className="space-y-3 p-4">
        <h2 className={kelasJudul}>Harga model (Rp per 1 juta token)</h2>
        <p className="text-xs text-bq-redup">Cek harga resmi di situs OpenAI / Google lalu konversi ke rupiah. Kosong = biaya tidak dihitung.</p>
        {modelDipakai.map(m => (
          <div key={m.model} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-3">
            <span className="text-sm font-bold text-bq-tinta">{LABEL_PENYEDIA[m.penyedia]} · {infoModel(m)?.label}</span>
            {(['masukPerJuta', 'keluarPerJuta'] as const).map(k => (
              <div key={k} className="space-y-1">
                <label htmlFor={`${m.model}-${k}`} className={kelasLabel}>{k === 'masukPerJuta' ? 'Token masuk' : 'Token keluar'}</label>
                <input id={`${m.model}-${k}`} type="number" min={0} className={kelasInput} value={s.harga[m.model]?.[k] ?? 0}
                  onChange={e => ubahHarga(m.model, k, Math.max(0, Number(e.target.value) || 0))} />
              </div>
            ))}
          </div>
        ))}
      </Kartu>

      <div className="flex flex-wrap items-center gap-3">
        <TombolUtama ikon={FloppyDisk} onClick={simpan} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan setelan'}</TombolUtama>
        {pesan && <span className="text-sm font-semibold text-bq-hijau">{pesan}</span>}
      </div>
      {galat && <PesanGalat pesan={galat} />}

      <Kartu className="p-4">
        <h2 className={kelasJudul}>Riwayat terakhir</h2>
        {r.terakhir.length === 0 ? <p className="mt-2 text-sm text-bq-redup">Belum ada pemakaian bulan ini.</p> : (
          <ul className="mt-2 divide-y divide-bq-garis">
            {r.terakhir.map((x, i) => (
              <li key={`${x.idPermintaan}-${x.peran}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block font-bold text-bq-tinta">{x.namaPengguna ?? (x.fitur === 'ocr_mandiri' ? 'Unggah mandiri wali' : '—')} · {infoModel(x)?.label ?? x.model}</span>
                  <span className="block text-bq-redup">{new Date(x.waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })} · {(x.tokenMasuk + x.tokenKeluar).toLocaleString('id-ID')} token{x.biayaRp !== null && ` · ${rp(x.biayaRp)}`}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${x.berhasil ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}
                  title={x.galat ?? undefined}>
                  {x.berhasil ? (x.peran === 'cadangan' ? '✓ cadangan' : '✓') : '✗ gagal'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  );
}
