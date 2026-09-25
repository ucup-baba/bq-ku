'use client';

import React from 'react';
import {
  User, Camera, Sparkle, Check, IdentificationCard, BookOpen, GraduationCap, Users, Plus, X,
  CheckCircle, LockKey, Trash, XCircle, WarningCircle, WhatsappLogo,
} from '@phosphor-icons/react';
import { DocumentUploadBox } from '../DocumentUploadBox';
import { toTitleCase, calculateAge, deriveEducationFromPreviousSchool, formatNikDisplay, cleanNumericInput } from '@/lib/utils/formatters';
import type { SantriFormCtx } from './useSantriForm';

/** Langkah 3 — orang tua, wali & domisili. */
export function LangkahKeluarga({ f }: { f: SantriFormCtx }) {
  const {
    isEditing, formData, setFormData, ocrFilledFields, newSkillInput, setNewSkillInput, fieldErrors,
    ocrAutoFilledNotice, setOcrAutoFilledNotice, uploadBoxKey, isNameLockedFromKk, pendingDocuments, setPendingDocuments,
    hasExistingDraft, draftInfo, handleRestoreDraft, handleDiscardDraft, handleOcrDataExtracted, handleBatchOcrCompleted,
    handleResetKkAndName, handlePhotoUpload, handleAddSkill, handleRemoveSkill, setGenderTheme,
  } = f;
  return (
    <div className="space-y-4">
      {/* Bagian Orang Tua & Wali */}
      <div className={`rounded-kartu bg-bq-surface border border-bq-garis shadow-kartu p-4 md:p-6 space-y-5`}>
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Data Orang Tua / Wali & Domisili
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                Status Santri (Kondisi Sosial / Keluarga)
              </span>
              {ocrFilledFields.statusSosial && formData.statusSosial !== 'REGULER' && (
                <span className="text-xs font-bold text-lime-700 dark:text-lime-400 bg-lime-100 dark:bg-lime-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-lime-300 dark:border-lime-800">
                  <Sparkle size={11} weight="fill" /> Terdeteksi dari KK: {
                    ({ YATIM: 'Yatim (ayah wafat)', PIATU: 'Piatu (ibu wafat)', YATIM_PIATU: 'Yatim Piatu', DHUAFA: 'Dhuafa' } as Record<string, string>)[formData.statusSosial] ?? formData.statusSosial
                  }
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'REGULER', label: 'Reguler', desc: 'Orang tua lengkap' },
                { id: 'YATIM', label: 'Yatim', desc: 'Ayah telah wafat' },
                { id: 'PIATU', label: 'Piatu', desc: 'Ibu telah wafat' },
                { id: 'YATIM_PIATU', label: 'Yatim Piatu', desc: 'Ayah & Ibu wafat' },
                { id: 'DHUAFA', label: 'Dhuafa', desc: 'Keluarga prasejahtera' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    const updatedStatus = st.id as any;
                    let newAyah = formData.namaAyah;
                    let newIbu = formData.namaIbu;
                    if (updatedStatus === 'YATIM' && newAyah && !newAyah.includes('(Alm')) {
                      newAyah = `${newAyah} (Alm.)`;
                    }
                    if (updatedStatus === 'PIATU' && newIbu && !newIbu.includes('(Almh')) {
                      newIbu = `${newIbu} (Almh.)`;
                    }
                    setFormData({
                      ...formData,
                      statusSosial: updatedStatus,
                      namaAyah: newAyah,
                      namaIbu: newIbu,
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    formData.statusSosial === st.id
                      ? st.id === 'YATIM'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                        : 'bg-teal-600 text-white border-teal-600 font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                  }`}
                >
                  <div className="text-xs font-bold">{st.label}</div>
                  <div className="text-xs opacity-75 font-normal leading-tight mt-0.5">{st.desc}</div>
                </button>
              ))}
            </div>
            {formData.statusSosial === 'YATIM' && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5 font-medium">
                <CheckCircle size={13} weight="fill" className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Calon santri terdata sebagai <strong>Yatim</strong> (Ayah wafat/Almarhum). Prioritas beasiswa pendidikan & santunan yayasan.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Ayah</span>
              {ocrFilledFields.namaAyah && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              type="text"
              value={formData.namaAyah}
              onChange={e => setFormData({ ...formData, namaAyah: e.target.value })}
              placeholder="Nama Ayah Kandung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Ibu</span>
              {ocrFilledFields.namaIbu && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              type="text"
              value={formData.namaIbu}
              onChange={e => setFormData({ ...formData, namaIbu: e.target.value })}
              placeholder="Nama Ibu Kandung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kontak WhatsApp Wali
              </label>
              {formData.kontakWali && (
                <a
                  href={`https://wa.me/${formData.kontakWali.replace(/\D/g, '').replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  title="Tes kirim pesan WhatsApp ke nomor wali"
                >
                  <WhatsappLogo size={14} weight="fill" className="text-emerald-500" />
                  Tes Chat WA
                </a>
              )}
            </div>
            <input
              name="kontakWali"
              type="tel"
              inputMode="tel"
              value={formData.kontakWali}
              onChange={e => setFormData({ ...formData, kontakWali: cleanNumericInput(e.target.value, 16) })}
              placeholder="08123456789"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
            {fieldErrors.kontakWali && <p className="text-xs text-rose-600 mt-1">{fieldErrors.kontakWali}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pekerjaan Orang Tua
            </label>
            <input
              type="text"
              value={formData.pekerjaanOrtu}
              onChange={e => setFormData({ ...formData, pekerjaanOrtu: e.target.value })}
              placeholder="Wiraswasta / Karyawan / PNS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Alamat Lengkap</span>
              {ocrFilledFields.alamat && <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              type="text"
              value={formData.alamat}
              onChange={e => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:ring-2 focus:ring-[#0B5FA5] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
