'use client';

import React, { useRef, useState } from 'react';
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
  Eye,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { DoodleArrow, DoodleBadgeTape, DoodleSparkle, DoodleSpeechBubble, DoodleUnderline } from '@/components/ui/DoodleStickers';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
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

  const [activePreview, setActivePreview] = useState<{
    isOpen: boolean;
    title: string;
    fileUrl: string;
    badge?: string;
  }>({
    isOpen: false,
    title: '',
    fileUrl: '',
    badge: '',
  });


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

      {/* POSTER CARD (Creative Poster Style - Fully Adaptive Light & Dark Mode) */}
      <div 
        ref={posterRef}
        className={`relative overflow-hidden rounded-[2.5rem] border-4 shadow-2xl p-6 sm:p-10 transition-all ${
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
        <div className="relative flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
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
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-10">
          {/* Photo Frame (With floating creative badges) */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative">
              {/* Photo Background Ribbon */}
              <div className={`absolute -inset-2 rounded-3xl rotate-2 opacity-70 blur-sm ${
                isIkhwan ? 'bg-lime-400' : 'bg-rose-400'
              }`} />

              <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt={santri.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <User size={80} className="text-slate-400 dark:text-slate-500" />
                )}
              </div>

              {/* Floating Formal Photo Inset if Both Available */}
              {santri.fotoFormalUrl && santri.fotoProfilUrl && (
                <div className="absolute -bottom-4 -left-4 w-20 h-24 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg bg-slate-100 dark:bg-slate-800">
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
                className={isIkhwan ? "text-emerald-100 dark:text-emerald-900/80" : "text-rose-100 dark:text-rose-900/80"} 
              />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
              {santri.namaLengkap}
            </h1>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative">
          {/* Block 1: Tahfidz & Capaian */}
          <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-3">
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
          <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-3">
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
          <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-2">
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
          <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm space-y-2">
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
                    <span className="ml-1.5 inline-block text-[10px] font-extrabold px-1.5 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800">
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

        {/* DOCUMENT ARCHIVE STATUS (Full Width Block) */}
        <div className="mt-5 p-5 rounded-3xl bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <FileText size={16} weight="duotone" />
              Kelengkapan Berkas Administrasi
            </span>
            <span className="font-handwriting text-lg text-emerald-700 dark:text-lime-300 font-bold">
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
                  onClick={() => {
                    if (uploadedDoc?.fileUrl) {
                      setActivePreview({
                        isOpen: true,
                        title: `${reqCat.label} - ${santri.namaLengkap}`,
                        fileUrl: uploadedDoc.fileUrl,
                        badge: 'Terverifikasi'
                      });
                    }
                  }}
                  className={`p-3 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                    isUploaded 
                      ? 'bg-emerald-50/90 dark:bg-teal-950/40 border-emerald-300 dark:border-teal-500/50 text-emerald-900 dark:text-teal-200 cursor-pointer hover:border-emerald-500 dark:hover:border-teal-400 hover:bg-emerald-100/70 dark:hover:bg-teal-900/30 shadow-sm hover:shadow-md' 
                      : 'bg-slate-100/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px]">{reqCat.label}</span>
                    {isUploaded ? (
                      <CheckCircle size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <WarningCircle size={16} className="text-amber-500 dark:text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {isUploaded ? 'Terverifikasi' : 'Belum Ada'}
                  </span>
                  {uploadedDoc?.fileUrl && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200 dark:border-teal-500/20 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePreview({
                            isOpen: true,
                            title: `${reqCat.label} - ${santri.namaLengkap}`,
                            fileUrl: uploadedDoc.fileUrl,
                            badge: 'Terverifikasi'
                          });
                        }}
                        className="text-[11px] font-bold text-emerald-800 dark:text-teal-300 hover:text-emerald-950 dark:hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-emerald-200/70 dark:bg-teal-500/20 hover:bg-emerald-200 dark:hover:bg-teal-500/30 transition-colors cursor-pointer"
                      >
                        <Eye size={13} weight="bold" /> Pratinjau
                      </button>
                      <a
                        href={uploadedDoc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Buka Dokumen di Tab Baru"
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      >
                        <ArrowSquareOut size={14} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Signature Bar */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <span>Dicetak dari Sistem Administrasi Santri Baitul Qowwam</span>
          <span className="font-mono font-medium">NIK: {santri.nik} • ID: {santri.id}</span>
        </div>
      </div>


      {/* Pop-up Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={activePreview.isOpen}
        onClose={() => setActivePreview((prev) => ({ ...prev, isOpen: false }))}
        title={activePreview.title}
        fileUrl={activePreview.fileUrl}
        badge={activePreview.badge}
      />
    </div>
  );
}

