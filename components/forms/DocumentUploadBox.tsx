'use client';

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Scan, 
  UploadSimple, 
  CheckCircle, 
  WarningCircle, 
  ArrowRight,
  Sparkle,
  Trash,
  IdentificationCard,
  GraduationCap,
  Certificate,
  MagnifyingGlass,
  UserCheck,
  UsersThree
} from '@phosphor-icons/react';
import { ExtractedDocumentData, FamilyMemberCandidate, parseIndonesianDate, extractBirthDateFromNik } from '@/lib/ocr/parser';
import { DoodleBadgeTape, DoodleSparkle } from '@/components/ui/DoodleStickers';
import { matchBestFamilyMember } from '@/lib/utils/formatters';

export interface DocumentUploadBoxProps {
  onDataExtracted?: (data: ExtractedDocumentData, fileUrl: string, kategori: string) => void;
  targetNamaSantri?: string;
  className?: string;
}

export const DOCUMENT_CATEGORIES = [
  { id: 'KARTU_KELUARGA', label: 'Kartu Keluarga (KK)', wajib: true, icon: FileText, desc: 'Scan KK asli/legalisir' },
  { id: 'KTP_ORTU', label: 'KTP Orang Tua (Ayah/Ibu)', wajib: true, icon: IdentificationCard, desc: 'Salah satu ayah atau ibu' },
  { id: 'AKTA_KELAHIRAN', label: 'Akta Kelahiran', wajib: true, icon: Certificate, desc: 'Akta kelahiran calon santri' },
  { id: 'SKL_IJAZAH', label: 'SKL / Ijazah Terakhir', wajib: true, icon: GraduationCap, desc: 'Surat Keterangan Lulus' },
  { id: 'KIP_PIP', label: 'KIP / PIP (Bansos)', wajib: false, icon: Sparkle, desc: 'Kartu Indonesia Pintar (jika ada)' },
  { id: 'KRM_PKH_KKS', label: 'KRM / PKH / KKS', wajib: false, icon: FileText, desc: 'Kartu Rentan Miskin / PKH' },
  { id: 'SKTM', label: 'Surat Keterangan Tidak Mampu', wajib: false, icon: FileText, desc: 'Dari Kelurahan/Desa' },
  { id: 'SERTIFIKAT_PRESTASI', label: 'Sertifikat Prestasi/Tahfidz', wajib: false, icon: Certificate, desc: 'Piagam lomba atau syahadah' },
];

export function DocumentUploadBox({ onDataExtracted, targetNamaSantri, className = '' }: DocumentUploadBoxProps) {
  const [selectedKategori, setSelectedKategori] = useState('KARTU_KELUARGA');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ExtractedDocumentData | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterType, setMemberFilterType] = useState<'ANAK' | 'ALL' | 'ORTU'>('ANAK');
  const [autoMatchMessage, setAutoMatchMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setExtractedResult(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedFile) {
      setErrorMessage('Silakan pilih berkas dokumen terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      // 1. Upload file
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success) {
        throw new Error(uploadJson.error || 'Gagal mengunggah file.');
      }

      const fileUrl = uploadJson.fileUrl;
      setUploadedUrl(fileUrl);

      // 2. Process OCR
      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kategori: selectedKategori,
          fileUrl: fileUrl,
        }),
      });

      const ocrJson = await ocrRes.json();
      if (!ocrRes.ok || !ocrJson.success) {
        throw new Error(ocrJson.error || 'Gagal memproses OCR.');
      }

      let finalExtracted: ExtractedDocumentData = ocrJson.extracted;

      // Smart Auto-Match jika targetNamaSantri sudah diisi di awal dan dokumen memiliki anggota keluarga
      if (
        targetNamaSantri &&
        targetNamaSantri.trim() &&
        ocrJson.extracted?.anggotaKeluarga &&
        ocrJson.extracted.anggotaKeluarga.length > 0
      ) {
        const matchedMember = matchBestFamilyMember(targetNamaSantri, ocrJson.extracted.anggotaKeluarga);
        if (matchedMember) {
          let bDate = matchedMember.tanggalLahir || ocrJson.extracted.tanggalLahir;
          if (bDate) {
            bDate = parseIndonesianDate(bDate) || bDate;
          } else if (matchedMember.nik) {
            bDate = extractBirthDateFromNik(matchedMember.nik) || undefined;
          }

          let gender = matchedMember.gender || ocrJson.extracted.jenisKelamin;
          if (/LAKI|IKHWAN|PRIA/i.test(gender || '')) gender = 'IKHWAN';
          else if (/PEREMPUAN|AKHWAT|WANITA/i.test(gender || '')) gender = 'AKHWAT';

          finalExtracted = {
            ...ocrJson.extracted,
            namaLengkap: matchedMember.nama,
            nik: matchedMember.nik || ocrJson.extracted.nik,
            tempatLahir: matchedMember.tempatLahir || ocrJson.extracted.tempatLahir,
            tanggalLahir: bDate,
            jenisKelamin: gender,
            namaAyah: ocrJson.extracted.namaAyah,
            namaIbu: ocrJson.extracted.namaIbu,
          };
          setAutoMatchMessage(`Data KK berhasil dicocokkan otomatis untuk santri: ${matchedMember.nama} (NIK: ${matchedMember.nik || '-'})`);
        }
      }

      setExtractedResult(finalExtracted);

      // Auto-apply immediately to form so user doesn't need to manually click
      if (onDataExtracted && finalExtracted) {
        onDataExtracted(finalExtracted, fileUrl, finalExtracted.kategori || selectedKategori);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses OCR.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToForm = () => {
    if (extractedResult && uploadedUrl && onDataExtracted) {
      onDataExtracted(extractedResult, uploadedUrl, extractedResult.kategori || selectedKategori);
    }
  };

  const handleSelectMember = (member: FamilyMemberCandidate) => {
    if (!extractedResult || !uploadedUrl || !onDataExtracted) return;
    let bDate = member.tanggalLahir || extractedResult.tanggalLahir;
    if (bDate) {
      bDate = parseIndonesianDate(bDate) || bDate;
    } else if (member.nik) {
      bDate = extractBirthDateFromNik(member.nik) || undefined;
    }

    let gender = member.gender || extractedResult.jenisKelamin;
    if (/LAKI|IKHWAN|PRIA/i.test(gender || '')) gender = 'IKHWAN';
    else if (/PEREMPUAN|AKHWAT|WANITA/i.test(gender || '')) gender = 'AKHWAT';

    const updated: ExtractedDocumentData = {
      ...extractedResult,
      namaLengkap: member.nama,
      nik: member.nik || extractedResult.nik,
      tempatLahir: member.tempatLahir || extractedResult.tempatLahir,
      tanggalLahir: bDate,
      jenisKelamin: gender,
      namaAyah: extractedResult.namaAyah,
      namaIbu: extractedResult.namaIbu,
    };
    setExtractedResult(updated);
    setAutoMatchMessage(`Santri dialihkan ke: ${member.nama} (NIK: ${member.nik || '-'})`);
    onDataExtracted(updated, uploadedUrl, updated.kategori || selectedKategori);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setExtractedResult(null);
    setUploadedUrl(null);
    setErrorMessage(null);
    setAutoMatchMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/40">
            <Scan size={22} weight="duotone" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Smart OCR Scanner Berkas
              <span className="text-xs bg-lime-100 dark:bg-lime-950/70 text-lime-800 dark:text-lime-300 font-bold px-2 py-0.5 rounded-full border border-lime-300/60 dark:border-lime-700/50">
                Auto-Fill Aktif
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unggah scan/foto berkas santri, sistem otomatis mengenali tulisan dan mengisi formulir di bawah
            </p>
          </div>
        </div>
        <DoodleSparkle className="text-lime-500" size={28} />
      </div>

      {/* Kategori Berkas Selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
          Pilih Kategori Dokumen (atau biarkan otomatis dideteksi):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DOCUMENT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedKategori === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedKategori(cat.id)}
                className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Icon size={18} weight={isSelected ? 'duotone' : 'regular'} className={isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} />
                  {cat.wajib && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                      Wajib
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold line-clamp-1">{cat.label}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{cat.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dropzone Area */}
      {!selectedFile ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/40 dark:bg-slate-800/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-teal-100/60 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-3">
            <UploadSimple size={28} weight="duotone" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
            Klik atau Tarik file foto berkas ke sini
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Mendukung file JPG, PNG, atau scan PDF. Dokumen langsung dibaca dan otomatis mengisi data santri.
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {filePreview && (
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0 bg-slate-200 dark:bg-slate-800">
                <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                {isScanning && (
                  <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                    <div className="w-full h-1 bg-teal-400 animate-pulse shadow-lg" />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={18} className="text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {selectedFile.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB • Tipe: {selectedKategori}
              </p>

              <div className="flex flex-wrap gap-2">
                {!extractedResult ? (
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleStartOcr}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    <Scan size={16} weight="bold" className={isScanning ? 'animate-spin' : ''} />
                    {isScanning ? 'Membaca Tulisan Dokumen (OCR)...' : 'Scan & Isi Otomatis'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    className="flex items-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    <CheckCircle size={16} weight="bold" />
                    Terapkan Ulang ke Formulir
                    <ArrowRight size={14} weight="bold" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <Trash size={14} />
                  Ganti File
                </button>
              </div>
            </div>
          </div>

          {/* Auto-filled status announcement */}
          {extractedResult && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl mb-3 flex items-start gap-2.5">
                <CheckCircle size={20} weight="fill" className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Selesai! Data berhasil diekstrak dan langsung terisi otomatis ke formulir di bawah.
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Anda tetap bisa mengubah, menambah, atau menghapus setiap kolom sesuai kebutuhan.
                  </p>
                </div>
              </div>

              {/* Family members filter & interactive selector for Kartu Keluarga */}
              {extractedResult.anggotaKeluarga && extractedResult.anggotaKeluarga.length > 0 && (
                <div className="mb-4 p-4 bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <UserCheck size={18} weight="duotone" className="text-teal-600 dark:text-teal-400" />
                        Pilih Anggota Keluarga / Calon Santri:
                        <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full">
                          {extractedResult.anggotaKeluarga.length} Ditemukan
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Klik nama anak yang didaftarkan agar NIK, TTL, dan jenis kelamin terisi sesuai orangnya.
                      </p>
                    </div>

                    {/* Filter Mode: Anak / Semua / Ortu */}
                    <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setMemberFilterType('ANAK')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          memberFilterType === 'ANAK'
                            ? 'bg-teal-600 text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Hanya Anak / Santri
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilterType('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          memberFilterType === 'ALL'
                            ? 'bg-teal-600 text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilterType('ORTU')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          memberFilterType === 'ORTU'
                            ? 'bg-teal-600 text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Orang Tua
                      </button>
                    </div>
                  </div>

                  {/* Filter Pencarian Nama / NIK */}
                  <div className="relative mb-3">
                    <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Ketik nama untuk memfilter... (misal: Hanif, Hamid, Rizqi, dsb.)"
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-sm"
                    />
                    {memberSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMemberSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Member Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {extractedResult.anggotaKeluarga
                      .filter((member) => {
                        const q = memberSearchQuery.trim().toLowerCase();
                        const matchesQuery = !q || member.nama.toLowerCase().includes(q) || (member.nik && member.nik.includes(q));
                        if (!matchesQuery) return false;

                        const isParent = member.hubungan && (member.hubungan.includes('KEPALA') || member.hubungan.includes('ISTRI'));
                        if (memberFilterType === 'ANAK') return !isParent;
                        if (memberFilterType === 'ORTU') return isParent;
                        return true;
                      })
                      .map((member, idx) => {
                        const isChosen = extractedResult.namaLengkap?.toLowerCase() === member.nama?.toLowerCase();
                        const isChild = !member.hubungan || member.hubungan === 'ANAK' || (!member.hubungan.includes('KEPALA') && !member.hubungan.includes('ISTRI'));

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectMember(member)}
                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                              isChosen
                                ? 'bg-teal-50/90 dark:bg-teal-950/70 border-teal-500 shadow-sm ring-2 ring-teal-500/30'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">
                                    {member.nama}
                                  </span>
                                  {member.gender && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      member.gender === 'IKHWAN'
                                        ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300'
                                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                    }`}>
                                      {member.gender}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                                  NIK: {member.nik || '-'}
                                </span>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isChild
                                  ? 'bg-lime-100 dark:bg-lime-950/70 text-lime-800 dark:text-lime-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {member.hubungan || (isChild ? 'ANAK' : 'KELUARGA')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <span>
                                {member.tempatLahir ? `${member.tempatLahir}, ` : ''}{member.tanggalLahir || '-'}
                              </span>
                              {isChosen ? (
                                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                                  <CheckCircle size={14} weight="fill" />
                                  Dipilih di Form
                                </span>
                              ) : (
                                <span className="text-slate-400 group-hover:text-teal-600 font-medium">
                                  Klik untuk pilih
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Chips of extracted fields */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {extractedResult.namaLengkap && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                    Nama: <strong className="text-teal-600 dark:text-teal-300">{extractedResult.namaLengkap}</strong>
                  </span>
                )}
                {extractedResult.nik && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                    NIK: <strong className="text-teal-600 dark:text-teal-300">{extractedResult.nik}</strong>
                  </span>
                )}
                {extractedResult.noKk && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                    No KK: <strong className="text-teal-600 dark:text-teal-300">{extractedResult.noKk}</strong>
                  </span>
                )}
                {extractedResult.namaAyah && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                    Ayah: {extractedResult.namaAyah}
                  </span>
                )}
                {extractedResult.namaIbu && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                    Ibu: {extractedResult.namaIbu}
                  </span>
                )}
                {extractedResult.pekerjaanOrtu && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                    Pekerjaan: {extractedResult.pekerjaanOrtu}
                  </span>
                )}
                {extractedResult.alamat && (
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
                    Alamat: {extractedResult.alamat}
                  </span>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <WarningCircle size={16} weight="fill" className="flex-shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
