'use client';

import React from 'react';
import {
  User, Camera, Sparkle, Check, IdentificationCard, BookOpen, GraduationCap, Users, Plus, X,
  CheckCircle, LockKey, Trash, XCircle, WarningCircle, WhatsappLogo,
} from '@phosphor-icons/react';
import { DocumentUploadBox } from '../DocumentUploadBox';
import { toTitleCase, calculateAge, deriveEducationFromPreviousSchool, formatNikDisplay, cleanNumericInput } from '@/lib/utils/formatters';
import type { SantriFormCtx } from './useSantriForm';

/** Langkah 2 — foto formal & santai, data kependudukan. */
export function LangkahSantri({ f }: { f: SantriFormCtx }) {
  const {
    isEditing, formData, setFormData, ocrFilledFields, newSkillInput, setNewSkillInput, fieldErrors,
    ocrAutoFilledNotice, setOcrAutoFilledNotice, uploadBoxKey, isNameLockedFromKk, pendingDocuments, setPendingDocuments,
    hasExistingDraft, draftInfo, handleRestoreDraft, handleDiscardDraft, handleOcrDataExtracted, handleBatchOcrCompleted,
    handleResetKkAndName, handlePhotoUpload, handleAddSkill, handleRemoveSkill, setGenderTheme,
  } = f;
  return (
    <div className="space-y-4">
      {/* Dual Photo Section */}
      <div id="santri-form-section" className={`rounded-kartu bg-bq-surface border border-bq-garis shadow-kartu p-4 md:p-6 scroll-mt-6`}>
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Camera size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Sistem Dua Foto Santri (Formal & Profil Kreatif)
        </h3>
        <p className="hidden text-xs text-slate-500 dark:text-slate-400 mb-6 sm:block">
          Foto formal digunakan untuk rapor dan berkas ijazah, foto profil pose digunakan untuk kartu digital CV santri.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {/* Foto Formal */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-bq-garis bg-slate-50 p-3 text-center dark:bg-slate-800/40 sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left">
            <div className="relative h-24 w-20 sm:h-28 sm:w-24 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0 flex items-center justify-center">
              {formData.fotoFormalUrl ? (
                <img src={formData.fotoFormalUrl} alt="Formal" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-slate-400" />
              )}
            </div>
            <div>
              <span className="inline-block text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-1">
                Pas Foto Formal (3x4)
              </span>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 mb-2 sm:block">Background merah/biru, berpakaian rapi</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50">
                <Camera size={14} />
                Pilih foto
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'fotoFormalUrl')} />
              </label>
            </div>
          </div>

          {/* Foto Profil Santai */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-bq-garis bg-slate-50 p-3 text-center dark:bg-slate-800/40 sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left">
            <div className="relative h-24 w-20 sm:h-28 sm:w-24 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0 flex items-center justify-center">
              {formData.fotoProfilUrl ? (
                <img src={formData.fotoProfilUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-slate-400" />
              )}
            </div>
            <div>
              <span className="inline-block text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mb-1">
                Foto Pose / Profil Santai
              </span>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 mb-2 sm:block">Pose ekspresif untuk poster CV digital</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50">
                <Camera size={14} />
                Pilih foto
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'fotoProfilUrl')} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Identitas Kependudukan Santri */}
      <div className={`rounded-kartu bg-bq-surface border border-bq-garis shadow-kartu p-4 md:p-6 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <IdentificationCard size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
            Data Kependudukan & Kelahiran
          </h3>
          {formData.namaLengkap && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Calon Santri: <strong className="text-teal-700 dark:text-teal-300">{formData.namaLengkap}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>NIK Santri (16 Digit) *</span>
              {ocrFilledFields.nik && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              name="nik"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              maxLength={19}
              value={formatNikDisplay(formData.nik)}
              onChange={e => setFormData({ ...formData, nik: cleanNumericInput(e.target.value, 16) })}
              placeholder="3404 1455 0110 0001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm font-mono tracking-wide focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.nik && <p className="text-xs text-rose-600 mt-1">{fieldErrors.nik}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nomor Kartu Keluarga (KK)</span>
              {ocrFilledFields.noKk && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              name="noKk"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={19}
              value={formatNikDisplay(formData.noKk)}
              onChange={e => setFormData({ ...formData, noKk: cleanNumericInput(e.target.value, 16) })}
              placeholder="3404 1423 1111 0001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm font-mono tracking-wide focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.noKk && <p className="text-xs text-rose-600 mt-1">{fieldErrors.noKk}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>NISN (10 Digit)</span>
              {ocrFilledFields.nisn && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              name="nisn"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={formData.nisn}
              onChange={e => setFormData({ ...formData, nisn: cleanNumericInput(e.target.value, 10) })}
              placeholder="0087123456"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm font-mono tracking-wide focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.nisn && <p className="text-xs text-rose-600 mt-1">{fieldErrors.nisn}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tempat Lahir *
            </label>
            <input
              name="tempatLahir"
              type="text"
              required
              value={formData.tempatLahir}
              onChange={e => setFormData({ ...formData, tempatLahir: e.target.value })}
              placeholder="Sleman / Yogyakarta"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.tempatLahir && <p className="text-xs text-rose-600 mt-1">{fieldErrors.tempatLahir}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Lahir *
              </label>
              {(() => {
                const ageInfo = calculateAge(formData.tanggalLahir);
                return ageInfo ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    <Sparkle size={12} weight="fill" className="text-teal-500" />
                    Usia: {ageInfo.text}
                  </span>
                ) : null;
              })()}
            </div>
            <input
              name="tanggalLahir"
              type="date"
              required
              value={formData.tanggalLahir}
              onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.tanggalLahir && <p className="text-xs text-rose-600 mt-1">{fieldErrors.tanggalLahir}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kelompok / Gender *
            </label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis kelamin" tabIndex={-1} data-name="jenisKelamin">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, jenisKelamin: 'IKHWAN' });
                  setGenderTheme('IKHWAN');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  formData.jenisKelamin === 'IKHWAN'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Ikhwan (Putra)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, jenisKelamin: 'AKHWAT' });
                  setGenderTheme('AKHWAT');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  formData.jenisKelamin === 'AKHWAT'
                    ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Akhwat (Putri)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
