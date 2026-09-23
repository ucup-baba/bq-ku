'use client';

import React from 'react';
import {
  User, Camera, Sparkle, Check, IdentificationCard, BookOpen, GraduationCap, Users, Plus, X,
  CheckCircle, LockKey, Trash, XCircle, WarningCircle, WhatsappLogo,
} from '@phosphor-icons/react';
import { DocumentUploadBox } from '../DocumentUploadBox';
import { toTitleCase, calculateAge, deriveEducationFromPreviousSchool, formatNikDisplay, cleanNumericInput } from '@/lib/utils/formatters';
import type { SantriFormCtx } from './useSantriForm';

/** Langkah 1 — draf, nama santri, pindai/unggah berkas, hasil OCR. */
export function LangkahBerkas({ f }: { f: SantriFormCtx }) {
  const {
    isEditing, formData, setFormData, ocrFilledFields, newSkillInput, setNewSkillInput, fieldErrors,
    ocrAutoFilledNotice, setOcrAutoFilledNotice, uploadBoxKey, isNameLockedFromKk, pendingDocuments, setPendingDocuments,
    hasExistingDraft, draftInfo, handleRestoreDraft, handleDiscardDraft, handleOcrDataExtracted, handleBatchOcrCompleted,
    handleResetKkAndName, handlePhotoUpload, handleAddSkill, handleRemoveSkill, setGenderTheme,
  } = f;
  const nameHighlight = false;
  return (
    <div className="space-y-4">
      {/* Superpower 5: Draft Recovery Banner */}
      {hasExistingDraft && (
        <div className="p-4 rounded-3xl bg-teal-50 dark:bg-teal-950/50 border-2 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkle size={20} weight="fill" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Ditemukan Draf Pendaftaran Tersimpan
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                Ada data pengisian santri <strong>&quot;{draftInfo?.name}&quot;</strong> (tersimpan pukul {draftInfo?.time}) yang belum sempat disimpan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow transition-all cursor-pointer"
            >
              Pulihkan Draf
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-300 transition-all cursor-pointer"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Input Nama Santri (Paling Utama) */}
      <div className={`rounded-kartu bg-bq-surface border-2 border-emerald-500/30 shadow-kartu p-4 md:p-6 space-y-4 relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
              1
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Identitas Utama Santri (Nama)
                {isNameLockedFromKk ? (
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-teal-200 dark:border-teal-800">
                    <LockKey size={12} weight="fill" /> Terkunci dari Kartu Keluarga
                  </span>
                ) : ocrFilledFields.namaLengkap ? (
                  <span className="text-xs font-bold text-lime-600 dark:text-lime-400 bg-lime-100 dark:bg-lime-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" /> Sesuai Kartu Keluarga
                  </span>
                ) : null}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nama santri menjadi kunci acuan pencocokan seluruh dokumen berkas di Pondok Pesantren Baitul Qowwam.
              </p>
            </div>
          </div>
          {formData.namaLengkap && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Sparkle size={14} weight="duotone" className="text-teal-500" />
              <span>Target Acuan: {toTitleCase(formData.namaLengkap)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
          <div className="sm:col-span-6">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Lengkap Calon Santri *</span>
              {isNameLockedFromKk ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  <LockKey size={12} weight="fill" /> Terkunci dari KK
                </span>
              ) : (
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  (Otomatis Title Case)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                name="namaLengkap"
                type="text"
                required
                readOnly={isNameLockedFromKk}
                value={formData.namaLengkap}
                onChange={(e) => !isNameLockedFromKk && setFormData({ ...formData, namaLengkap: e.target.value })}
                onBlur={() => {
                  if (formData.namaLengkap && !isNameLockedFromKk) {
                    setFormData((prev) => ({ ...prev, namaLengkap: toTitleCase(prev.namaLengkap) }));
                  }
                }}
                placeholder="Contoh: Muhammad Hanif"
                className={`w-full px-4 py-3 rounded-2xl border text-base md:text-sm font-semibold transition-all shadow-inner ${
                  nameHighlight
                    ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-slate-100 animate-pulse'
                    : isNameLockedFromKk 
                    ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-not-allowed select-all pr-24'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none'
                }`}
              />
              {isNameLockedFromKk && (
                <button
                  type="button"
                  onClick={handleResetKkAndName}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  title="Hapus nama & lepaskan berkas KK"
                >
                  <Trash size={13} weight="bold" />
                  Hapus
                </button>
              )}
            </div>
            {fieldErrors.namaLengkap && <p className="mt-1 text-xs text-rose-600">{fieldErrors.namaLengkap}</p>}
            {nameHighlight && (
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 animate-in fade-in">
                <WarningCircle size={14} weight="fill" />
                <span>Ketik nama calon santri di sini terlebih dahulu.</span>
              </p>
            )}
            {isNameLockedFromKk && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Nama terkunci otomatis sebagai acuan dokumen. Klik tombol <strong>Hapus</strong> jika ingin mengganti santri.
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Tahun Masuk *</span>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
                Format Berkas
              </span>
            </label>
            <input
              type="number"
              min={2000}
              max={2099}
              required
              value={formData.tahunMasuk}
              onChange={(e) => setFormData({ ...formData, tahunMasuk: parseInt(e.target.value, 10) || new Date().getFullYear() })}
              placeholder="2026"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-base md:text-sm font-semibold focus:ring-2 focus:ring-[#0B5FA5] focus:bg-white focus:outline-none transition-all shadow-inner"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Panggilan
            </label>
            <input
              type="text"
              value={formData.namaPanggilan}
              onChange={(e) => setFormData({ ...formData, namaPanggilan: e.target.value })}
              onBlur={() => {
                if (formData.namaPanggilan) {
                  setFormData((prev) => ({ ...prev, namaPanggilan: toTitleCase(prev.namaPanggilan) }));
                }
              }}
              placeholder="Contoh: Hanif"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-base md:text-sm font-semibold focus:ring-2 focus:ring-[#0B5FA5] focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Pindai Dokumen Kependudukan (OCR) */}
        <div className={`bg-gradient-to-br from-teal-500/5 via-emerald-500/5 to-cyan-500/5 border border-teal-200 dark:border-teal-900/60 rounded-3xl p-6 shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-base">
              <Sparkle size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
              <span>Opsi 1: Pindai Otomatis dari Dokumen (OCR Presisi Tinggi)</span>
              <span className="text-xs bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                Rekomendasi
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Opsional</span>
          </div>

          <DocumentUploadBox 
            key={uploadBoxKey}
            onDataExtracted={handleOcrDataExtracted} 
            onBatchExtracted={handleBatchOcrCompleted}
            targetNamaSantri={formData.namaLengkap} 
            tahunMasuk={formData.tahunMasuk}
            jenisKelamin={formData.jenisKelamin}
            uploadedDocuments={pendingDocuments}
            onRemoveDocument={(kategori) => {
              setPendingDocuments(prev => prev.filter(d => d.kategori !== kategori));
            }}
          />
        </div>

      {/* Auto-filled Notification Banner */}
      {ocrAutoFilledNotice && (
        <div className={`p-4 rounded-3xl flex items-center justify-between shadow-sm animate-pulse-once border-2 ${
          ocrAutoFilledNotice.toLowerCase().includes('ditolak') || ocrAutoFilledNotice.toLowerCase().includes('dibatalkan') || ocrAutoFilledNotice.toLowerCase().includes('dihapus')
            ? 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-100'
            : ocrAutoFilledNotice.toLowerCase().includes('peringatan')
            ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-100'
            : 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl text-white flex items-center justify-center flex-shrink-0 shadow ${
              ocrAutoFilledNotice.toLowerCase().includes('ditolak') || ocrAutoFilledNotice.toLowerCase().includes('dibatalkan') || ocrAutoFilledNotice.toLowerCase().includes('dihapus')
                ? 'bg-rose-500'
                : ocrAutoFilledNotice.toLowerCase().includes('peringatan')
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}>
              {ocrAutoFilledNotice.toLowerCase().includes('ditolak') || ocrAutoFilledNotice.toLowerCase().includes('dibatalkan') || ocrAutoFilledNotice.toLowerCase().includes('dihapus') ? (
                <XCircle size={20} weight="fill" />
              ) : ocrAutoFilledNotice.toLowerCase().includes('peringatan') ? (
                <WarningCircle size={20} weight="fill" />
              ) : (
                <CheckCircle size={20} weight="bold" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                {ocrAutoFilledNotice}
              </h4>
              <p className="text-xs opacity-80">
                Data formulir telah disesuaikan. Anda dapat memeriksa, mengedit, atau menyimpannya langsung.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOcrAutoFilledNotice(null)}
            className="text-xs font-bold hover:underline px-3 py-1 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}
