'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatRupiah } from '@/lib/utils/terbilang';
import type { JenisDonasi, GayaTulisan, SuratWithRelasi } from '@/lib/db/donatur-repo';
import type { PilihDonaturValue } from '@/components/donatur/PilihDonatur';
import { simpanDraf, bacaDraf, hapusDraf, labelWaktuDraf } from '@/lib/draf';
import { hitungPratinjau, petakanErrorField, hariIni, FIELD_DONATUR_DIKENAL, FIELD_SURAT_DIKENAL, type FormState } from './logika';

const KUNCI_DRAF = 'surat_baru';

type IsiDrafSurat = {
  donatur: PilihDonaturValue; jenis: JenisDonasi; bentuk: 'UANG' | 'BARANG'; nominal: number;
  deskripsiBarang: string; tanggalDonasi: string; tanggalSurat: string; tanggalSuratManual: boolean;
  keterangan: string; gayaTulisan: GayaTulisan;
};

/** Draf layak disimpan/ditawarkan bila ada isian nyata (bukan form kosong bawaan). */
export function drafBermakna(d: Pick<IsiDrafSurat, 'donatur' | 'nominal' | 'deskripsiBarang'>): boolean {
  return !!(d.donatur.nama.trim() || d.nominal > 0 || d.deskripsiBarang.trim());
}

/** Pesan saat permintaan gagal karena jaringan. */
function pesanGagalJaringan(adaDraf: boolean): string {
  if (typeof navigator === 'undefined' || navigator.onLine) return 'Tidak dapat terhubung ke server.';
  return adaDraf
    ? 'Kamu sedang offline. Isian aman tersimpan sebagai draf — tekan Simpan lagi saat sinyal kembali.'
    : 'Kamu sedang offline. Jangan tutup halaman ini — tekan Simpan lagi saat sinyal kembali.';
}

/**
 * State & logika form surat. Dengan `awal`, form berjalan dalam mode edit: donatur &
 * nomor surat terkunci, nomor otomatis tidak dimuat, dan Simpan memanggil PUT.
 */
export function useFormSurat(awal?: SuratWithRelasi) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeEdit = !!awal;
  const donaturIdAwal = modeEdit ? null : searchParams.get('donaturId');
  const d0 = awal?.donasi;

  const [donatur, setDonatur] = useState<PilihDonaturValue>(
    d0 ? { donaturId: d0.donatur.id, nama: d0.donatur.nama, sapaan: d0.donatur.sapaan, noWa: d0.donatur.noWa || '' }
       : { donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
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

  const [jenis, setJenis] = useState<JenisDonasi>(d0?.jenis ?? 'ZIS');
  const [bentuk, setBentuk] = useState<'UANG' | 'BARANG'>(d0?.bentuk ?? 'UANG');
  const [nominal, setNominal] = useState(d0?.nominal ?? 0);
  const [nominalTeks, setNominalTeks] = useState(d0?.nominal ? formatRupiah(d0.nominal) : '');
  const [deskripsiBarang, setDeskripsiBarang] = useState(d0?.deskripsiBarang ?? '');
  const [tanggalDonasi, setTanggalDonasi] = useState(d0?.tanggal ?? hariIni());
  const [tanggalSurat, setTanggalSuratMentah] = useState(awal?.tanggalSurat ?? hariIni());
  // Surat baru: tanggal surat mengikuti tanggal diterima sampai diubah sendiri.
  // Mode edit: keduanya lepas (tanggal surat lama tidak boleh bergeser diam-diam).
  const [tanggalSuratManual, setTanggalSuratManual] = useState(!!awal);
  const setTanggalSurat = (v: string) => { setTanggalSuratManual(true); setTanggalSuratMentah(v); };
  const ubahTanggalDonasi = (v: string) => {
    setTanggalDonasi(v);
    if (!tanggalSuratManual && v) setTanggalSuratMentah(v);
  };
  const [keterangan, setKeterangan] = useState(d0?.keterangan ?? '');

  const [nomorSurat, setNomorSurat] = useState(awal?.nomorSurat ?? '');
  const [nomorOtomatis, setNomorOtomatis] = useState('');
  const [nomorDiedit, setNomorDiedit] = useState(false);
  const [gayaTulisan, setGayaTulisan] = useState<GayaTulisan>(awal?.gayaTulisan ?? 'KALAM');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [donaturFieldErrors, setDonaturFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [nomorUsulan, setNomorUsulan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const belumPernahDiisi = useRef(true);

  useEffect(() => {
    if (modeEdit) return; // nomor surat yang sudah terbit tidak berubah
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

  // ── Draf (surat baru saja): isian disimpan di perangkat, ditawarkan dipulihkan saat dibuka lagi.
  const [drafTersedia, setDrafTersedia] = useState<{ nama: string; waktu: string; isi: IsiDrafSurat } | null>(null);
  const drafDicek = useRef(false);
  useEffect(() => {
    if (modeEdit) return;
    const d = bacaDraf<IsiDrafSurat>(KUNCI_DRAF);
    if (d && drafBermakna(d.isi)) {
      setDrafTersedia({ nama: d.isi.donatur.nama.trim(), waktu: labelWaktuDraf(d.savedAt), isi: d.isi });
    }
    drafDicek.current = true;
  }, [modeEdit]);

  useEffect(() => {
    // Jangan menimpa draf lama yang belum diputuskan (pulihkan/buang).
    if (modeEdit || !drafDicek.current || drafTersedia) return;
    const isi: IsiDrafSurat = { donatur, jenis, bentuk, nominal, deskripsiBarang, tanggalDonasi, tanggalSurat, tanggalSuratManual, keterangan, gayaTulisan };
    if (!drafBermakna(isi)) return;
    const t = setTimeout(() => simpanDraf(KUNCI_DRAF, isi), 600);
    return () => clearTimeout(t);
  }, [modeEdit, drafTersedia, donatur, jenis, bentuk, nominal, deskripsiBarang, tanggalDonasi, tanggalSurat, tanggalSuratManual, keterangan, gayaTulisan]);

  const pulihkanDraf = () => {
    if (!drafTersedia) return;
    const d = drafTersedia.isi;
    dipilihManualRef.current = true;
    setDonatur(d.donatur); setJenis(d.jenis); setBentuk(d.bentuk);
    setNominal(d.nominal); setNominalTeks(d.nominal ? formatRupiah(d.nominal) : '');
    setDeskripsiBarang(d.deskripsiBarang); setTanggalDonasi(d.tanggalDonasi);
    setTanggalSuratMentah(d.tanggalSurat); setTanggalSuratManual(d.tanggalSuratManual);
    setKeterangan(d.keterangan); setGayaTulisan(d.gayaTulisan);
    setDrafTersedia(null);
  };
  const buangDraf = () => { hapusDraf(KUNCI_DRAF); setDrafTersedia(null); };

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
    if (awal) {
      try {
        const res = await fetch(`/api/donatur/surat/${encodeURIComponent(awal.id)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donasi: {
              donaturId: awal.donasi.donaturId, tanggal: tanggalDonasi, jenis, bentuk,
              ...(bentuk === 'UANG' ? { nominal } : { deskripsiBarang }),
              keterangan: keterangan || undefined,
            },
            tanggalSurat, gayaTulisan,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && data.fields) {
          const { field, umum } = petakanErrorField(data.fields);
          setFieldErrors(field);
          if (umum) setError(umum);
          return;
        }
        if (!res.ok) { setError(data.error || 'Gagal menyimpan perubahan.'); return; }
        router.push('/donatur/surat/' + awal.id);
        router.refresh();
      } catch {
        setError(pesanGagalJaringan(false));
      } finally {
        setBusy(false);
      }
      return;
    }
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

      hapusDraf(KUNCI_DRAF);
      router.push('/donatur/surat/' + data.data.id);
    } catch {
      setError(pesanGagalJaringan(true));
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
    deskripsiBarang, setDeskripsiBarang, tanggalDonasi, setTanggalDonasi: ubahTanggalDonasi,
    tanggalSurat, setTanggalSurat, tanggalSuratIkut: !tanggalSuratManual, keterangan, setKeterangan,
    nomorSurat, ubahNomorSurat, nomorOtomatis, nomorDiedit, pakaiNomorOtomatis,
    gayaTulisan, setGayaTulisan,
    fieldErrors, donaturFieldErrors, error, nomorUsulan, pakaiNomorUsulan, busy,
    pratinjau, simpan, modeEdit,
    drafTersedia: drafTersedia ? { nama: drafTersedia.nama, waktu: drafTersedia.waktu } : null, pulihkanDraf, buangDraf,
  };
}

export type FormSuratCtx = ReturnType<typeof useFormSurat>;
