'use client';
import { useEffect, useState } from 'react';
import { Sparkle, FloppyDisk } from '@phosphor-icons/react';
import { KELAS_DDC } from '@/lib/perpus/ddc';
import { kodePengarang, kodeJudul, susunNomorPanggil } from '@/lib/perpus/nomor-panggil';
import type { AsalBuku, Buku, DonasiPerpus, Pengadaan } from '@/lib/perpus/tipe';
import { LABEL_ASAL } from '@/lib/perpus/tipe';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';

export function FormBuku({ onSimpan }: { onSimpan: (b: Buku) => void }) {
  const [judul, setJudul] = useState('');
  const [penulis, setPenulis] = useState('');
  const [kelasDdc, setKelasDdc] = useState('');
  const [kodeManual, setKodeManual] = useState('');
  const [pakaiSeri, setPakaiSeri] = useState(false);
  const [seriKode, setSeriKode] = useState('');
  const [seriNomor, setSeriNomor] = useState(1);
  const [eksemplar, setEksemplar] = useState(1);
  const [asal, setAsal] = useState<AsalBuku>('koleksi_awal');
  const [donasiId, setDonasiId] = useState('');
  const [pengadaanId, setPengadaanId] = useState('');
  const [donasi, setDonasi] = useState<DonasiPerpus[]>([]);
  const [pengadaan, setPengadaan] = useState<Pengadaan[]>([]);
  const [usulan, setUsulan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/perpus/donasi').then(r => r.json()).then(d => setDonasi((d.data || []).filter((x: DonasiPerpus) => x.jenis === 'buku')));
    fetch('/api/perpus/pengadaan').then(r => r.json()).then(d => setPengadaan(d.data || []));
  }, []);

  const pengarang = kodeManual || kodePengarang(penulis) || 'XXX';
  const pratinjau = kelasDdc && judul
    ? susunNomorPanggil({ kelasDdc, kodePengarang: pengarang, kodeJudul: pakaiSeri ? seriKode || '?' : kodeJudul(judul), noSeri: pakaiSeri ? seriNomor : null })
    : '—';

  const usulkan = async () => {
    setSibuk(true); setGalat(null); setUsulan(null);
    const res = await fetch('/api/perpus/klasifikasi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buku: [{ judul, penulis }] }),
    });
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.error || 'AI gagal'); return; }
    const u = d.data?.[0];
    if (!u) { setGalat('AI tidak yakin; pilih kelas manual.'); return; }
    setKelasDdc(u.kelasDdc);
    setUsulan(`${u.alasan} (yakin ${Math.round(u.yakin * 100)}%)`);
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus/buku', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judul, penulis, kelasDdc, eksemplar, asal,
        ...(kodeManual ? { kodePengarang: kodeManual } : {}),
        seri: pakaiSeri ? { kode: seriKode, nomor: seriNomor } : null,
        donasiId: asal === 'wakaf' && donasiId ? donasiId : null,
        pengadaanId: asal === 'pengadaan' && pengadaanId ? pengadaanId : null,
      }),
    });
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal menyimpan'); return; }
    onSimpan(d.data);
  };

  return (
    <form onSubmit={simpan} className="space-y-3">
      <label className="block space-y-1"><span className={kelasLabel}>Judul</span>
        <input className={kelasInput} value={judul} onChange={e => setJudul(e.target.value)} required /></label>
      <label className="block space-y-1"><span className={kelasLabel}>Penulis</span>
        <input className={kelasInput} value={penulis} onChange={e => setPenulis(e.target.value)} /></label>
      <div className="flex items-end gap-2">
        <label className="block flex-1 space-y-1"><span className={kelasLabel}>Kelas DDC</span>
          <select className={kelasInput} value={kelasDdc} onChange={e => setKelasDdc(e.target.value)} required>
            <option value="">Pilih kelas…</option>
            {KELAS_DDC.map(k => <option key={k.kode} value={k.kode}>{k.kode} — {k.id}</option>)}
          </select></label>
        <TombolUtama ikon={Sparkle} onClick={usulkan} disabled={sibuk || !judul} className="shrink-0">Usulkan</TombolUtama>
      </div>
      {usulan && <p role="status" className="text-xs text-bq-redup">AI: {usulan}</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1"><span className={kelasLabel}>Kode pengarang (otomatis: {kodePengarang(penulis) || '—'})</span>
          <input className={kelasInput} value={kodeManual} onChange={e => setKodeManual(e.target.value.toUpperCase())} maxLength={4} placeholder="opsional" /></label>
        <label className="block space-y-1"><span className={kelasLabel}>Eksemplar</span>
          <input type="number" min={1} max={99} className={kelasInput} value={eksemplar} onChange={e => setEksemplar(Number(e.target.value))} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pakaiSeri} onChange={e => setPakaiSeri(e.target.checked)} /> Bagian dari seri</label>
      {pakaiSeri && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1"><span className={kelasLabel}>Huruf seri (mis. b untuk seri Bumi)</span>
            <input className={kelasInput} value={seriKode} onChange={e => setSeriKode(e.target.value.toLowerCase().slice(0, 1))} required /></label>
          <label className="block space-y-1"><span className={kelasLabel}>Nomor seri</span>
            <input type="number" min={1} max={99} className={kelasInput} value={seriNomor} onChange={e => setSeriNomor(Number(e.target.value))} /></label>
        </div>
      )}
      <label className="block space-y-1"><span className={kelasLabel}>Asal</span>
        <select className={kelasInput} value={asal} onChange={e => setAsal(e.target.value as AsalBuku)}>
          {(Object.keys(LABEL_ASAL) as AsalBuku[]).map(a => <option key={a} value={a}>{LABEL_ASAL[a]}</option>)}
        </select></label>
      {asal === 'wakaf' && (
        <label className="block space-y-1"><span className={kelasLabel}>Donatur wakaf</span>
          <select className={kelasInput} value={donasiId} onChange={e => setDonasiId(e.target.value)}>
            <option value="">Pilih donatur wakaf…</option>
            {donasi.map(d => <option key={d.id} value={d.id}>{d.nama} · {d.jumlahBuku} buku · {d.tanggalTeks || d.tanggal || ''}</option>)}
          </select></label>
      )}
      {asal === 'pengadaan' && (
        <label className="block space-y-1"><span className={kelasLabel}>Pembelian</span>
          <select className={kelasInput} value={pengadaanId} onChange={e => setPengadaanId(e.target.value)}>
            <option value="">Pilih pembelian…</option>
            {pengadaan.map(p => <option key={p.id} value={p.id}>{p.tanggalTeks || p.tanggal} · Rp{p.total.toLocaleString('id-ID')}</option>)}
          </select></label>
      )}
      <p role="status" className="text-sm">Nomor panggil: <span className="font-mono font-bold">{pratinjau}</span> <span className="text-xs text-bq-redup">(bila bentrok, server menambah huruf)</span></p>
      {galat && <PesanGalat pesan={galat} />}
      <TombolUtama type="submit" ikon={FloppyDisk} disabled={sibuk} className="w-full">Simpan buku</TombolUtama>
    </form>
  );
}
