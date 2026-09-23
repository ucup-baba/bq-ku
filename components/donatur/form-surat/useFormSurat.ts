'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatRupiah } from '@/lib/utils/terbilang';
import type { JenisDonasi, GayaTulisan } from '@/lib/db/donatur-repo';
import type { PilihDonaturValue } from '@/components/donatur/PilihDonatur';
import { hitungPratinjau, petakanErrorField, hariIni, FIELD_DONATUR_DIKENAL, FIELD_SURAT_DIKENAL, type FormState } from './logika';

export function useFormSurat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const donaturIdAwal = searchParams.get('donaturId');

  const [donatur, setDonatur] = useState<PilihDonaturValue>({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
  const [pesanDonaturAwal, setPesanDonaturAwal] = useState<string | null>(null);
  // true begitu pengguna memilih donatur secara manual SEBELUM prefill ?donaturId= selesai —
  // mencegah hasil fetch yang datang belakangan menimpa pilihan pengguna.
  const dipilihManualRef = useRef(false);
  const ubahDonatur = (v: PilihDonaturValue) => { dipilihManualRef.current = true; setDonatur(v); };

  // Datang dari "Donasi lagi" (?donaturId=...) — muat donatur sekali lalu jadikan pilihan.
  useEffect(() => {
    if (!donaturIdAwal) return;
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/donatur/${encodeURIComponent(donaturIdAwal)}`);
        const data = await res.json();
        if (batal || dipilihManualRef.current) return;
        if (!res.ok || !data.data) { setPesanDonaturAwal('Donatur tidak ditemukan. Silakan pilih atau tambahkan donatur.'); return; }
        setDonatur({ donaturId: data.data.id, nama: data.data.nama, sapaan: data.data.sapaan, noWa: data.data.noWa || '' });
      } catch {
        if (!batal && !dipilihManualRef.current) setPesanDonaturAwal('Gagal memuat data donatur. Silakan pilih atau tambahkan donatur.');
      }
    })();
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donaturIdAwal]);

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
  const [gayaTulisan, setGayaTulisan] = useState<GayaTulisan>('KALAM');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [donaturFieldErrors, setDonaturFieldErrors] = useState<Record<string, string>>({});
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
        if (belumPernahDiisi.current || !nomorDiedit) setNomorSurat(nomor);
        belumPernahDiisi.current = false;
      } catch {
        // koneksi bermasalah — nomor tetap bisa diisi manual
      }
    })();
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggalSurat]);

  const pakaiNomorOtomatis = () => { setNomorSurat(nomorOtomatis); setNomorDiedit(false); };
  const ubahNomorSurat = (v: string) => { setNomorSurat(v); setNomorDiedit(true); };

  const state: FormState = {
    nama: donatur.nama, sapaan: donatur.sapaan, bentuk, nominal,
    deskripsiBarang, tanggalSurat, nomorSurat, keterangan, gayaTulisan,
  };
  const pratinjau = hitungPratinjau(state);

  const ubahNominal = (teks: string) => {
    const digit = teks.replace(/\D/g, '');
    const angka = digit === '' ? 0 : parseInt(digit, 10);
    setNominal(angka);
    setNominalTeks(digit === '' ? '' : formatRupiah(angka));
  };

  const simpan = async () => {
    setBusy(true);
    setError(null);
    setNomorUsulan(null);
    setFieldErrors({});
    setDonaturFieldErrors({});
    try {
      let donaturId = donatur.donaturId;
      if (!donaturId) {
        const resDonatur = await fetch('/api/donatur', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama: donatur.nama, sapaan: donatur.sapaan, noWa: donatur.noWa || undefined }),
        });
        const dataDonatur = await resDonatur.json();
        if (resDonatur.status === 400 && dataDonatur.fields) {
          setDonaturFieldErrors(dataDonatur.fields);
          if (Object.keys(dataDonatur.fields).some(k => !FIELD_DONATUR_DIKENAL.has(k))) setError('Periksa kembali isian donatur.');
          return;
        }
        if (!resDonatur.ok) { setError(dataDonatur.error || 'Gagal menyimpan donatur.'); return; }
        // Simpan id donatur baru SEGERA — bila POST surat berikutnya gagal (409/400) dan
        // pengguna menekan Simpan lagi, donatur ini dipakai ulang, bukan dibuat dobel.
        donaturId = dataDonatur.data.id;
        setDonatur(d => ({ ...d, donaturId }));
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
        gayaTulisan,
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
        const { field, umum } = petakanErrorField(data.fields);
        setFieldErrors(field);
        const tidakDikenal = Object.keys(field).some(k => !FIELD_SURAT_DIKENAL.has(k));
        if (umum || tidakDikenal) setError(umum || 'Periksa kembali isian.');
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

  return {
    donatur, ubahDonatur, pesanDonaturAwal,
    jenis, setJenis, bentuk, setBentuk, nominal, nominalTeks, ubahNominal,
    deskripsiBarang, setDeskripsiBarang, tanggalDonasi, setTanggalDonasi,
    tanggalSurat, setTanggalSurat, keterangan, setKeterangan,
    nomorSurat, ubahNomorSurat, nomorOtomatis, nomorDiedit, pakaiNomorOtomatis,
    gayaTulisan, setGayaTulisan,
    fieldErrors, donaturFieldErrors, error, nomorUsulan, pakaiNomorUsulan, busy,
    pratinjau, simpan,
  };
}

export type FormSuratCtx = ReturnType<typeof useFormSurat>;
