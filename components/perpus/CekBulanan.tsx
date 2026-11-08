'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, DownloadSimple, FileCsv, Minus, Plus, QrCode, Warning, XCircle } from '@phosphor-icons/react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { TombolUtama } from '@/components/ui/Tombol';
import { kelasInput } from '@/components/ui/kelas';
import { catatPindai, idDariQr, labelPeriode, ringkasCek, type BarisCek, type HasilCek } from '@/lib/perpus/cek';
import type { SesiCek } from '@/lib/db/perpus-cek-repo';
import { PemindaiQr } from './PemindaiQr';

type Data = { periode: string; sesi: SesiCek | null; baris: BarisCek[] };
type Riwayat = { sesi: { id: string; periode: string; selesaiAt: string | null; dicek: number; ada: number; rusak: number; hilang: number }[]; hilang: { bukuId: string; nomorPanggil: string; bulan: number }[] };
type Saring = 'semua' | 'belum' | HasilCek;

const SARING: [Saring, string][] = [['semua', 'Semua'], ['belum', 'Belum dicek'], ['ada', 'Ada'], ['rusak', 'Rusak'], ['hilang', 'Hilang']];
const TOMBOL: { hasil: HasilCek; label: string; Ikon: typeof CheckCircle; aktif: string }[] = [
  { hasil: 'ada', label: 'Ada', Ikon: CheckCircle, aktif: 'bg-emerald-600 text-white border-emerald-600' },
  { hasil: 'rusak', label: 'Rusak', Ikon: Warning, aktif: 'bg-amber-500 text-white border-amber-500' },
  { hasil: 'hilang', label: 'Hilang', Ikon: XCircle, aktif: 'bg-rose-600 text-white border-rose-600' },
];
const kelasPil = 'tekan inline-flex h-10 items-center gap-1.5 rounded-xl border border-bq-garis bg-bq-surface px-3 text-sm font-bold text-bq-tinta disabled:opacity-50';
const JEDA_PINDAI_SAMA_MS = 3000;

export function CekBulanan() {
  const [data, setData] = useState<Data | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [saring, setSaring] = useState<Saring>('belum');
  const [cari, setCari] = useState('');
  const [pindai, setPindai] = useState(false);
  const [kabarPindai, setKabarPindai] = useState<{ teks: string; baik: boolean } | null>(null);
  const terakhir = useRef<{ id: string; t: number } | null>(null);

  const muat = async () => {
    const [d, r] = await Promise.all([fetch('/api/perpus/cek'), fetch('/api/perpus/cek/riwayat')]);
    const [jd, jr] = await Promise.all([d.json(), r.json()]);
    if (!d.ok) { setGalat(jd.error || 'Gagal memuat cek bulanan'); return; }
    setData(jd.data);
    if (r.ok) setRiwayat(jr.data);
  };
  useEffect(() => { muat(); }, []);

  const mulai = async () => {
    const res = await fetch('/api/perpus/cek', { method: 'POST' });
    if (!res.ok) { setGalat((await res.json()).error || 'Gagal memulai'); return; }
    await muat();
  };

  /** Perbarui layar dulu, simpan di latar; bila gagal, muat ulang dari server. */
  const simpan = async (b: BarisCek, isi: { hasil: HasilCek; jumlahAda: number; catatan?: string | null }) => {
    if (!data?.sesi) return;
    const item = { bukuId: b.buku.id, hasil: isi.hasil, jumlahAda: isi.jumlahAda, catatan: isi.catatan ?? b.item?.catatan ?? null, dicekAt: new Date().toISOString() };
    setData(d => d && { ...d, baris: d.baris.map(x => (x.buku.id === b.buku.id ? { ...x, item } : x)) });
    const res = await fetch(`/api/perpus/cek/${data.sesi.id}/item`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bukuId: item.bukuId, hasil: item.hasil, jumlahAda: item.jumlahAda, catatan: item.catatan }),
    });
    if (!res.ok) { setGalat((await res.json()).error || 'Gagal menyimpan'); await muat(); }
  };

  const batal = async (b: BarisCek) => {
    if (!data?.sesi) return;
    setData(d => d && { ...d, baris: d.baris.map(x => (x.buku.id === b.buku.id ? { ...x, item: null } : x)) });
    await fetch(`/api/perpus/cek/${data.sesi.id}/item?buku=${b.buku.id}`, { method: 'DELETE' });
  };

  const pilihHasil = (b: BarisCek, hasil: HasilCek) => {
    if (b.item?.hasil === hasil) return batal(b);
    return simpan(b, { hasil, jumlahAda: hasil === 'hilang' ? 0 : Math.max(b.diRak, 1) });
  };

  const hasilPindai = (teks: string) => {
    const id = idDariQr(teks);
    const sekarang = Date.now();
    // Kamera membaca stiker yang sama berkali-kali per detik; satu eksemplar dihitung sekali.
    if (id && terakhir.current?.id === id && sekarang - terakhir.current.t < JEDA_PINDAI_SAMA_MS) return;
    terakhir.current = { id: id ?? teks, t: sekarang };
    const b = id ? data?.baris.find(x => x.buku.id.startsWith(id)) : undefined;
    if (!b) { setKabarPindai({ teks: 'Kode tidak dikenal. Bukan stiker Perpus BQ, atau bukunya nonaktif.', baik: false }); return; }
    const isi = catatPindai(b.buku, b.item);
    navigator.vibrate?.(80);
    setKabarPindai({ teks: `${b.buku.judul} · ${isi.jumlahAda}/${b.buku.eksemplar}`, baik: true });
    simpan(b, isi);
  };

  const selesai = async () => {
    if (!data?.sesi) return;
    const r = ringkasCek(data.baris);
    if (r.belum && !window.confirm(`${r.belum} buku belum dicek dan akan tercatat "belum dicek", bukan hilang. Selesaikan sesi?`)) return;
    const res = await fetch(`/api/perpus/cek/${data.sesi.id}/selesai`, { method: 'POST' });
    if (!res.ok) { setGalat((await res.json()).error || 'Gagal menyelesaikan'); return; }
    await muat();
  };

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return (data?.baris ?? []).filter(b =>
      (saring === 'semua' || (saring === 'belum' ? !b.item : b.item?.hasil === saring))
      && (!q || `${b.buku.judul} ${b.buku.penulis} ${b.buku.nomorPanggil}`.toLowerCase().includes(q)));
  }, [data, saring, cari]);

  if (!data) return galat ? <PesanGalat pesan={galat} /> : null;
  const label = labelPeriode(data.periode);
  const r = ringkasCek(data.baris);

  return (
    <div className="space-y-5">
      <KepalaHalaman judul="Cek bulanan" sub={`Stok opname buku di rak · ${label}`} subTampilDiHp
        aksi={<a href="/api/perpus/stiker" className={kelasPil}><DownloadSimple size={18} weight="bold" aria-hidden /> Stiker QR (A3)</a>} />
      {galat && <PesanGalat pesan={galat} />}

      {!data.sesi ? (
        <Kartu className="p-5 space-y-3">
          <p className="font-extrabold text-bq-tinta">Cek {label} belum dimulai</p>
          <p className="text-sm text-bq-redup">Daftar berisi semua buku aktif, urut nomor panggil seperti di rak. Pengecekan bisa dicicil dan dikerjakan beberapa petugas.</p>
          <TombolUtama onClick={mulai}>Mulai cek {label}</TombolUtama>
        </Kartu>
      ) : (
        <>
          <Kartu className="p-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-extrabold text-bq-tinta">{r.dicek}/{r.total} dicek ({r.persen}%){data.sesi.selesaiAt ? ' · selesai' : ''}</p>
              <p className="text-sm text-bq-redup">Ada {r.ada} · Rusak {r.rusak} · Hilang {r.hilang} · Belum {r.belum}</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={r.persen} aria-valuemin={0} aria-valuemax={100} aria-label="Progres cek">
              <div className="h-full bg-emerald-600" style={{ width: `${r.persen}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <TombolUtama ikon={QrCode} onClick={() => { setKabarPindai(null); setPindai(true); }}>Pindai QR</TombolUtama>
              {!data.sesi.selesaiAt && <button type="button" onClick={selesai} className={kelasPil}>Selesaikan sesi</button>}
            </div>
          </Kartu>

          <div className="flex flex-wrap gap-2">
            {SARING.map(([nilai, teks]) => (
              <button key={nilai} type="button" aria-pressed={saring === nilai} onClick={() => setSaring(nilai)}
                className={`${kelasPil} ${saring === nilai ? 'border-bq-tinta bg-bq-tinta text-bq-surface' : ''}`}>{teks}</button>
            ))}
          </div>
          <input className={kelasInput} type="search" placeholder="Cari judul, penulis, atau nomor panggil" aria-label="Cari buku" value={cari} onChange={e => setCari(e.target.value)} />

          {tampil.length === 0 && <Kartu className="p-4 text-sm text-bq-redup">Tidak ada buku di saringan ini.</Kartu>}
          <ul className="space-y-2">
            {tampil.map(b => (
              <li key={b.buku.id}>
                <Kartu className="p-3 space-y-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-bq-redup">{b.buku.nomorPanggil}</p>
                    <p className="font-extrabold text-bq-tinta">{b.buku.judul}</p>
                    <p className="text-bq-redup">
                      {b.buku.penulis || '—'} · {b.buku.eksemplar} eksemplar{b.dipinjam > 0 ? ` · ${b.dipinjam} di peminjam` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {TOMBOL.map(({ hasil, label: teks, Ikon, aktif }) => (
                      <button key={hasil} type="button" aria-pressed={b.item?.hasil === hasil} onClick={() => pilihHasil(b, hasil)}
                        className={`${kelasPil} ${b.item?.hasil === hasil ? aktif : ''}`}>
                        <Ikon size={18} weight="bold" aria-hidden /> {teks}
                      </button>
                    ))}
                    {b.item && b.item.hasil !== 'hilang' && b.buku.eksemplar > 1 && (
                      <span className="inline-flex items-center gap-1" aria-label="Jumlah eksemplar ditemukan">
                        <button type="button" className={kelasPil} aria-label="Kurangi" disabled={b.item.jumlahAda <= 0}
                          onClick={() => simpan(b, { hasil: b.item!.hasil, jumlahAda: b.item!.jumlahAda - 1 })}><Minus size={14} aria-hidden /></button>
                        <span className="min-w-12 text-center font-bold">{b.item.jumlahAda}/{b.buku.eksemplar}</span>
                        <button type="button" className={kelasPil} aria-label="Tambah" disabled={b.item.jumlahAda >= b.buku.eksemplar}
                          onClick={() => simpan(b, { hasil: b.item!.hasil, jumlahAda: b.item!.jumlahAda + 1 })}><Plus size={14} aria-hidden /></button>
                      </span>
                    )}
                  </div>
                  {b.item?.hasil === 'rusak' && (
                    <input className={kelasInput} placeholder="Catatan kerusakan (opsional)" aria-label="Catatan kerusakan" maxLength={300}
                      defaultValue={b.item.catatan ?? ''}
                      onBlur={e => e.target.value !== (b.item?.catatan ?? '') && simpan(b, { hasil: 'rusak', jumlahAda: b.item!.jumlahAda, catatan: e.target.value })} />
                  )}
                </Kartu>
              </li>
            ))}
          </ul>
        </>
      )}

      {riwayat && riwayat.sesi.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-extrabold text-bq-tinta">Riwayat</h2>
          {riwayat.hilang.length > 0 && (
            <Kartu varian="peringatan" className="p-4 space-y-1 text-sm">
              <p className="font-extrabold">Hilang beberapa bulan berturut-turut</p>
              {riwayat.hilang.map(h => (
                <p key={h.bukuId}><span className="font-mono">{h.nomorPanggil}</span> · {h.bulan} bulan{h.bulan >= 3 ? ' · pertimbangkan nonaktifkan di menu Buku' : ''}</p>
              ))}
            </Kartu>
          )}
          {riwayat.sesi.map(s => (
            <Kartu key={s.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span><b>{labelPeriode(s.periode)}</b> · {s.selesaiAt ? 'selesai' : 'berjalan'} · {s.dicek} dicek · ada {s.ada} · rusak {s.rusak} · hilang {s.hilang}</span>
              <a href={`/api/perpus/cek/${s.id}/csv`} className={kelasPil}><FileCsv size={18} aria-hidden /> CSV</a>
            </Kartu>
          ))}
        </section>
      )}

      <LembarBawah buka={pindai} onTutup={() => setPindai(false)} judul="Pindai stiker QR">
        <div className="space-y-3">
          {pindai && <PemindaiQr onHasil={hasilPindai} />}
          {kabarPindai && (
            <p role="status" className={`rounded-2xl p-3 text-sm font-bold ${kabarPindai.baik ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{kabarPindai.teks}</p>
          )}
          <p className="text-xs text-bq-redup">Arahkan kamera ke stiker. Buku yang terbaca langsung tercatat Ada; judul dengan beberapa eksemplar bertambah satu tiap pindaian.</p>
        </div>
      </LembarBawah>
    </div>
  );
}
