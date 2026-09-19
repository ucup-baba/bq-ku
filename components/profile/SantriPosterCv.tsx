'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { 
  User, 
  Printer, 
  PencilSimple, 
  ShareNetwork, 
  FileText, 
  CheckCircle, 
  WarningCircle, 
  GraduationCap, 
  BookOpen, 
  Sparkle, 
  Buildings,
  MapPin,
  Phone,
  ArrowLeft,
  IdentificationCard,
  DownloadSimple
} from '@phosphor-icons/react';
import { DoodleArrow, DoodleBadgeTape, DoodleSparkle, DoodleSpeechBubble, DoodleUnderline } from '@/components/ui/DoodleStickers';

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

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Profil Santri - ${santri.namaLengkap}`,
        text: `Lihat profil santri dan berkas administrasi ${santri.namaLengkap}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link profil telah disalin ke clipboard!');
    }
  };

  // Required documents check
  const requiredCategories = [
    { key: 'KARTU_KELUARGA', label: 'Kartu Keluarga' },
    { key: 'AKTA_KELAHIRAN', label: 'Akta Kelahiran' },
    { key: 'KTP_ORTU', label: 'KTP Orang Tua' },
    { key: 'SKL_IJAZAH', label: 'SKL / Ijazah' },
  ];

  const docs = santri.documents || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Action Toolbar (Hidden during Print) */}
      <div className="print:hidden flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Link
          href="/santri"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Kembali ke Direktori
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ShareNetwork size={14} />
            Bagikan
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Printer size={14} weight="bold" />
            Cetak / PDF
          </button>
          <Link
            href={`/santri/${santri.id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm"
          >
            <PencilSimple size={14} weight="bold" />
            Edit Data
          </Link>
        </div>
      </div>

      {/* POSTER CARD (Creative Poster Style - Inspired by Media 2 & 1) */}
      <div 
        ref={posterRef}
        className={`relative overflow-hidden rounded-[2.5rem] border-4 shadow-2xl p-6 sm:p-10 transition-all ${
          isIkhwan 
            ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-lime-400 text-slate-100' 
            : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-rose-300 text-slate-100'
        }`}
      >
        {/* Background Ambient Glow & Curves */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isIkhwan ? 'bg-lime-400' : 'bg-rose-400'
        }`} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none bg-teal-500" />

        {/* Poster Top Bar */}
        <div className="relative flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold tracking-widest uppercase text-teal-400">
              BAITUL QOWWAM • BIODATA SANTRI
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isIkhwan ? 'bg-lime-400 text-slate-950' : 'bg-rose-400 text-slate-950'
            }`}>
              {santri.jenisKelamin}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-sm">
              {santri.jenjang} • KELAS {santri.kelas}
            </span>
          </div>
        </div>

        {/* Hero Section: Photo & Big Typography */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-10">
          {/* Photo Frame (With floating creative badges) */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative">
              {/* Photo Background Ribbon */}
              <div className={`absolute -inset-2 rounded-3xl rotate-2 opacity-70 blur-sm ${
                isIkhwan ? 'bg-lime-400' : 'bg-rose-400'
              }`} />

              <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-3xl overflow-hidden border-4 border-white/90 shadow-2xl bg-slate-800 flex items-center justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt={santri.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <User size={80} className="text-slate-500" />
                )}
              </div>

              {/* Floating Formal Photo Inset if Both Available */}
              {santri.fotoFormalUrl && santri.fotoProfilUrl && (
                <div className="absolute -bottom-4 -left-4 w-20 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-slate-800">
                  <img src={santri.fotoFormalUrl} alt="Formal" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center text-white py-0.5 font-bold">
                    Pas Foto
                  </span>
                </div>
              )}

              {/* Tape Sticker Decor */}
              <div className="absolute -top-3 right-6 -rotate-6">
                <DoodleBadgeTape text="TERDATA RESMI" className={isIkhwan ? 'text-lime-400' : 'text-rose-300'} />
              </div>
            </div>
          </div>

          {/* Big Typography Header */}
          <div className="md:col-span-7 space-y-3">
            <div className="inline-block">
              <DoodleSpeechBubble 
                text={isIkhwan ? "Ahlan wa Sahlan!" : "Ahlan wa Sahlan!"} 
                className={isIkhwan ? "text-lime-300" : "text-rose-300"} 
              />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              {santri.namaLengkap}
            </h1>

            {santri.namaPanggilan && (
              <p className="font-handwriting text-2xl text-lime-300 -mt-1">
                Biasa dipanggil "{santri.namaPanggilan}"
              </p>
            )}

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 text-teal-300 text-xs font-semibold backdrop-blur-sm">
                <Buildings size={16} weight="duotone" />
                <span>{santri.sekolahSekarang}</span>
              </div>
            </div>

            {santri.ringkasanTentang && (
              <p className="text-sm text-slate-300 leading-relaxed pt-2">
                "{santri.ringkasanTentang}"
              </p>
            )}
          </div>
        </div>

        {/* MODULAR BENTO BLOCKS (Dark Claymorphism Blocks) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative">
          {/* Block 1: Tahfidz & Capaian */}
          <div className="p-5 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <BookOpen size={16} weight="duotone" />
                Capaian Tahfidz & Al-Qur'an
              </span>
              <DoodleSparkle size={20} className={isIkhwan ? 'text-lime-400' : 'text-rose-300'} />
            </div>
            <div className="text-xl font-extrabold text-white">
              {santri.riwayatTahfidz || 'Dalam Proses Menghafal'}
            </div>
            <p className="text-xs text-slate-400">
              Terdaftar dalam program bimbingan halaqah tahfidz intensif santri Baitul Qowwam.
            </p>
          </div>

          {/* Block 2: Keahlian & Minat */}
          <div className="p-5 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
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
                        ? (isIkhwan ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40' : 'bg-rose-400/20 text-rose-300 border border-rose-400/40')
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Belum ada keahlian khusus dicatat.</span>
              )}
            </div>
          </div>

          {/* Block 3: Riwayat Pendidikan */}
          <div className="p-5 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <GraduationCap size={16} weight="duotone" />
              Riwayat Pendidikan
            </span>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-white">Sekolah Sekarang:</span>
                <span className="text-right">{santri.sekolahSekarang} ({santri.kelas})</span>
              </div>
              {santri.asalSekolahSebelumnya && (
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-white">Sekolah Asal:</span>
                  <span className="text-right">{santri.asalSekolahSebelumnya}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-white">NISN:</span>
                <span className="text-right font-mono">{santri.nisn || '-'}</span>
              </div>
            </div>
          </div>

          {/* Block 4: Identitas & Kontak Wali */}
          <div className="p-5 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <IdentificationCard size={16} weight="duotone" />
              Identitas & Wali Santri
            </span>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>TTL:</span>
                <span className="font-semibold text-white">{santri.tempatLahir}, {santri.tanggalLahir}</span>
              </div>
              <div className="flex justify-between">
                <span>Orang Tua:</span>
                <span className="font-semibold text-white">
                  {santri.namaAyah || santri.namaIbu ? `${santri.namaAyah || '-'} / ${santri.namaIbu || '-'}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>WhatsApp:</span>
                <span className="font-semibold text-teal-300">{santri.kontakWali || '-'}</span>
              </div>
              <div className="flex justify-between truncate">
                <span>Alamat:</span>
                <span className="truncate max-w-[180px]">{santri.alamat || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DOCUMENT ARCHIVE STATUS (Full Width Block) */}
        <div className="mt-5 p-5 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <FileText size={16} weight="duotone" />
              Kelengkapan Berkas Administrasi
            </span>
            <span className="font-handwriting text-lg text-lime-300">
              Arsip Digital
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {requiredCategories.map((reqCat) => {
              const uploadedDoc = docs.find(d => d.kategori === reqCat.key);
              const isUploaded = !!uploadedDoc;

              return (
                <div
                  key={reqCat.key}
                  className={`p-3 rounded-2xl border text-xs flex flex-col justify-between ${
                    isUploaded 
                      ? 'bg-teal-950/40 border-teal-500/50 text-teal-200' 
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-[11px]">{reqCat.label}</span>
                    {isUploaded ? (
                      <CheckCircle size={16} weight="fill" className="text-emerald-400" />
                    ) : (
                      <WarningCircle size={16} className="text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px]">
                    {isUploaded ? 'Terverifikasi' : 'Belum Ada'}
                  </span>
                  {uploadedDoc?.fileUrl && (
                    <a
                      href={uploadedDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-[10px] text-teal-300 underline flex items-center gap-1 hover:text-white"
                    >
                      <DownloadSimple size={12} /> Buka Berkas
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Signature Bar */}
        <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
          <span>Dicetak dari Sistem Administrasi Santri Baitul Qowwam</span>
          <span className="font-mono">NIK: {santri.nik} • ID: {santri.id}</span>
        </div>
      </div>
    </div>
  );
}
