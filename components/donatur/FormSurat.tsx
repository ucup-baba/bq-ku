'use client';
import { PratinjauSurat } from '@/components/donatur/PratinjauSurat';
import { useFormSurat, type FormSuratCtx } from './form-surat/useFormSurat';
import { BagianDonatur, BagianDonasi, BagianSurat, KotakGalat, TombolSimpan, KartuBagian } from './form-surat/Bagian';

export { hitungPratinjau, petakanErrorField, type FormState } from './form-surat/logika';

function TataLetakDesktop({ f }: { f: FormSuratCtx }) {
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <form onSubmit={e => { e.preventDefault(); f.simpan(); }} className="bergilir col-span-12 space-y-4 lg:col-span-7">
        <KotakGalat f={f} />
        <KartuBagian nomor={1} judul="Donatur" sub="Pilih donatur terdaftar atau tambahkan baru." warna="biru"><BagianDonatur f={f} /></KartuBagian>
        <KartuBagian nomor={2} judul="Donasi" sub="Jenis, bentuk, dan nilai donasi." warna="hijau"><BagianDonasi f={f} /></KartuBagian>
        <KartuBagian nomor={3} judul="Surat & gaya tulisan" sub="Nomor, tanggal, dan gaya tulisan tangan." warna="ungu"><BagianSurat f={f} /></KartuBagian>
        <TombolSimpan busy={f.busy} type="submit" />
      </form>
      <div className="col-span-12 lg:sticky lg:top-6 lg:col-span-5">
        <PratinjauSurat data={f.pratinjau} />
      </div>
    </div>
  );
}

export function FormSurat() {
  const f = useFormSurat();
  return <TataLetakDesktop f={f} />;
}
