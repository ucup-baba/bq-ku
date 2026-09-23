'use client';

import React, { useRef } from 'react';
import { User, GraduationCap, BookOpen, Sparkle, Buildings, IdentificationCard } from '@phosphor-icons/react';
import { DoodleBadgeTape, DoodleSparkle, DoodleSpeechBubble } from '@/components/ui/DoodleStickers';
import { calculateAge, formatDateIndonesian } from '@/lib/utils/formatters';


export interface SantriPosterCvProps {
  santri: {
    id: string;
    namaLengkap: string;
    namaPanggilan?: string | null;
    nik: string;
    noKk?: string | null;
    nisn?: string | null;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: 'IKHWAN' | 'AKHWAT';
    jenjang: string;
    kelas: string;
    sekolahSekarang: string;
    asalSekolahSebelumnya?: string | null;
    namaAyah?: string | null;
    namaIbu?: string | null;
    kontakWali?: string | null;
    pekerjaanOrtu?: string | null;
    alamat?: string | null;
    ringkasanTentang?: string | null;
    riwayatTahfidz?: string | null;
    keahlian?: string | null;
    fotoFormalUrl?: string | null;
    fotoProfilUrl?: string | null;
    documents?: Array<{
      id: string;
      kategori: string;
      nomorDokumen?: string | null;
      fileUrl: string;
      statusVerifikasi: string;
      catatanVerifikasi?: string | null;
    }>;
  };
}

export function SantriPosterCv({ santri }: SantriPosterCvProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const isIkhwan = santri.jenisKelamin === 'IKHWAN';

  const skillsList = santri.keahlian 
    ? (typeof santri.keahlian === 'string' ? JSON.parse(santri.keahlian) : santri.keahlian)
    : [];

  const displayPhoto = santri.fotoProfilUrl || santri.fotoFormalUrl;

  return (
    <div className="mx-auto max-w-4xl">
      {/* POSTER CARD (Creative Poster Style - Fully Adaptive Light & Dark Mode) */}
      <div 
        ref={posterRef}
        className={`relative overflow-hidden rounded-[2rem] border-4 shadow-2xl p-4 sm:p-10 transition-all ${
          isIkhwan 
            ? 'bg-gradient-to-b from-white via-slate-50 to-slate-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-lime-500 dark:border-lime-400 text-slate-800 dark:text-slate-100 shadow-lime-500/10' 
            : 'bg-gradient-to-b from-white via-slate-50 to-slate-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-rose-400 dark:border-rose-300 text-slate-800 dark:text-slate-100 shadow-rose-500/10'
        }`}
      >
        {/* Background Ambient Glow & Curves */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-15 dark:opacity-20 pointer-events-none ${
          isIkhwan ? 'bg-lime-400' : 'bg-rose-400'
        }`} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-15 dark:opacity-20 pointer-events-none bg-teal-400 dark:bg-teal-500" />

        {/* Poster Top Bar */}
        <div className="relative flex items-center justify-between gap-2 mb-4 pb-3 md:mb-8 md:pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              BAITUL QOWWAM • BIODATA SANTRI
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm ${
              isIkhwan ? 'bg-lime-400 text-slate-950' : 'bg-rose-400 text-slate-950'
            }`}>
              {santri.jenisKelamin}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-transparent backdrop-blur-sm">
              {santri.jenjang === 'ALUMNI' ? 'ALUMNI' : santri.jenjang} • {santri.jenjang === 'ALUMNI' ? (santri.kelas.toLowerCase().includes('lulus') ? santri.kelas : `Lulus ${santri.kelas}`) : `KELAS ${santri.kelas}`}
            </span>
            {calculateAge(santri.tanggalLahir) && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300/60 dark:border-teal-700 backdrop-blur-sm">
                {calculateAge(santri.tanggalLahir)?.text}
              </span>
            )}
          </div>
        </div>

        {/* Hero Section: Photo & Big Typography */}
        <div className="relative mb-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 md:mb-10 md:grid-cols-12 md:gap-8">
          {/* Photo Frame (With floating creative badges) */}
          <div className="flex justify-center md:col-span-5">
            <div className="relative">
              {/* Photo Background Ribbon */}
              <div className={`absolute -inset-2 rounded-3xl rotate-2 opacity-70 blur-sm ${
                isIkhwan ? 'bg-lime-400' : 'bg-rose-400'
              }`} />

              <div className="relative h-36 w-28 sm:h-80 sm:w-64 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt={santri.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-slate-400 dark:text-slate-500" />
                )}
              </div>

              {/* Floating Formal Photo Inset if Both Available */}
              {santri.fotoFormalUrl && santri.fotoProfilUrl && (
                <div className="absolute -bottom-4 -left-4 w-20 h-24 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg bg-slate-100 dark:bg-slate-800">
                  <img src={santri.fotoFormalUrl} alt="Formal" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-xs text-center text-white py-0.5 font-bold">
                    Pas Foto
                  </span>
                </div>
              )}

              {/* Tape Sticker Decor */}
              <div className="absolute -top-3 right-6 hidden -rotate-6 sm:block">
                <DoodleBadgeTape text="TERDATA RESMI" className={isIkhwan ? 'text-lime-400' : 'text-rose-300'} />
              </div>
            </div>
          </div>

          {/* Big Typography Header */}
          <div className="min-w-0 space-y-2 md:col-span-7 md:space-y-3">
            <div className="hidden sm:inline-block">
              <DoodleSpeechBubble 
                text={isIkhwan ? "Ahlan wa Sahlan!" : "Ahlan wa Sahlan!"} 
                className={isIkhwan ? "text-emerald-100 dark:text-emerald-900/80" : "text-rose-100 dark:text-rose-900/80"} 
              />
            </div>

            <h2 className="break-words text-2xl font-black leading-none tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {santri.namaLengkap}
            </h2>

            {santri.namaPanggilan && (
              <p className="font-handwriting text-2xl text-teal-700 dark:text-lime-300 font-bold -mt-1">
                Biasa dipanggil "{santri.namaPanggilan}"
              </p>
            )}

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-white/10 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-transparent text-xs font-semibold backdrop-blur-sm shadow-sm">
                <Buildings size={16} weight="duotone" />
                <span>{santri.sekolahSekarang}</span>
              </div>
            </div>

            {santri.ringkasanTentang && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                "{santri.ringkasanTentang}"
              </p>
            )}
          </div>
        </div>

        {/* MODULAR BENTO BLOCKS */}
        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
          {/* Block 1: Tahfidz & Capaian */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                <BookOpen size={16} weight="duotone" />
                Capaian Tahfidz & Al-Qur'an
              </span>
              <DoodleSparkle size={20} className={isIkhwan ? 'text-lime-500 dark:text-lime-400' : 'text-rose-400 dark:text-rose-300'} />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {santri.riwayatTahfidz || 'Dalam Proses Menghafal'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Terdaftar dalam program bimbingan halaqah tahfidz intensif santri Baitul Qowwam.
            </p>
          </div>

          {/* Block 2: Keahlian & Minat */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                <Sparkle size={16} weight="duotone" />
                Minat, Bakat & Keahlian
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsList.length > 0 ? (
                skillsList.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      idx % 2 === 0
                        ? (isIkhwan ? 'bg-lime-100 dark:bg-lime-400/20 text-lime-900 dark:text-lime-300 border border-lime-300 dark:border-lime-400/40' : 'bg-rose-100 dark:bg-rose-400/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-400/40')
                        : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-transparent'
                    }`}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">Belum ada keahlian khusus dicatat.</span>
              )}
            </div>
          </div>

          {/* Block 3: Riwayat Pendidikan */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <GraduationCap size={16} weight="duotone" />
              Riwayat Pendidikan
            </span>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">Sekolah Sekarang:</span>
                <span className="text-right">{santri.sekolahSekarang} ({santri.kelas})</span>
              </div>
              {santri.asalSekolahSebelumnya && (
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Sekolah Asal:</span>
                  <span className="text-right">{santri.asalSekolahSebelumnya}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">NISN:</span>
                <span className="text-right font-mono font-medium">{santri.nisn || '-'}</span>
              </div>
            </div>
          </div>

          {/* Block 4: Identitas & Wali Santri */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <IdentificationCard size={16} weight="duotone" />
              Identitas & Wali Santri
            </span>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-slate-400">TTL:</span>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {santri.tempatLahir}, {formatDateIndonesian(santri.tanggalLahir) || santri.tanggalLahir}
                  </span>
                  {calculateAge(santri.tanggalLahir) && (
                    <span className="ml-1.5 inline-block text-xs font-extrabold px-1.5 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800">
                      {calculateAge(santri.tanggalLahir)?.text}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Orang Tua:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {santri.namaAyah || santri.namaIbu ? `${santri.namaAyah || '-'} / ${santri.namaIbu || '-'}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">WhatsApp:</span>
                <span className="font-semibold text-teal-700 dark:text-teal-300">{santri.kontakWali || '-'}</span>
              </div>
              <div className="flex justify-between truncate">
                <span className="text-slate-500 dark:text-slate-400">Alamat:</span>
                <span className="truncate max-w-[180px] font-medium">{santri.alamat || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Signature Bar */}
        <div data-audit-abaikan className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Dicetak dari Sistem Administrasi Santri Baitul Qowwam</span>
          <span className="font-mono font-medium">NIK: {santri.nik} • ID: {santri.id}</span>
        </div>
      </div>


    </div>
  );
}

