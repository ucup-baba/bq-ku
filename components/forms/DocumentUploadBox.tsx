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
  Eye,
  FilePdf,
  Lightning,
  ShieldCheck,
  LockKey,
  Camera
} from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik } from '@/lib/ocr/parser';
import { DoodleBadgeTape, DoodleSparkle } from '@/components/ui/DoodleStickers';
import { matchBestFamilyMember } from '@/lib/utils/formatters';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { BatchScanModal, BatchItemResult } from './BatchScanModal';


export interface DocumentUploadBoxProps {
  onDataExtracted?: (data: ExtractedDocumentData, fileUrl: string, kategori: string, fileName?: string) => void;
  onBatchExtracted?: (results: BatchItemResult[]) => void;
  targetNamaSantri?: string;
  tahunMasuk?: number | string;
  jenisKelamin?: string;
  className?: string;
  uploadedDocuments?: Array<{
    kategori: string;
    fileUrl: string;
    nomorDokumen?: string;
    statusVerifikasi?: string;
  }>;
  onRemoveDocument?: (kategori: string) => void;
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
  { id: 'LAINNYA', label: 'Formulir / Berkas Lainnya', wajib: false, icon: FileText, desc: 'Formulir pendaftaran / berkas tambahan' },
];

export function DocumentUploadBox({ 
  onDataExtracted, 
  onBatchExtracted,
  targetNamaSantri, 
  tahunMasuk, 
  jenisKelamin, 
  className = '',
  uploadedDocuments = [],
  onRemoveDocument
}: DocumentUploadBoxProps) {
  const isNameEmpty = !targetNamaSantri || !targetNamaSantri.trim();
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedKategori, setSelectedKategori] = useState('KARTU_KELUARGA');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ExtractedDocumentData | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enhanceDocument, setEnhanceDocument] = useState<boolean>(true);
  const [modalPreview, setModalPreview] = useState<{
    isOpen: boolean;
    title: string;
    fileUrl: string;
    fileType?: string;
    badge?: string;
  }>({
    isOpen: false,
    title: '',
    fileUrl: '',
    fileType: undefined,
    badge: undefined,
  });
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setExtractedResult(null);

    // Create preview for images or PDF
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const blobUrl = URL.createObjectURL(file);
      setFilePreview(blobUrl);
    } else {
      setFilePreview(null);
    }
  };


  const handleStartOcr = async () => {
    if (isNameEmpty) {
      setErrorMessage('Silakan tulis Nama Lengkap Calon Santri pada Langkah 1 di atas terlebih dahulu.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Silakan pilih berkas dokumen terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      let fileUrl = '';

      // Direct upload ke Supabase jika file > 4MB untuk menghindari limit 4.5MB Vercel
      if (selectedFile.size > 4 * 1024 * 1024) {
        const supabase = createBrowserSupabase();
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const pathName = `${Date.now()}_${cleanName}`;
        const { error: upErr } = await supabase.storage.from('berkas').upload(pathName, selectedFile, { upsert: true });
        if (upErr) throw new Error(`Gagal mengunggah berkas: ${upErr.message}`);
        const { data: signed, error: signErr } = await supabase.storage.from('berkas').createSignedUrl(pathName, 3600);
        if (signErr || !signed) throw new Error('Gagal membuat tautan berkas');
        fileUrl = signed.signedUrl;
      } else {
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

        const uploadText = await uploadRes.text();
        let uploadJson;
        try {
          uploadJson = JSON.parse(uploadText);
        } catch {
          if (uploadRes.status === 413 || uploadText.includes('Request Entity Too Large')) {
            throw new Error('Ukuran berkas melebihi batas upload (maks 4.5 MB). Silakan gunakan file yang lebih ringkas.');
          }
          throw new Error(uploadText || 'Gagal mengunggah berkas.');
        }

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

        fileUrl = uploadJson.fileUrl;
      }

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

      const ocrText = await ocrRes.text();
      let ocrJson;
      try {
        ocrJson = JSON.parse(ocrText);
      } catch {
        throw new Error('Gagal membaca hasil analisis OCR.');
      }

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
        onDataExtracted(finalExtracted, fileUrl, finalExtracted.kategori || selectedKategori, selectedFile?.name);
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
      onDataExtracted(extractedResult, uploadedUrl, extractedResult.kategori || selectedKategori, selectedFile?.name);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setExtractedResult(null);
    setUploadedUrl(null);
    setErrorMessage(null);
    setCompressionStats(null);
    setModalPreview(prev => ({ ...prev, isOpen: false }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const mandatoryCategories = DOCUMENT_CATEGORIES.filter(c => c.wajib);
  const uploadedMandatoryCount = mandatoryCategories.filter(c => uploadedDocuments.some(d => d.kategori === c.id)).length;
  const mandatoryPercent = Math.round((uploadedMandatoryCount / mandatoryCategories.length) * 100);
  const currentExistingDoc = uploadedDocuments.find(d => d.kategori === selectedKategori);

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

      {/* Banner Peringatan jika Nama Santri belum diisi */}
      {isNameEmpty && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <LockKey size={22} weight="fill" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Langkah 1 Wajib: Tulis Nama Santri Terlebih Dahulu
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-normal mt-0.5">
                Fitur scanner dinonaktifkan sementara. Silakan ketik <strong>Nama Lengkap Calon Santri</strong> pada formulir Langkah 1 di atas terlebih dahulu sebagai acuan verifikasi dokumen.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const nameInput = document.querySelector('input[placeholder*="Muhammad Hanif"]') as HTMLInputElement;
              if (nameInput) {
                nameInput.focus();
                nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ketik Nama</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>
      )}

      {/* Upload Progress Bar + Multi-Scan Trigger */}
      <div className="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              Kelengkapan Berkas Wajib:
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-1">
                {uploadedMandatoryCount} dari {mandatoryCategories.length} Selesai ({mandatoryPercent}%)
              </span>
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Berkas: {uploadedDocuments.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                mandatoryPercent === 100 
                  ? 'bg-emerald-500' 
                  : mandatoryPercent > 0 
                  ? 'bg-teal-500' 
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              style={{ width: `${mandatoryPercent}%` }}
            />
          </div>
        </div>

        {/* Tombol Pemicu Magic Multi-Scan */}
        <button
          type="button"
          onClick={() => setIsBatchModalOpen(true)}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.99] text-white shadow-md hover:shadow-lg cursor-pointer"
          title="Pindai banyak dokumen sekaligus"
        >
          <Sparkle size={16} weight="fill" className="text-amber-300" />
          <span>✨ Multi-Scan Sekaligus</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-white/20 text-white">
            Batch AI
          </span>
        </button>
      </div>

      {/* Kategori Berkas Selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
          Pilih Kategori Dokumen (atau biarkan otomatis dideteksi):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DOCUMENT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedKategori === cat.id;
            const isUploaded = uploadedDocuments.some(d => d.kategori === cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedKategori(cat.id);
                  if (selectedFile) {
                    handleReset();
                  }
                }}
                className={`relative flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? isUploaded
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 shadow-sm ring-2 ring-teal-500/20'
                    : isUploaded
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className={`p-1 rounded-lg ${isUploaded ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400' : isSelected ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Icon size={18} weight={isSelected || isUploaded ? 'duotone' : 'regular'} />
                  </div>
                  
                  {isUploaded ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700">
                      <CheckCircle size={11} weight="fill" /> Terunggah
                    </span>
                  ) : cat.id === 'KARTU_KELUARGA' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-300 dark:border-teal-700">
                      <ShieldCheck size={11} weight="fill" /> Wajib #1
                    </span>
                  ) : cat.wajib ? (
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                      Wajib
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Opsional
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold line-clamp-1">{cat.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KK-First Guidance Alert */}
      {!uploadedDocuments.some(d => d.kategori === 'KARTU_KELUARGA') && selectedKategori !== 'KARTU_KELUARGA' && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-semibold">
            <IdentificationCard size={20} weight="duotone" className="text-amber-600 flex-shrink-0" />
            <span>Alur Verifikasi: Disarankan memindai <strong>Kartu Keluarga (KK)</strong> terlebih dahulu sebagai acuan utama identitas resmi santri.</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedKategori('KARTU_KELUARGA')}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold whitespace-nowrap shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
          >
            <ShieldCheck size={14} weight="bold" />
            Pilih KK Dulu
          </button>
        </div>
      )}

      {/* Dropzone Area or Existing Document Card */}
      {!selectedFile ? (
        currentExistingDoc ? (
          /* Card: Document already attached for selected category */
          <div className="p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-500/40 dark:border-emerald-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-300/50 dark:border-emerald-700/50">
                <CheckCircle size={28} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-700 flex items-center gap-1.5">
                    <CheckCircle size={14} weight="fill" /> Berkas Sudah Terlampir
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Kategori: {DOCUMENT_CATEGORIES.find(c => c.id === selectedKategori)?.label}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate mt-1">
                  {currentExistingDoc.fileUrl.split('/').pop() || 'Dokumen Terunggah'}
                </p>
                {currentExistingDoc.nomorDokumen && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No Dokumen: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentExistingDoc.nomorDokumen}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const catLabel = DOCUMENT_CATEGORIES.find(c => c.id === selectedKategori)?.label || selectedKategori;
                  setModalPreview({
                    isOpen: true,
                    title: `Berkas: ${catLabel}`,
                    fileUrl: currentExistingDoc.fileUrl,
                    fileType: currentExistingDoc.fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
                    badge: 'Sudah Terunggah',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Eye size={15} weight="bold" />
                Pratinjau Pop-up
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
                title="Foto ulang dokumen dengan kamera HP"
              >
                <Camera size={15} weight="bold" />
                Foto Ulang
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <UploadSimple size={15} weight="bold" />
                Ganti File
              </button>

              {onRemoveDocument && (
                <button
                  type="button"
                  onClick={() => onRemoveDocument(selectedKategori)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                  title="Hapus berkas ini"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Empty Dropzone */
          <div 
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all ${
              isNameEmpty
                ? 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50/40 dark:bg-slate-800/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              disabled={isNameEmpty}
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isNameEmpty}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
              isNameEmpty
                ? 'bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                : 'bg-teal-100/60 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
            }`}>
              {isNameEmpty ? <LockKey size={28} weight="fill" /> : <UploadSimple size={28} weight="duotone" />}
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              {isNameEmpty ? 'Tulis Nama Calon Santri di Atas Terlebih Dahulu' : 'Unggah atau Foto Berkas Dokumen'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              {isNameEmpty
                ? 'Isi nama calon santri pada Langkah 1 di atas untuk membuka fitur unggah dan pemindaian berkas.'
                : 'Mendukung foto berkas kamera HP (JPG, PNG) atau file PDF. Dokumen dibaca OCR presisi tinggi.'}
            </p>

            {!isNameEmpty && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Camera size={16} weight="bold" />
                  Foto via Kamera HP
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <UploadSimple size={16} weight="bold" />
                  Pilih Galeri / PDF
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {filePreview && (
              <div 
                onClick={() => setModalPreview({
                  isOpen: true,
                  title: selectedFile.name,
                  fileUrl: uploadedUrl || filePreview || '',
                  fileType: selectedFile.type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'),
                  badge: uploadedUrl ? 'Tersimpan di Cloud' : 'Draft Berkas',
                })}
                className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0 bg-slate-200 dark:bg-slate-800 cursor-pointer group shadow-sm hover:border-teal-500 transition-all"
                title="Klik untuk melihat pratinjau Pop-up"
              >
                {selectedFile.type.startsWith('image/') ? (
                  <img src={filePreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-300">
                    <FilePdf size={36} weight="fill" className="text-red-500 mb-1" />
                    <span className="text-xs font-bold text-center uppercase tracking-wider">Preview PDF</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                  <Eye size={16} weight="bold" /> Pop-up
                </div>
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
                  <span className="flex items-center gap-1.5">
                    <Sparkle size={13} weight="fill" className="text-teal-600 dark:text-teal-400" />
                    Enhance Dokumen (Kontras HD)
                  </span>
                </label>

                {compressionStats && compressionStats.savingsPercent > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                    <Lightning size={13} weight="fill" className="text-amber-500" />
                    Terkompresi: {(compressionStats.compressedSize / 1024).toFixed(0)} KB (Hemat {compressionStats.savingsPercent}%)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModalPreview({
                    isOpen: true,
                    title: selectedFile.name,
                    fileUrl: uploadedUrl || filePreview || '',
                    fileType: selectedFile.type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'),
                    badge: uploadedUrl ? 'Tersimpan di Cloud' : 'Draft Berkas',
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Eye size={15} weight="bold" className="text-teal-500" />
                  Pratinjau Pop-up
                </button>

                {!extractedResult ? (
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleStartOcr}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Scan size={16} weight="bold" className={isScanning ? 'animate-spin' : ''} />
                    {isScanning ? 'Membaca Tulisan Dokumen (OCR)...' : 'Scan & Isi Otomatis'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    className="flex items-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle size={16} weight="bold" />
                    Terapkan Ulang ke Formulir
                    <ArrowRight size={14} weight="bold" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
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
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
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
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
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

      {/* Attached Documents List */}
      {uploadedDocuments.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle size={15} weight="fill" className="text-emerald-500" />
              Daftar Berkas Terlampir ({uploadedDocuments.length})
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Klik &apos;Lihat&apos; untuk membuka pratinjau pop-up
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {uploadedDocuments.map((doc, idx) => {
              const catMeta = DOCUMENT_CATEGORIES.find(c => c.id === doc.kategori);
              const Icon = catMeta?.icon || FileText;
              return (
                <div 
                  key={`${doc.kategori}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 hover:border-teal-400 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {catMeta?.label || doc.kategori}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {doc.nomorDokumen ? `No: ${doc.nomorDokumen}` : 'Siap disimpan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModalPreview({
                        isOpen: true,
                        title: catMeta?.label || doc.kategori,
                        fileUrl: doc.fileUrl,
                        fileType: doc.fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
                        badge: 'Berkas Terlampir',
                      })}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg flex items-center gap-1 border border-teal-200 dark:border-teal-800/80 transition-colors cursor-pointer"
                    >
                      <Eye size={12} weight="bold" />
                      Lihat
                    </button>

                    {onRemoveDocument && (
                      <button
                        type="button"
                        onClick={() => onRemoveDocument(doc.kategori)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus dokumen ini"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch Multi-Scan Modal */}
      <BatchScanModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onBatchApply={(results) => {
          if (onBatchExtracted) {
            onBatchExtracted(results);
          }
        }}
        targetNamaSantri={targetNamaSantri}
        tahunMasuk={tahunMasuk}
        jenisKelamin={jenisKelamin}
      />

      {/* Pop-up Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={modalPreview.isOpen}
        onClose={() => setModalPreview(prev => ({ ...prev, isOpen: false }))}
        title={modalPreview.title}
        fileUrl={modalPreview.fileUrl}
        fileType={modalPreview.fileType}
        badge={modalPreview.badge}
      />
    </div>
  );
}

