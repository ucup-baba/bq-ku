'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Camera, 
  Sparkle, 
  Check, 
  FloppyDisk, 
  ArrowLeft, 
  IdentificationCard,
  BookOpen,
  GraduationCap,
  Users,
  Plus,
  X,
  Buildings
} from '@phosphor-icons/react';
import { DocumentUploadBox } from './DocumentUploadBox';
import { ExtractedDocumentData } from '@/lib/ocr/parser';
import { DoodleSpeechBubble, DoodleUnderline } from '@/components/ui/DoodleStickers';
import { useTheme } from '@/components/theme/ThemeProvider';

export interface SantriFormProps {
  initialData?: any;
  isEditing?: boolean;
  onSuccess?: (savedSantri: any) => void;
}

export function SantriForm({ initialData, isEditing = false, onSuccess }: SantriFormProps) {
  const router = useRouter();
  const { genderTheme, setGenderTheme } = useTheme();

  // Form State
  const [formData, setFormData] = useState({
    namaLengkap: initialData?.namaLengkap || '',
    namaPanggilan: initialData?.namaPanggilan || '',
    nik: initialData?.nik || '',
    noKk: initialData?.noKk || '',
    nisn: initialData?.nisn || '',
    tempatLahir: initialData?.tempatLahir || '',
    tanggalLahir: initialData?.tanggalLahir || '',
    jenisKelamin: initialData?.jenisKelamin || 'IKHWAN',
    jenjang: initialData?.jenjang || 'SMP',
    kelas: initialData?.kelas || '',
    sekolahSekarang: initialData?.sekolahSekarang || 'SMP IT Baitul Qowwam',
    asalSekolahSebelumnya: initialData?.asalSekolahSebelumnya || '',
    namaAyah: initialData?.namaAyah || '',
    namaIbu: initialData?.namaIbu || '',
    kontakWali: initialData?.kontakWali || '',
    pekerjaanOrtu: initialData?.pekerjaanOrtu || '',
    alamat: initialData?.alamat || '',
    ringkasanTentang: initialData?.ringkasanTentang || '',
    riwayatTahfidz: initialData?.riwayatTahfidz || '',
    keahlian: initialData?.keahlian ? (typeof initialData.keahlian === 'string' ? JSON.parse(initialData.keahlian) : initialData.keahlian) : ['Tahfidz Qur\'an', 'Bahasa Arab Dasar'],
    fotoFormalUrl: initialData?.fotoFormalUrl || '',
    fotoProfilUrl: initialData?.fotoProfilUrl || '',
  });

  // Track which fields were auto-filled by OCR
  const [ocrFilledFields, setOcrFilledFields] = useState<Record<string, boolean>>({});
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOcrBox, setShowOcrBox] = useState(true);

  // Handle OCR extracted data injection
  const handleOcrDataExtracted = (extracted: ExtractedDocumentData, fileUrl: string, kategori: string) => {
    const updated = { ...formData };
    const newOcrTags: Record<string, boolean> = { ...ocrFilledFields };

    if (extracted.namaLengkap) {
      updated.namaLengkap = extracted.namaLengkap;
      newOcrTags.namaLengkap = true;
    }
    if (extracted.nik) {
      updated.nik = extracted.nik;
      newOcrTags.nik = true;
    }
    if (extracted.noKk) {
      updated.noKk = extracted.noKk;
      newOcrTags.noKk = true;
    }
    if (extracted.nisn) {
      updated.nisn = extracted.nisn;
      newOcrTags.nisn = true;
    }
    if (extracted.tempatLahir) {
      updated.tempatLahir = extracted.tempatLahir;
      newOcrTags.tempatLahir = true;
    }
    if (extracted.tanggalLahir) {
      updated.tanggalLahir = extracted.tanggalLahir;
      newOcrTags.tanggalLahir = true;
    }
    if (extracted.jenisKelamin) {
      updated.jenisKelamin = extracted.jenisKelamin;
      setGenderTheme(extracted.jenisKelamin);
      newOcrTags.jenisKelamin = true;
    }
    if (extracted.namaAyah) {
      updated.namaAyah = extracted.namaAyah;
      newOcrTags.namaAyah = true;
    }
    if (extracted.namaIbu) {
      updated.namaIbu = extracted.namaIbu;
      newOcrTags.namaIbu = true;
    }
    if (extracted.alamat) {
      updated.alamat = extracted.alamat;
      newOcrTags.alamat = true;
    }
    if (extracted.pekerjaanOrtu) {
      updated.pekerjaanOrtu = extracted.pekerjaanOrtu;
      newOcrTags.pekerjaanOrtu = true;
    }
    if (extracted.asalSekolahSebelumnya) {
      updated.asalSekolahSebelumnya = extracted.asalSekolahSebelumnya;
      newOcrTags.asalSekolahSebelumnya = true;
    }

    setFormData(updated);
    setOcrFilledFields(newOcrTags);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'fotoFormalUrl' | 'fotoProfilUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormData(prev => ({ ...prev, [targetField]: data.fileUrl }));
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!formData.keahlian.includes(newSkillInput.trim())) {
      setFormData(prev => ({ ...prev, keahlian: [...prev.keahlian, newSkillInput.trim()] }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({ ...prev, keahlian: prev.keahlian.filter((s: string) => s !== skillToRemove) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const endpoint = isEditing ? `/api/santri/${initialData.id}` : '/api/santri';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan data santri');
      }

      if (onSuccess) {
        onSuccess(data.data);
      } else {
        router.push(`/santri/${data.data.id}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-teal-600 mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
            {isEditing ? 'Edit Data & Berkas Santri' : 'Administrasi Santri Baru'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Unggah dokumen untuk ekstraksi otomatis atau lengkapi data formulir di bawah ini
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowOcrBox(!showOcrBox)}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors"
          >
            {showOcrBox ? 'Sembunyikan Scanner OCR' : 'Buka Scanner OCR'}
          </button>
        </div>
      </div>

      {/* OCR Scanner Component */}
      {showOcrBox && (
        <DocumentUploadBox onDataExtracted={handleOcrDataExtracted} />
      )}

      {/* Dual Photo Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Camera size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Sistem Dua Foto Santri (Formal & Profil Kreatif)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Foto formal digunakan untuk rapor dan berkas ijazah, foto profil pose digunakan untuk kartu digital CV santri.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Foto Formal */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="relative w-24 h-28 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0 flex items-center justify-center">
              {formData.fotoFormalUrl ? (
                <img src={formData.fotoFormalUrl} alt="Formal" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-slate-400" />
              )}
            </div>
            <div>
              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-1">
                Pas Foto Formal (3x4)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Background merah/biru, berpakaian rapi</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50">
                <Camera size={14} />
                Pilih Foto Formal
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'fotoFormalUrl')} />
              </label>
            </div>
          </div>

          {/* Foto Profil Santai */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="relative w-24 h-28 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0 flex items-center justify-center">
              {formData.fotoProfilUrl ? (
                <img src={formData.fotoProfilUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <Sparkle size={36} className="text-slate-400" />
              )}
            </div>
            <div>
              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-lime-100 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 mb-1">
                Foto Profil Pose / CV
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Pose ekspresif untuk poster CV digital</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50">
                <Camera size={14} />
                Pilih Foto Pose
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'fotoProfilUrl')} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Identitas Santri */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <IdentificationCard size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Data Identitas Santri
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Lengkap *</span>
              {ocrFilledFields.namaLengkap && (
                <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400 flex items-center gap-1">
                  ✨ Diisi dari OCR
                </span>
              )}
            </label>
            <input
              type="text"
              required
              value={formData.namaLengkap}
              onChange={e => setFormData({ ...formData, namaLengkap: e.target.value })}
              placeholder="Contoh: Muhammad Haidar Ali"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Panggilan
            </label>
            <input
              type="text"
              value={formData.namaPanggilan}
              onChange={e => setFormData({ ...formData, namaPanggilan: e.target.value })}
              placeholder="Contoh: Haidar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>NIK Santri (16 Digit) *</span>
              {ocrFilledFields.nik && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              required
              maxLength={16}
              value={formData.nik}
              onChange={e => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
              placeholder="3304..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nomor Kartu Keluarga (KK)</span>
              {ocrFilledFields.noKk && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              maxLength={16}
              value={formData.noKk}
              onChange={e => setFormData({ ...formData, noKk: e.target.value.replace(/\D/g, '') })}
              placeholder="3304..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>NISN (10 Digit)</span>
              {ocrFilledFields.nisn && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              maxLength={10}
              value={formData.nisn}
              onChange={e => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
              placeholder="0087..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tempat Lahir *
            </label>
            <input
              type="text"
              required
              value={formData.tempatLahir}
              onChange={e => setFormData({ ...formData, tempatLahir: e.target.value })}
              placeholder="Sleman / Yogyakarta"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Lahir *
            </label>
            <input
              type="date"
              required
              value={formData.tanggalLahir}
              onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kelompok / Gender *
            </label>
            <div className="grid grid-cols-2 gap-2">
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

      {/* Bagian Pendidikan & Pondok */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <GraduationCap size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Pendidikan & Status Pondok
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenjang Pendidikan *
            </label>
            <select
              value={formData.jenjang}
              onChange={e => setFormData({ ...formData, jenjang: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
              <option value="ALUMNI">Alumni</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kelas Saat Ini *
            </label>
            <input
              type="text"
              required
              value={formData.kelas}
              onChange={e => setFormData({ ...formData, kelas: e.target.value })}
              placeholder="Contoh: 7A, 10 IPA, atau Lulus 2024"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sekolah Sekarang *
            </label>
            <input
              type="text"
              required
              value={formData.sekolahSekarang}
              onChange={e => setFormData({ ...formData, sekolahSekarang: e.target.value })}
              placeholder="Contoh: SMP IT Baitul Qowwam / SMA IT BQ"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Asal Sekolah Sebelumnya (SD / MTs)</span>
              {ocrFilledFields.asalSekolahSebelumnya && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              value={formData.asalSekolahSebelumnya}
              onChange={e => setFormData({ ...formData, asalSekolahSebelumnya: e.target.value })}
              placeholder="Contoh: SD Negeri 1 Sleman"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bagian Orang Tua & Wali */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
          Data Orang Tua / Wali
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Ayah</span>
              {ocrFilledFields.namaAyah && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              value={formData.namaAyah}
              onChange={e => setFormData({ ...formData, namaAyah: e.target.value })}
              placeholder="Nama Ayah Kandung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Ibu</span>
              {ocrFilledFields.namaIbu && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              value={formData.namaIbu}
              onChange={e => setFormData({ ...formData, namaIbu: e.target.value })}
              placeholder="Nama Ibu Kandung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kontak WhatsApp Wali
            </label>
            <input
              type="text"
              value={formData.kontakWali}
              onChange={e => setFormData({ ...formData, kontakWali: e.target.value })}
              placeholder="08123456789"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Alamat Lengkap</span>
              {ocrFilledFields.alamat && <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400">✨ OCR</span>}
            </label>
            <input
              type="text"
              value={formData.alamat}
              onChange={e => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bagian Profil CV & Minat Bakat (Untuk Kartu Poster CV) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
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

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-sm">
          {errorMessage}
        </div>
      )}

      {/* Submit Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
        >
          <FloppyDisk size={18} weight="bold" />
          {isSubmitting ? 'Menyimpan Data...' : isEditing ? 'Simpan Perubahan' : 'Simpan Data Santri'}
        </button>
      </div>
    </form>
  );
}
