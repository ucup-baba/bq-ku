'use client';

import React from 'react';
import {
  User, Camera, Sparkle, Check, IdentificationCard, BookOpen, GraduationCap, Users, Plus, X,
  CheckCircle, LockKey, Trash, XCircle, WarningCircle, WhatsappLogo,
} from '@phosphor-icons/react';
import { DocumentUploadBox } from '../DocumentUploadBox';
import { toTitleCase, calculateAge, deriveEducationFromPreviousSchool, formatNikDisplay, cleanNumericInput } from '@/lib/utils/formatters';
import type { SantriFormCtx } from './useSantriForm';

/** Langkah 4 — pendidikan & profil CV. */
export function LangkahSekolah({ f }: { f: SantriFormCtx }) {
  const {
    isEditing, formData, setFormData, ocrFilledFields, newSkillInput, setNewSkillInput, fieldErrors,
    ocrAutoFilledNotice, setOcrAutoFilledNotice, uploadBoxKey, isNameLockedFromKk, pendingDocuments, setPendingDocuments,
    hasExistingDraft, draftInfo, handleRestoreDraft, handleDiscardDraft, handleOcrDataExtracted, handleBatchOcrCompleted,
    handleResetKkAndName, handlePhotoUpload, handleAddSkill, handleRemoveSkill, setGenderTheme,
  } = f;
  return (
    <div className="space-y-4">
      {/* Bagian Pendidikan & Pondok */}
      <div className={`rounded-kartu bg-bq-surface border border-bq-garis shadow-kartu p-4 md:p-6 space-y-5`}>
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <GraduationCap size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Pendidikan & Status Pondok
        </h3>

        {formData.jenjang === 'ALUMNI' && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <GraduationCap size={22} weight="duotone" className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Kategori Santri Purna / Alumni BQ (Lulusan SMA/SMK)</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Santri yang telah lulus tingkat SMA/SMK di Baitul Qowwam. Isi kolom di bawah dengan status kelulusan dan aktivitas studi lanjut (kuliah) atau khidmah saat ini.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Jenjang Pendidikan *</span>
              {ocrFilledFields.jenjang && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <select
              name="jenjang"
              value={formData.jenjang}
              onChange={e => setFormData({ ...formData, jenjang: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            >
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
              <option value="ALUMNI">Alumni (Lulusan SMA/SMK)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{formData.jenjang === 'ALUMNI' ? 'Status / Tahun Lulus *' : 'Kelas Saat Ini *'}</span>
              {ocrFilledFields.kelas && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              name="kelas"
              type="text"
              required
              value={formData.kelas}
              onChange={e => setFormData({ ...formData, kelas: e.target.value })}
              placeholder={formData.jenjang === 'ALUMNI' ? 'Contoh: Lulus 2024 / Angkatan 6' : 'Contoh: 7A, 10 IPA'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.kelas && <p className="text-xs text-rose-600 mt-1">{fieldErrors.kelas}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{formData.jenjang === 'ALUMNI' ? 'Aktivitas / Kampus / Khidmah Saat Ini *' : 'Sekolah Sekarang *'}</span>
              {ocrFilledFields.sekolahSekarang && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              name="sekolahSekarang"
              type="text"
              required
              value={formData.sekolahSekarang}
              onChange={e => setFormData({ ...formData, sekolahSekarang: e.target.value })}
              placeholder={formData.jenjang === 'ALUMNI' ? 'Contoh: Mahasiswa UNY / Khidmah Asrama BQ / Bekerja' : 'Contoh: SMA Negeri 1 Tempel / SMK / Sekolah Luar'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.sekolahSekarang && <p className="text-xs text-rose-600 mt-1">{fieldErrors.sekolahSekarang}</p>}
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{formData.jenjang === 'ALUMNI' ? 'Asal SMA / SMK Terakhir (Lulusan)' : 'Asal Sekolah Sebelumnya (SD / MTs / SMP)'}</span>
              {ocrFilledFields.asalSekolahSebelumnya && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              type="text"
              value={formData.asalSekolahSebelumnya}
              onChange={e => {
                const val = e.target.value;
                const derived = deriveEducationFromPreviousSchool(val);
                if (derived) {
                  setFormData(prev => ({
                    ...prev,
                    asalSekolahSebelumnya: val,
                    jenjang: derived.jenjang,
                    kelas: (prev.kelas === '7' || prev.kelas === '10' || prev.kelas.startsWith('Lulus') || !prev.kelas) ? derived.kelas : prev.kelas,
                  }));
                } else {
                  setFormData(prev => ({ ...prev, asalSekolahSebelumnya: val }));
                }
              }}
              placeholder={formData.jenjang === 'ALUMNI' ? 'Contoh: SMA IT Baitul Qowwam / SMK Negeri 2 Depok' : 'Contoh: SD Negeri 1 Sleman / SMP Muhammadiyah 1 Tempel'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bagian Profil CV & Minat Bakat (Untuk Kartu Poster CV) */}
      <div className={`rounded-kartu bg-bq-surface border border-bq-garis shadow-kartu p-4 md:p-6 space-y-5`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
            Profil CV Santri (Tampilan Poster Kreatif)
          </h3>
          <span className="font-handwriting text-xl text-teal-600 dark:text-teal-400">
            Tampil di Poster CV!
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ringkasan Tentang Santri (About Me)
            </label>
            <textarea
              rows={3}
              value={formData.ringkasanTentang}
              onChange={e => setFormData({ ...formData, ringkasanTentang: e.target.value })}
              placeholder="Ceritakan minat belajar, cita-cita, kepribadian, atau motivasi menuntut ilmu di pesantren..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Capaian / Riwayat Tahfidz Qur'an
              </label>
              <input
                type="text"
                value={formData.riwayatTahfidz}
                onChange={e => setFormData({ ...formData, riwayatTahfidz: e.target.value })}
                placeholder="Contoh: 5 Juz Mutqin (Juz 26-30)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Keahlian & Minat Bakat (Chips)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={e => setNewSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}}
                  placeholder="Tambah keahlian (misal: Desain Grafis)..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {formData.keahlian.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-medium"
                  >
                    {skill}
                    <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-teal-500 hover:text-rose-500">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
