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
  Certificate
} from '@phosphor-icons/react';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik } from '@/lib/ocr/parser';
import { DoodleBadgeTape, DoodleSparkle } from '@/components/ui/DoodleStickers';
import { matchBestFamilyMember } from '@/lib/utils/formatters';

export interface DocumentUploadBoxProps {
  onDataExtracted?: (data: ExtractedDocumentData, fileUrl: string, kategori: string) => void;
  targetNamaSantri?: string;
  tahunMasuk?: number | string;
  jenisKelamin?: string;
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

export function DocumentUploadBox({ onDataExtracted, targetNamaSantri, tahunMasuk, jenisKelamin, className = '' }: DocumentUploadBoxProps) {
  const [selectedKategori, setSelectedKategori] = useState('KARTU_KELUARGA');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ExtractedDocumentData | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enhanceDocument, setEnhanceDocument] = useState<boolean>(true);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);

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
      uploadFormData.append('kategori', selectedKategori);
      if (tahunMasuk) uploadFormData.append('tahunMasuk', String(tahunMasuk));
      if (jenisKelamin) uploadFormData.append('jenisKelamin', jenisKelamin);
      if (targetNamaSantri) uploadFormData.append('namaSantri', targetNamaSantri);
      if (enhanceDocument) uploadFormData.append('enhance', 'true');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success) {
        throw new Error(uploadJson.error || 'Gagal mengunggah file.');
      }

      if (uploadJson.savingsPercent !== undefined) {
        setCompressionStats({
          originalSize: uploadJson.originalSize,
          compressedSize: uploadJson.compressedSize,
          savingsPercent: uploadJson.savingsPercent,
        });
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

  const handleReset = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setExtractedResult(null);
    setUploadedUrl(null);
    setErrorMessage(null);
    setCompressionStats(null);
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Ukuran Asli: {(selectedFile.size / 1024).toFixed(1)} KB • Tipe: {selectedKategori}
              </p>

              {/* Enhance & Compression Badge */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:border-teal-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={enhanceDocument}
                    onChange={(e) => setEnhanceDocument(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600"
                  />
                  <span>✨ Enhance Dokumen (Kontras HD)</span>
                </label>

                {compressionStats && compressionStats.savingsPercent > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    ⚡ Terkompresi: {(compressionStats.compressedSize / 1024).toFixed(0)} KB (Hemat {compressionStats.savingsPercent}%)
                  </span>
                )}
              </div>

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
              {Boolean(extractedResult.nik || extractedResult.noKk || extractedResult.namaLengkap || extractedResult.tempatLahir || (extractedResult.anggotaKeluarga && extractedResult.anggotaKeluarga.length > 0)) ? (
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
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl mb-3 flex items-start gap-2.5">
                  <WarningCircle size={20} weight="fill" className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Dokumen berhasil diunggah, namun sistem belum dapat membaca data teks dari berkas ini.
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Silakan isi formulir secara manual atau coba unggah berkas/scan dengan resolusi lebih tinggi.
                    </p>
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
