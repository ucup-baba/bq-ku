'use client';

import React, { useState } from 'react';
import { CaretLeft, CaretRight, FloppyDisk } from '@phosphor-icons/react';
import { DocumentGuardModal } from '@/components/modals/DocumentGuardModal';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { useMedia } from '@/components/ui/useMedia';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { TombolUtama } from '@/components/ui/Tombol';
import { LANGKAH, validasiLangkah, langkahUntukGalat, type IdLangkah } from '@/lib/santri/langkah';
import { useSantriForm } from './santri/useSantriForm';
import { ProgresLangkah } from './santri/ProgresLangkah';
import { LangkahBerkas } from './santri/LangkahBerkas';
import { LangkahSantri } from './santri/LangkahSantri';
import { LangkahKeluarga } from './santri/LangkahKeluarga';
import { LangkahSekolah } from './santri/LangkahSekolah';

export interface SantriFormProps {
  initialData?: any;
  isEditing?: boolean;
  onSuccess?: (savedSantri: any) => void;
}

/** Fokus & gulir ke field bergalat pertama (input bernama, atau grup ber-data-name). */
function fokusKe(field: string | undefined) {
  if (!field) return;
  const el = document.querySelector<HTMLElement>(`[name="${field}"], [data-name="${field}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.focus({ preventScroll: true });
}

/**
 * Wizard 4 langkah yang urut: Lanjut hanya bila isian wajib langkah itu valid,
 * Kembali selalu bisa. Mode edit membuka semua langkah sejak awal.
 */
export function SantriForm({ initialData, isEditing = false, onSuccess }: SantriFormProps) {
  // Desktop: satu halaman panjang (layar lega). HP: wizard 4 langkah yang urut.
  const desktop = useMedia('(min-width: 1024px)');
  const [aktif, setAktif] = useState<IdLangkah>(1);
  const [tertinggi, setTertinggi] = useState<IdLangkah>(isEditing ? 4 : 1);

  const pindah = (id: IdLangkah) => {
    setAktif(id);
    setTertinggi(t => (id > t ? id : t));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const f = useSantriForm({
    initialData, isEditing, onSuccess,
    onGalatServer: (fields) => {
      if (desktop) { fokusKe(Object.keys(fields)[0]); return; }
      const l = langkahUntukGalat(fields);
      if (l) { setAktif(l); setTimeout(() => fokusKe(Object.keys(fields)[0]), 300); }
    },
  });

  const lanjut = () => {
    const galat = validasiLangkah(aktif, f.formData);
    if (Object.keys(galat).length > 0) {
      f.setFieldErrors(galat);
      fokusKe(Object.keys(galat)[0]);
      return;
    }
    f.setFieldErrors({});
    pindah((aktif + 1) as IdLangkah);
  };

  const info = LANGKAH[aktif - 1];
  const kembaliKe = isEditing && initialData?.id ? `/santri/${initialData.id}` : '/santri';

  const galatUmum = f.errorMessage && (
    <div className="space-y-1">
      <PesanGalat pesan={f.errorMessage} />
      {f.duplicateNik && (
        <a href={`/santri/${f.duplicateNik.existingId}`} className="px-1 text-sm font-bold text-bq-biru underline">
          Buka data santri yang sudah ada →
        </a>
      )}
    </div>
  );
  const penjaga = (
    <DocumentGuardModal data={f.mismatchData} onCancel={f.handleGuardCancel} onOpenNewRegistration={f.handleGuardOpenNewRegistration} />
  );

  if (desktop) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <KepalaHalaman
          judul={isEditing ? 'Edit data santri' : 'Santri baru'}
          sub="Lengkapi data santri, lalu simpan."
          kembali={{ href: kembaliKe, label: isEditing ? 'Kembali ke profil santri' : 'Kembali ke direktori' }}
        />
        <div className="bergilir space-y-5">
          <LangkahBerkas f={f} />
          <LangkahSantri f={f} />
          <LangkahKeluarga f={f} />
          <LangkahSekolah f={f} />
        </div>
        {galatUmum}
        <div className="sticky bottom-4 z-20 flex justify-end">
          <TombolUtama ikon={FloppyDisk} onClick={f.simpan} disabled={f.isSubmitting} className="h-12 px-8 shadow-angkat">
            {f.isSubmitting ? 'Menyimpan…' : isEditing ? 'Simpan perubahan' : 'Simpan data santri'}
          </TombolUtama>
        </div>
        {penjaga}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <KepalaHalaman
        judul={isEditing ? 'Edit data santri' : 'Santri baru'}
        sub={`Langkah ${aktif} dari 4 · ${info.judul}`}
        subTampilDiHp
        kembali={{ href: kembaliKe, label: isEditing ? 'Kembali ke profil santri' : 'Kembali ke direktori' }}
      />

      <div className="sticky top-0 z-20 -mx-4 bg-bq-bg/90 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8">
        <ProgresLangkah aktif={aktif} tertinggi={tertinggi} modeEdit={isEditing} onPilih={pindah} />
      </div>

      <div key={aktif} className="animate-halaman space-y-4">
        {aktif === 1 && <LangkahBerkas f={f} />}
        {aktif === 2 && <LangkahSantri f={f} />}
        {aktif === 3 && <LangkahKeluarga f={f} />}
        {aktif === 4 && <LangkahSekolah f={f} />}
      </div>

      {galatUmum}

      {/* Bar aksi: menempel di bawah layar pada HP, biasa di desktop */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-bq-garis bg-bq-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:justify-end md:border-0 md:bg-transparent md:p-0">
        {aktif > 1 && (
          <button type="button" onClick={() => pindah((aktif - 1) as IdLangkah)}
            className="tekan inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-bq-garis bg-bq-surface px-4 text-sm font-bold text-bq-tinta">
            <CaretLeft size={18} weight="bold" aria-hidden="true" /> Kembali
          </button>
        )}
        {aktif < 4 ? (
          <TombolUtama onClick={lanjut} ikon={CaretRight} className="h-12 flex-1 flex-row-reverse md:flex-none md:px-8">
            Lanjut: {LANGKAH[aktif as 1 | 2 | 3].label}
          </TombolUtama>
        ) : (
          <TombolUtama ikon={FloppyDisk} onClick={f.simpan} disabled={f.isSubmitting} className="h-12 flex-1 md:flex-none md:px-8">
            {f.isSubmitting ? 'Menyimpan…' : isEditing ? 'Simpan perubahan' : 'Simpan data santri'}
          </TombolUtama>
        )}
      </div>

      {penjaga}
    </div>
  );
}
