'use client';
import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { DonasiPerpus as Donasi, Pengadaan } from '@/lib/perpus/tipe';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import { rupiah, tanggalPendek } from './format';

export function DonasiPerpus() {
  const [donasi, setDonasi] = useState<Donasi[]>([]);
  const [pengadaan, setPengadaan] = useState<Pengadaan[]>([]);
  const [form, setForm] = useState<'donasi' | 'pengadaan' | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [isi, setIsi] = useState({ nama: '', jenis: 'uang', tanggal: '', angka: '', toko: '', catatan: '' });

  useEffect(() => {
    fetch('/api/perpus/donasi').then(r => r.json()).then(d => setDonasi(d.data || []));
    fetch('/api/perpus/pengadaan').then(r => r.json()).then(d => setPengadaan(d.data || []));
  }, []);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault(); setGalat(null);
    const angka = Number(isi.angka.replace(/\D/g, ''));
    const body = form === 'donasi'
      ? { nama: isi.nama, jenis: isi.jenis, tanggal: isi.tanggal || null, catatan: isi.catatan, ...(isi.jenis === 'uang' ? { jumlah: angka } : { jumlahBuku: angka }) }
      : { toko: isi.toko, tanggal: isi.tanggal || null, total: angka, catatan: isi.catatan };
    const res = await fetch(`/api/perpus/${form}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    if (!res.ok) { setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal menyimpan'); return; }
    if (form === 'donasi') setDonasi(p => [d.data, ...p]); else setPengadaan(p => [d.data, ...p]);
    setForm(null); setIsi({ nama: '', jenis: 'uang', tanggal: '', angka: '', toko: '', catatan: '' });
  };

  return (
    <div className="space-y-5">
      <KepalaHalaman judul="Donasi & pengadaan" aksi={<>
        <TombolUtama ikon={Plus} onClick={() => setForm('donasi')}>Donasi</TombolUtama>
        <TombolUtama ikon={Plus} onClick={() => setForm('pengadaan')}>Pengadaan</TombolUtama>
      </>} />
      <section className="space-y-2">
        <h2 className="font-extrabold text-bq-tinta">Infaq & wakaf buku</h2>
        {donasi.map(d => (
          <Kartu key={d.id} className="p-3 flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate"><b>{d.nama}</b> · {tanggalPendek(d.tanggal, d.tanggalTeks)}</span>
            <span className="shrink-0 font-bold">{d.jenis === 'uang' ? rupiah(d.jumlah ?? 0) : `${d.jumlahBuku} buku`}</span>
          </Kartu>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-extrabold text-bq-tinta">Pengadaan buku</h2>
        {pengadaan.map(p => (
          <Kartu key={p.id} className="p-3 flex justify-between gap-3 text-sm">
            <span>{tanggalPendek(p.tanggal, p.tanggalTeks)}{p.toko ? ` · ${p.toko}` : ''}</span>
            <span className="font-bold">{rupiah(p.total)}</span>
          </Kartu>
        ))}
      </section>
      <LembarBawah buka={form !== null} onTutup={() => setForm(null)} judul={form === 'pengadaan' ? 'Catat pengadaan' : 'Catat donasi'}>
        <form onSubmit={simpan} className="space-y-3">
          {form === 'donasi' ? (<>
            <label className="block space-y-1"><span className={kelasLabel}>Nama donatur</span>
              <input className={kelasInput} value={isi.nama} onChange={e => setIsi({ ...isi, nama: e.target.value })} required /></label>
            <label className="block space-y-1"><span className={kelasLabel}>Jenis</span>
              <select className={kelasInput} value={isi.jenis} onChange={e => setIsi({ ...isi, jenis: e.target.value })}>
                <option value="uang">Infaq uang</option><option value="buku">Wakaf buku</option>
              </select></label>
          </>) : (
            <label className="block space-y-1"><span className={kelasLabel}>Toko / olshop</span>
              <input className={kelasInput} value={isi.toko} onChange={e => setIsi({ ...isi, toko: e.target.value })} /></label>
          )}
          <label className="block space-y-1"><span className={kelasLabel}>Tanggal</span>
            <input type="date" className={kelasInput} value={isi.tanggal} onChange={e => setIsi({ ...isi, tanggal: e.target.value })} /></label>
          <label className="block space-y-1">
            <span className={kelasLabel}>{form === 'donasi' && isi.jenis === 'buku' ? 'Jumlah buku' : 'Nominal (Rp)'}</span>
            <input inputMode="numeric" className={kelasInput} value={isi.angka} onChange={e => setIsi({ ...isi, angka: e.target.value })} required /></label>
          <label className="block space-y-1"><span className={kelasLabel}>Catatan</span>
            <input className={kelasInput} value={isi.catatan} onChange={e => setIsi({ ...isi, catatan: e.target.value })} /></label>
          {galat && <PesanGalat pesan={galat} />}
          <TombolUtama type="submit" className="w-full">Simpan</TombolUtama>
        </form>
      </LembarBawah>
    </div>
  );
}
