'use client';
import { useEffect, useState } from 'react';
import type { Rekap, SuratWithRelasi } from '@/lib/db/donatur-repo';
import { rentangPeriode, isiBulanKosong, type PilihanPeriode, type PerBulan } from '@/lib/utils/rekap';
import { rentangTren, type PilihanBeranda } from '@/lib/donatur/beranda';

export type Status = 'memuat' | 'siap' | 'error';

async function ambilJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rincian = json.fields ? Object.values<string>(json.fields).join(' ') : '';
    throw new Error([json.error || 'Gagal memuat data.', rincian].filter(Boolean).join(' — '));
  }
  return json.data as T;
}

const pesan = (e: unknown) => (e instanceof Error ? e.message : 'Tidak dapat terhubung ke server.');
const q = encodeURIComponent;

/** Semua data Beranda Donatur: rekap periode, tren 6 bulan, surat terbaru & belum terkirim. */
export function useDataBeranda() {
  const awal = rentangPeriode('bulan-ini', new Date());
  const [pilihan, setPilihan] = useState<PilihanBeranda>('bulan-ini');
  const [dari, setDari] = useState(awal.dari);
  const [sampai, setSampai] = useState(awal.sampai);

  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [suratPeriode, setSuratPeriode] = useState<SuratWithRelasi[] | null>(null);
  const [statusRekap, setStatusRekap] = useState<Status>('memuat');
  const [galatRekap, setGalatRekap] = useState<string | null>(null);

  const [tren, setTren] = useState<PerBulan[] | null>(null);

  const [terbaru, setTerbaru] = useState<SuratWithRelasi[] | null>(null);
  const [belum, setBelum] = useState<SuratWithRelasi[] | null>(null);
  const [statusSurat, setStatusSurat] = useState<Status>('memuat');
  const [galatSurat, setGalatSurat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    setStatusRekap('memuat');
    setGalatRekap(null);
    Promise.all([
      ambilJson<Rekap>(`/api/donatur/rekap?dari=${q(dari)}&sampai=${q(sampai)}`),
      ambilJson<SuratWithRelasi[]>(`/api/donatur/surat?dari=${q(dari)}&sampai=${q(sampai)}&limit=500`),
    ])
      .then(([r, s]) => { if (batal) return; setRekap(r); setSuratPeriode(s); setStatusRekap('siap'); })
      .catch(e => { if (batal) return; setGalatRekap(pesan(e)); setStatusRekap('error'); });
    return () => { batal = true; };
  }, [dari, sampai]);

  useEffect(() => {
    let batal = false;
    const t = rentangTren(new Date());
    ambilJson<Rekap>(`/api/donatur/rekap?dari=${q(t.dari)}&sampai=${q(t.sampai)}`)
      .then(r => { if (!batal) setTren(isiBulanKosong(r.perBulan, t.dari, t.sampai)); })
      .catch(() => { if (!batal) setTren([]); }); // sparkline opsional — gagal tidak memblokir beranda
    return () => { batal = true; };
  }, []);

  useEffect(() => {
    let batal = false;
    Promise.all([
      ambilJson<SuratWithRelasi[]>('/api/donatur/surat?limit=5'),
      ambilJson<SuratWithRelasi[]>('/api/donatur/surat?terkirim=false&limit=5'),
    ])
      .then(([a, b]) => { if (batal) return; setTerbaru(a); setBelum(b); setStatusSurat('siap'); })
      .catch(e => { if (batal) return; setGalatSurat(pesan(e)); setStatusSurat('error'); });
    return () => { batal = true; };
  }, []);

  const pilihCepat = (p: PilihanPeriode) => {
    const r = rentangPeriode(p, new Date());
    setPilihan(p); setDari(r.dari); setSampai(r.sampai);
  };
  const pilihManual = (d: string, s: string) => { setPilihan('manual'); setDari(d); setSampai(s); };

  /** Surat baru ditandai terkirim dari carousel → keluarkan dari "perlu dikirim", perbarui angka. */
  const suratTerkirim = (id: string) => {
    const tandai = (l: SuratWithRelasi[] | null) => l?.map(s => (s.id === id ? { ...s, terkirimWa: true } : s)) ?? l;
    setBelum(l => l?.filter(s => s.id !== id) ?? l);
    setTerbaru(tandai);
    setSuratPeriode(tandai);
  };

  return {
    pilihan, dari, sampai, rekap, suratPeriode, statusRekap, galatRekap, tren,
    terbaru, belum, statusSurat, galatSurat, pilihCepat, pilihManual, suratTerkirim,
  };
}
