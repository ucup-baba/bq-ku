'use client';

import React from 'react';
import { 
  XCircle, 
  User, 
  FileText, 
  X, 
  ArrowSquareOut, 
  CheckCircle, 
  WarningCircle,
  IdentificationCard
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
  onOpenNewRegistration?: (data: DocumentMismatchData) => void;
}

export function DocumentGuardModal({
  data,
  onCancel,
  onOpenNewRegistration,
}: DocumentGuardModalProps) {
  if (!data) return null;

  const detectedParent = data.extracted.namaAyah || data.extracted.namaIbu;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner flex-shrink-0">
              <XCircle size={26} weight="fill" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                Dokumen Ditolak: Identitas Tidak Sesuai
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                Nama pada berkas tidak cocok dengan data Kartu Keluarga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Sesuai alur verifikasi berkas, seluruh dokumen pendukung (SKL, Akta Kelahiran, dll) wajib memiliki nama yang sesuai dengan Kartu Keluarga santri yang sedang aktif.
          </p>

          {/* Side-by-Side Comparison Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Acuan Santri di Formulir (dari KK) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                <IdentificationCard size={15} weight="duotone" />
                <span>Acuan Kartu Keluarga</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 break-words">
                {data.currentName}
              </div>
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                <CheckCircle size={13} weight="fill" />
                <span>Dokumen Master Aktif</span>
              </div>
            </div>

            {/* Dokumen yang Baru Diunggah & Ditolak */}
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                <FileText size={15} weight="duotone" />
                <span>Dokumen Ditolak</span>
              </div>
              <div className="text-sm font-bold text-rose-950 dark:text-rose-200 break-words">
                {data.detectedName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                File: {data.fileName || 'Dokumen'} • ({data.kategori.replace(/_/g, ' ')})
              </div>
              {detectedParent && (
                <div className="text-[11px] text-rose-800 dark:text-rose-300 font-medium truncate">
                  Ortu: {detectedParent}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5">
            <WarningCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" weight="fill" />
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              Berkas <strong>{data.fileName || 'ini'}</strong> otomatis dibatalkan dan tidak dimasukkan ke formulir <strong>{data.currentName}</strong> untuk mencegah data tertukar atau tertimpa.
            </p>
          </div>

          {/* Action Options */}
          <div className="space-y-2.5 pt-2">
            {/* Action 1: Mengerti & Batalkan Berkas Ini */}
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle size={17} weight="bold" />
              <span>Mengerti (Batalkan & Hapus Berkas Ini)</span>
            </button>

            {/* Action 2: Buka Pendaftaran Baru untuk Santri Ini di Tab Baru */}
            {onOpenNewRegistration && (
              <button
                type="button"
                onClick={() => onOpenNewRegistration(data)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                <ArrowSquareOut size={16} weight="bold" className="text-teal-600 dark:text-teal-400" />
                <span>Buka Formulir Baru untuk {data.detectedName} di Tab Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
