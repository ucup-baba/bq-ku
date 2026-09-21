'use client';

import React from 'react';
import Link from 'next/link';
import { 
  User, 
  GraduationCap, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkle,
  FileText,
  Buildings
} from '@phosphor-icons/react';
import { DoodleSparkle } from '@/components/ui/DoodleStickers';
import { calculateAge } from '@/lib/utils/formatters';

export interface SantriCardProps {
  santri: {
    id: string;
    namaLengkap: string;
    namaPanggilan?: string | null;
    nik: string;
    tanggalLahir?: string | null;
    jenisKelamin: 'IKHWAN' | 'AKHWAT';
    jenjang: string;
    kelas: string;
    sekolahSekarang: string;
    riwayatTahfidz?: string | null;
    fotoFormalUrl?: string | null;
    fotoProfilUrl?: string | null;
    keahlian?: string | null;
    documents?: Array<{ kategori: string; statusVerifikasi: string }>;
  };
}

export function SantriCard({ santri }: SantriCardProps) {
  const isIkhwan = santri.jenisKelamin === 'IKHWAN';

  // Document status counting
  const docs = santri.documents || [];
  const requiredCategories = ['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH'];
  const uploadedRequired = requiredCategories.filter(cat => docs.some(d => d.kategori === cat));
  const hasKip = docs.some(d => d.kategori === 'KIP_PIP' || d.kategori === 'KRM_PKH_KKS' || d.kategori === 'SKTM');

  const skillsList = santri.keahlian 
    ? (typeof santri.keahlian === 'string' ? JSON.parse(santri.keahlian) : santri.keahlian)
    : [];

  const displayPhoto = santri.fotoProfilUrl || santri.fotoFormalUrl;

  return (
    <div className={`relative bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
      isIkhwan 
        ? 'border-emerald-200/80 dark:border-emerald-950/60 hover:border-emerald-400' 
        : 'border-rose-200/80 dark:border-rose-950/60 hover:border-rose-400'
    }`}>
      {/* Top Section */}
      <div>
        {/* Badges Bar */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
              isIkhwan
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300/60'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300/60'
            }`}>
              {santri.jenisKelamin}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {santri.jenjang} • {santri.kelas}
            </span>
            {calculateAge(santri.tanggalLahir) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80">
                {calculateAge(santri.tanggalLahir)?.text}
              </span>
            )}
          </div>

          {hasKip && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50">
              Bansos/KIP
            </span>
          )}
        </div>

        {/* Avatar + Main Info */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`relative w-16 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${
            isIkhwan ? 'border-lime-400 shadow-sm' : 'border-rose-300 shadow-sm'
          }`}>
            {displayPhoto ? (
              <img src={displayPhoto} alt={santri.namaLengkap} className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {santri.namaLengkap}
            </h4>
            {santri.namaPanggilan && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-handwriting text-base -mt-1 mb-1">
                Panggilan: "{santri.namaPanggilan}"
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
              <Buildings size={13} className="text-teal-600 flex-shrink-0" />
              <span className="truncate">{santri.sekolahSekarang}</span>
            </p>
            {santri.riwayatTahfidz && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold mt-1">
                <BookOpen size={13} weight="duotone" />
                <span>{santri.riwayatTahfidz}</span>
              </p>
            )}
          </div>
        </div>

        {/* Skills Chips */}
        {skillsList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {skillsList.slice(0, 3).map((skill: string, idx: number) => (
              <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
                {skill}
              </span>
            ))}
            {skillsList.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 text-slate-400">+{skillsList.length - 3}</span>
            )}
          </div>
        )}

        {/* Document Checklist Pill */}
        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1">
              <FileText size={14} className="text-teal-600" />
              Berkas Wajib:
            </span>
            <span className={`font-bold ${uploadedRequired.length === 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-700 dark:text-teal-300'}`}>
              {uploadedRequired.length}/4
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full transition-all ${
                uploadedRequired.length === 4 ? 'bg-emerald-500' : 'bg-teal-500'
              }`}
              style={{ width: `${(uploadedRequired.length / 4) * 100}%` }}
            />
          </div>

          {/* Mini Indikator Status Tiap Berkas Wajib */}
          <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold text-center pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            {[
              { id: 'KARTU_KELUARGA', label: 'KK' },
              { id: 'AKTA_KELAHIRAN', label: 'Akta' },
              { id: 'KTP_ORTU', label: 'KTP' },
              { id: 'SKL_IJAZAH', label: 'SKL' },
            ].map(item => {
              const done = docs.some(d => d.kategori === item.id);
              return (
                <span
                  key={item.id}
                  className={`py-0.5 rounded px-1 flex items-center justify-center gap-0.5 ${
                    done
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                  }`}
                  title={`${item.label}: ${done ? 'Sudah Terunggah' : 'Belum Ada'}`}
                >
                  {done && <CheckCircle size={10} weight="fill" className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <Link
          href={`/santri/${santri.id}/edit`}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-teal-600 transition-colors"
        >
          Edit Berkas
        </Link>
        <Link
          href={`/santri/${santri.id}`}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
            isIkhwan 
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700' 
              : 'bg-gradient-to-r from-teal-600 to-rose-500 hover:from-teal-700 hover:to-rose-600'
          }`}
        >
          Buka Poster CV
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
