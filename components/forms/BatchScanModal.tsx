'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkle,
  UploadSimple,
  CheckCircle,
  WarningCircle,
  FileText,
  Certificate,
  IdentificationCard,
  GraduationCap,
  Trash,
  X,
  SpinnerGap,
  Lightning,
  FilePdf,
  ShieldCheck,
  Check,
  LockKey,
  Camera
} from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { ExtractedDocumentData } from '@/lib/ocr/parser';
import { checkNameMatch, toTitleCase } from '@/lib/utils/formatters';
import { petakanTerbatas } from '@/lib/ocr/konkurensi';
import { pesanGagalPindai } from '@/lib/ocr/pesan-gagal';

type StatusPindai = 'menunggu' | 'mengunggah' | 'memindai' | 'selesai' | 'gagal';
type Unggahan = { fileUrl: string; storagePath: string; fileName: string };

export interface BatchItemResult {
  index: number;
  kategori: string;
  fileUrl: string;
  storagePath?: string;
  fileName: string;
  extracted: ExtractedDocumentData | null;
  error?: string;
  isMatch?: boolean;
}

export interface BatchScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchApply: (results: BatchItemResult[]) => void;
  targetNamaSantri?: string;
  tahunMasuk?: number | string;
  jenisKelamin?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  KARTU_KELUARGA: { label: 'Kartu Keluarga (KK)', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200' },
  AKTA_KELAHIRAN: { label: 'Akta Kelahiran', icon: Certificate, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200' },
  KTP_ORTU: { label: 'KTP Orang Tua', icon: IdentificationCard, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200' },
  SKL_IJAZAH: { label: 'SKL / Ijazah Terakhir', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200' },
  KIP_PIP: { label: 'KIP / PIP (Bansos)', icon: Sparkle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200' },
  KRM_PKH_KKS: { label: 'KRM / PKH / KKS', icon: FileText, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200' },
  SKTM: { label: 'SKTM', icon: FileText, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400 border-teal-200' },
  SERTIFIKAT_PRESTASI: { label: 'Sertifikat Prestasi', icon: Certificate, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200' },
  LAINNYA: { label: 'Formulir / Berkas Lainnya', icon: FileText, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
};

export function BatchScanModal({
  isOpen,
  onClose,
  onBatchApply,
  targetNamaSantri,
  tahunMasuk,
  jenisKelamin,
}: BatchScanModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchItemResult[] | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusBerkas, setStatusBerkas] = useState<StatusPindai[]>([]);
  // Hasil unggah per berkas disimpan agar "Coba lagi" tidak mengunggah ulang.
  const unggahanRef = useRef<Array<Unggahan | undefined>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesAdded = (newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    const validFiles = filesArray.filter(f => 
      f.type.startsWith('image/') || 
      f.type === 'application/pdf' || 
      f.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      setErrorBanner('Hanya berkas gambar (JPG, PNG, WebP) atau dokumen PDF yang didukung.');
      return;
    }

    setSelectedFiles(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 10) {
        setErrorBanner('Maksimal 10 berkas sekaligus. Berkas selebihnya diabaikan.');
        return combined.slice(0, 10);
      }
      return combined;
    });
    setErrorBanner(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    unggahanRef.current = unggahanRef.current.filter((_, i) => i !== index);
  };

  const isNameEmpty = !targetNamaSantri || !targetNamaSantri.trim();

  const ubahStatus = (i: number, st: StatusPindai) => setStatusBerkas(prev => { const n = [...prev]; n[i] = st; return n; });

  /** Pindai satu berkas: unggah (sekali) lalu kirim SATU request, sehingga setiap berkas punya batas waktunya sendiri. */
  const pindaiSatu = async (i: number): Promise<BatchItemResult[]> => {
    const file = selectedFiles[i];
    try {
      let item = unggahanRef.current[i];
      if (!item) {
        ubahStatus(i, 'mengunggah');
        const supabase = createBrowserSupabase();
        const pathName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('berkas').upload(pathName, file, { upsert: true });
        if (uploadError) throw new Error(`Gagal mengunggah: ${uploadError.message}`);
        const { data: signed, error: signErr } = await supabase.storage.from('berkas').createSignedUrl(pathName, 3600);
        if (signErr || !signed) throw new Error('Gagal membuat tautan berkas');
        item = { fileUrl: signed.signedUrl, storagePath: pathName, fileName: file.name };
        unggahanRef.current[i] = item;
      }
      ubahStatus(i, 'memindai');
      const res = await fetch('/api/ocr/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item], namaSantri: targetNamaSantri, tahunMasuk, jenisKelamin }),
      });
      const teks = await res.text();
      let json: any = null;
      try { json = JSON.parse(teks); } catch { /* bukan JSON, mis. halaman galat 504 */ }
      if (!res.ok || !json?.success) throw new Error(pesanGagalPindai(res.status, teks));
      ubahStatus(i, 'selesai');
      return (json.results as BatchItemResult[]).map(r => ({ ...r, index: i }));
    } catch (err: any) {
      ubahStatus(i, 'gagal');
      return [{ index: i, kategori: 'UNKNOWN', fileUrl: '', fileName: file.name, extracted: null, error: err?.message || 'Gagal memindai berkas' }];
    }
  };

  /** Pindai semua berkas (atau hanya `indeks` untuk coba ulang), maksimal 2 berkas bersamaan. */
  const handleStartBatchOcr = async (indeks?: number[]) => {
    if (selectedFiles.length === 0) {
      setErrorBanner('Silakan pilih minimal 1 berkas.');
      return;
    }
    const target = indeks ?? selectedFiles.map((_, i) => i);
    setIsProcessing(true);
    setErrorBanner(null);
    setStatusBerkas(prev => selectedFiles.map((_, i) => (target.includes(i) ? 'menunggu' : prev[i] ?? 'selesai')));

    const baru = (await petakanTerbatas(target, 2, pindaiSatu)).flat();
    const sebelumnya = (batchResults ?? []).filter(r => !target.includes(r.index));
    const resultsData = [...sebelumnya, ...baru].sort((a, b) => a.index - b.index);

    // Nama acuan: nama santri di formulir, atau nama dari KK, atau nama pertama yang terbaca.
    const kkResult = resultsData.find(r => r.kategori === 'KARTU_KELUARGA' && r.extracted?.namaLengkap);
    const masterName = targetNamaSantri || kkResult?.extracted?.namaLengkap || resultsData.find(r => r.extracted?.namaLengkap)?.extracted?.namaLengkap;
    setBatchResults(resultsData.map(r => {
      let isMatch = true;
      if (masterName && r.extracted?.namaLengkap && r.kategori !== 'KARTU_KELUARGA') {
        isMatch = checkNameMatch(masterName, r.extracted.namaLengkap).isMatch;
      }
      return { ...r, isMatch };
    }));
    setIsProcessing(false);
  };

  const handleApplyAll = () => {
    if (!batchResults) return;
    // Filter out items with errors
    const validResults = batchResults.filter(r => r.extracted && !r.error);
    onBatchApply(validResults);
    handleResetModal();
    onClose();
  };

  const handleResetModal = () => {
    setSelectedFiles([]);
    setStatusBerkas([]);
    unggahanRef.current = [];
    setBatchResults(null);
    setIsProcessing(false);
    setErrorBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[82vh] sm:max-h-[85vh] flex flex-col mb-[62px] sm:mb-6 mt-auto">
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Sparkle size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Magic Multi-Scan</span>
                <span className="text-xs bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                  AI OCR
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindai banyak berkas (KK, Akta, KTP, SKL) sekaligus
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleResetModal();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {errorBanner && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* STEP 1: Upload Dropzone (if results not yet processed) */}
          {!batchResults && !isProcessing && (
            <div className="space-y-4">
              {isNameEmpty && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-3">
                  <LockKey size={22} weight="fill" className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Nama Santri Belum Diisi di Formulir
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-normal mt-0.5">
                      Mohon tutup modal ini dan ketik <strong>Nama Lengkap Calon Santri</strong> pada formulir Langkah 1 terlebih dahulu sebagai patokan verifikasi dokumen.
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile Quick Action Buttons (Camera & File) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isNameEmpty}
                  onClick={() => cameraInputRef.current?.click()}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    isNameEmpty
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700 text-white active:scale-[0.98]'
                  }`}
                >
                  <Camera size={18} weight="bold" />
                  <span>Jepret Kamera HP Langsung</span>
                </button>
                <button
                  type="button"
                  disabled={isNameEmpty}
                  onClick={() => fileInputRef.current?.click()}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    isNameEmpty
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 active:scale-[0.98]'
                  }`}
                >
                  <UploadSimple size={18} weight="bold" />
                  <span>Pilih dari Galeri / File PDF</span>
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(e.target.files);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(e.target.files);
                }}
              />

              {/* Drag and Drop Zone (Desktop & Tablet) */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                }}
                onClick={() => {
                  if (!isNameEmpty) fileInputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-3xl text-center transition-all ${
                  selectedFiles.length > 0 ? 'p-3.5 sm:p-5' : 'p-6 sm:p-8'
                } ${
                  isNameEmpty 
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed'
                    : isDragOver
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 scale-[0.99] cursor-pointer'
                    : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer'
                }`}
              >
                <div className={`rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto ${
                  selectedFiles.length > 0 ? 'w-8 h-8 mb-1.5' : 'w-12 h-12 mb-2.5'
                }`}>
                  <UploadSimple size={selectedFiles.length > 0 ? 18 : 24} weight="duotone" />
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                  {selectedFiles.length > 0 ? 'Tambah berkas lain (tarik / klik)' : 'Atau tarik semua berkas ke sini'}
                </h4>
                {selectedFiles.length === 0 && (
                  <p className="text-xs sm:text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-2 leading-relaxed">
                    Foto dokumen (KK, Akta, SKL, KTP) atau 1 PDF gabungan. Gemini AI otomatis membaca isinya.
                  </p>
                )}

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold mt-1">
                  <Lightning size={11} weight="fill" />
                  <span>Maksimal 10 berkas</span>
                </div>
              </div>

              {/* Selected Files Preview List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Berkas Terpilih ({selectedFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-slate-400 hover:text-rose-500 text-xs"
                    >
                      Hapus Semua
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFiles.map((file, idx) => {
                      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                              {isPdf ? <FilePdf size={16} weight="duotone" /> : <FileText size={16} weight="duotone" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* STEP 2: Status per berkas */}
          {isProcessing && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-bq-tinta">
                <SpinnerGap size={18} className="animate-spin text-[#0E9F54]" aria-hidden="true" />
                Memindai {statusBerkas.filter(x => x === 'selesai' || x === 'gagal').length}/{selectedFiles.length} berkas…
              </p>
              <ul className="space-y-2" aria-live="polite">
                {selectedFiles.map((file, i) => {
                  const st = statusBerkas[i] ?? 'menunggu';
                  const label = { menunggu: 'Menunggu', mengunggah: 'Mengunggah…', memindai: 'Memindai…', selesai: 'Selesai', gagal: 'Gagal' }[st];
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-bq-garis p-2.5 text-xs">
                      <span className="min-w-0 truncate font-semibold text-bq-tinta">{file.name}</span>
                      <span className={`inline-flex shrink-0 items-center gap-1 font-bold ${st === 'selesai' ? 'text-[#0E9F54]' : st === 'gagal' ? 'text-rose-600' : 'text-bq-redup'}`}>
                        {st === 'selesai' ? <CheckCircle size={14} weight="fill" aria-hidden="true" />
                          : st === 'gagal' ? <WarningCircle size={14} weight="fill" aria-hidden="true" />
                          : st === 'menunggu' ? null : <SpinnerGap size={14} className="animate-spin" aria-hidden="true" />}
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* STEP 3: Results Preview & Confirmation */}
          {batchResults && !isProcessing && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    Berhasil mengenali {batchResults.filter(r => !r.error).length} dari {batchResults.length} berkas!
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {batchResults.some(r => r.error) && (
                    <button type="button" onClick={() => handleStartBatchOcr([...new Set(batchResults.filter(r => r.error).map(r => r.index))])}
                      className="text-xs font-bold text-rose-700 underline dark:text-rose-300">
                      Coba lagi yang gagal
                    </button>
                  )}
                  <button type="button" onClick={handleResetModal} className="text-xs font-bold underline">
                    Pindai ulang
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {batchResults.map((result, idx) => {
                  const catConfig = CATEGORY_LABELS[result.kategori] || {
                    label: result.kategori,
                    icon: FileText,
                    color: 'text-slate-600 bg-slate-100 border-slate-200',
                  };
                  const CatIcon = catConfig.icon;
                  const hasError = !!result.error;
                  const isMatch = result.isMatch !== false;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        hasError
                          ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
                          : !isMatch
                          ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${catConfig.color}`}>
                            <CatIcon size={18} weight="duotone" />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                {catConfig.label}
                              </span>
                              {isMatch ? (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <Check size={10} weight="bold" /> Cocok
                                </span>
                              ) : (
                                <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <WarningCircle size={10} weight="bold" /> Nama Berbeda
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              Berkas: {result.fileName}
                            </p>

                            {/* Extracted fields snippet */}
                            {result.extracted && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1">
                                {result.extracted.namaLengkap && (
                                  <span>Nama: <b>{toTitleCase(result.extracted.namaLengkap)}</b></span>
                                )}
                                {result.extracted.nik && (
                                  <span>NIK: {result.extracted.nik}</span>
                                )}
                                {result.extracted.jenisKelamin && (
                                  <span>Gender: <b className={result.extracted.jenisKelamin === 'AKHWAT' ? 'text-pink-600 dark:text-pink-400' : 'text-teal-600 dark:text-teal-400'}>{result.extracted.jenisKelamin}</b></span>
                                )}
                                {result.extracted.noKk && (
                                  <span>No KK: {result.extracted.noKk}</span>
                                )}
                                {result.extracted.jenjangTerdeteksi && (
                                  <span>Jenjang: <b>{result.extracted.jenjangTerdeteksi}</b></span>
                                )}
                              </div>
                            )}

                            {hasError && (
                              <p className="text-xs text-rose-600 font-semibold">{result.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              handleResetModal();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>

          {!batchResults ? (
            <button
              type="button"
              onClick={() => handleStartBatchOcr()}
              disabled={selectedFiles.length === 0 || isProcessing}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Sparkle size={16} weight="fill" />
              <span>{isProcessing ? 'Memindai…' : selectedFiles.length > 0 ? `Pindai ${selectedFiles.length} berkas` : 'Pilih berkas dulu'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyAll}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <CheckCircle size={16} weight="fill" />
              <span>Terapkan Semua ke Formulir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
