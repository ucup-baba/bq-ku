'use client';

import React from 'react';
import { 
  ShieldWarning, 
  User, 
  FileText, 
  X, 
  ArrowSquareOut, 
  ArrowsCounterClockwise, 
  Check, 
  WarningCircle 
} from '@phosphor-icons/react';
import { ExtractedDocumentData } from '@/lib/ocr/parser';

export interface DocumentMismatchData {
  extracted: ExtractedDocumentData;
  fileUrl: string;
  kategori: string;
  fileName?: string;
  currentName: string;
  detectedName: string;
  currentAttachedCount?: number;
}

interface DocumentGuardModalProps {
  data: DocumentMismatchData | null;
  onCancel: () => void;
  onOpenNewRegistration: (data: DocumentMismatchData) => void;
  onReplaceCurrent: (data: DocumentMismatchData) => void;
  onForceApply: (data: DocumentMismatchData) => void;
}

export function DocumentGuardModal({
  data,
  onCancel,
  onOpenNewRegistration,
  onReplaceCurrent,
  onForceApply,
}: DocumentGuardModalProps) {
  if (!data) return null;

  const detectedParent = data.extracted.namaAyah || data.extracted.namaIbu;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/5 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <ShieldWarning size={24} weight="duotone" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                Penjaga Identitas Dokumen
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Peringatan: Berkas terdeteksi milik santri yang berbeda!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Sistem mendeteksi nama santri pada dokumen yang baru saja diunggah <strong>tidak cocok</strong> dengan nama santri yang sedang aktif di formulir saat ini. 
          </p>

          {/* Side-by-Side Comparison Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Santri Aktif di Formulir */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <User size={14} weight="bold" />
                <span>Santri di Formulir</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 break-words">
                {data.currentName}
              </div>
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                ✓ {data.currentAttachedCount || 1} berkas sudah terpasang
              </div>
            </div>

            {/* Dokumen yang Baru Diunggah */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <FileText size={14} weight="bold" />
                <span>Dokumen Baru Diunggah</span>
              </div>
              <div className="text-sm font-bold text-amber-950 dark:text-amber-200 break-words">
                {data.detectedName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                File: {data.fileName || 'Dokumen'} • ({data.kategori.replace(/_/g, ' ')})
              </div>
              {detectedParent && (
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Ortu: {detectedParent}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
            <WarningCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" weight="fill" />
            <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
              Mencegah dokumen tertukar: Jika dilanjutkan tanpa konfirmasi, berkas santri <strong>{data.detectedName}</strong> akan ikut tersimpan ke profil <strong>{data.currentName}</strong> atau menimpa data yang sudah ada.
            </p>
          </div>

          {/* Action Options */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Pilih Tindakan Pengamanan:
            </label>

            {/* Action 1: Tolak / Batalkan Berkas Ini */}
            <button
              type="button"
              onClick={onCancel}
              className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-left transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  🛑 Tolak & Batalkan Berkas Ini (Paling Aman)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Berkas {data.fileName || 'baru'} dibatalkan. Formulir dan berkas milik <strong>{data.currentName}</strong> tetap utuh.
                </p>
              </div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">
                Pilih →
              </span>
            </button>

            {/* Action 2: Buka Pendaftaran Baru di Tab Baru */}
            <button
              type="button"
              onClick={() => onOpenNewRegistration(data)}
              className="w-full p-3 rounded-2xl bg-teal-50 hover:bg-teal-100/80 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-left transition-all border border-teal-200 dark:border-teal-800 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <ArrowSquareOut size={16} className="text-teal-600 dark:text-teal-400" />
                  ➕ Buka Pendaftaran Baru untuk {data.detectedName}
                </div>
                <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
                  Buka tab formulir baru dengan data {data.detectedName} langsung terisi dari berkas ini.
                </p>
              </div>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300 group-hover:translate-x-1 transition-transform">
                Buka Tab →
              </span>
            </button>

            {/* Action 3: Ganti Santri di Formulir Ini (Reset Berkas Lama) */}
            <button
              type="button"
              onClick={() => onReplaceCurrent(data)}
              className="w-full p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 text-left transition-all border border-amber-200 dark:border-amber-800/70 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ArrowsCounterClockwise size={16} className="text-amber-600 dark:text-amber-400" />
                  🔄 Ganti Menjadi Santri Ini (Reset Data & Berkas Lama)
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Bersihkan data {data.currentName} dari formulir, lalu mulai pendaftaran untuk {data.detectedName}.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 group-hover:translate-x-1 transition-transform">
                Ganti →
              </span>
            </button>

            {/* Action 4: Tetap Gunakan (Nama Alias / Orang yang Sama) */}
            <button
              type="button"
              onClick={() => onForceApply(data)}
              className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all text-slate-500 dark:text-slate-400 flex items-center justify-between group cursor-pointer"
            >
              <div className="text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  ⚠️ Tetap Gabungkan (Orang yang Sama / Variasi Nama)
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                  Paksa lampirkan berkas ini ke formulir {data.currentName}.
                </span>
              </div>
              <Check size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
