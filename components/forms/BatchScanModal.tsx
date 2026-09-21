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
  LockKey
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { ExtractedDocumentData } from '@/lib/ocr/parser';
import { checkNameMatch, toTitleCase } from '@/lib/utils/formatters';

export interface BatchItemResult {
  index: number;
  kategori: string;
  fileUrl: string;
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
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [batchResults, setBatchResults] = useState<BatchItemResult[] | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const isNameEmpty = !targetNamaSantri || !targetNamaSantri.trim();

  const handleStartBatchOcr = async () => {
    if (isNameEmpty) {
      setErrorBanner('Silakan tulis Nama Lengkap Calon Santri pada formulir Langkah 1 terlebih dahulu.');
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorBanner('Silakan pilih minimal 1 berkas.');
      return;
    }

    setIsProcessing(true);
    setProgressMsg(`Menyiapkan ${selectedFiles.length} berkas...`);
    setErrorBanner(null);

    try {
      let resultsData: any[] = [];

      // Strategi 1: Jika client Supabase tersedia, unggah langsung ke Supabase Cloud Storage
      // Ini 100% menghindari batasan payload 4.5MB Vercel (mendukung file hingga 50MB)
      if (supabase) {
        const uploadedItems: Array<{ fileUrl: string; fileName: string }> = [];

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setProgressMsg(`Mengunggah berkas ${i + 1}/${selectedFiles.length}: ${file.name}...`);

          const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const pathName = `${Date.now()}_${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from('berkas')
            .upload(pathName, file, { upsert: true });

          if (uploadError) {
            throw new Error(`Gagal mengunggah ${file.name} ke storage: ${uploadError.message}`);
          }

          const { data: pUrl } = supabase.storage.from('berkas').getPublicUrl(pathName);
          uploadedItems.push({
            fileUrl: pUrl.publicUrl,
            fileName: file.name,
          });
        }

        setProgressMsg(`Memindai & mengekstrak data berkas dengan Gemini Vision AI...`);

        const res = await fetch('/api/ocr/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: uploadedItems,
            namaSantri: targetNamaSantri,
            tahunMasuk,
            jenisKelamin,
          }),
        });

        const resText = await res.text();
        let json;
        try {
          json = JSON.parse(resText);
        } catch {
          if (res.status === 413 || resText.includes('Request Entity Too Large')) {
            throw new Error('Ukuran berkas melebihi batas server (maks 4.5 MB). Silakan gunakan file yang lebih kecil.');
          }
          throw new Error(resText || `Gagal memproses batch OCR (Status ${res.status})`);
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal memproses batch scan.');
        }

        resultsData = json.results;
      } else {
        // Strategi 2: Fallback multipart/form-data
        const formData = new FormData();
        selectedFiles.forEach(f => formData.append('files', f));
        if (targetNamaSantri) formData.append('namaSantri', targetNamaSantri);
        if (tahunMasuk) formData.append('tahunMasuk', String(tahunMasuk));
        if (jenisKelamin) formData.append('jenisKelamin', jenisKelamin);

        const res = await fetch('/api/ocr/batch', {
          method: 'POST',
          body: formData,
        });

        const resText = await res.text();
        let json;
        try {
          json = JSON.parse(resText);
        } catch {
          if (res.status === 413 || resText.includes('Request Entity Too Large')) {
            throw new Error('Ukuran berkas terlalu besar untuk dikirim sekaligus (maks 4.5 MB). Silakan gunakan file yang lebih ringkas atau unggah satu per satu.');
          }
          throw new Error(resText || `Gagal memproses batch scan (Status ${res.status})`);
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal memproses batch scan.');
        }

        resultsData = json.results;
      }

      // First check if there's a KK in the results to establish master name
      const kkResult = resultsData.find((r: any) => r.kategori === 'KARTU_KELUARGA' && r.extracted?.namaLengkap);
      const masterName = targetNamaSantri || (kkResult?.extracted?.namaLengkap);

      // Validate name match for each result
      const processedResults: BatchItemResult[] = resultsData.map((r: any) => {
        let isMatch = true;
        if (masterName && r.extracted?.namaLengkap && r.kategori !== 'KARTU_KELUARGA') {
          const matchCheck = checkNameMatch(masterName, r.extracted.namaLengkap);
          isMatch = matchCheck.isMatch;
        }
        return {
          ...r,
          isMatch,
        };
      });

      setBatchResults(processedResults);
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Terjadi kesalahan saat memproses OCR multi-berkas.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
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
    setBatchResults(null);
    setIsProcessing(false);
    setErrorBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Sparkle size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Magic Multi-Scan</span>
                <span className="text-[10px] bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                  AI Klasifikasi Otomatis
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindai banyak berkas (KK, Akta, KTP, SKL) sekaligus dalam 1 kali drop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleResetModal();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {errorBanner && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* STEP 1: Upload Dropzone (if results not yet processed) */}
          {!batchResults && (
            <div className="space-y-4">
              {isNameEmpty && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-3">
                  <LockKey size={22} weight="fill" className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Nama Santri Belum Diisi di Formulir
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-normal mt-0.5">
                      Mohon tutup modal ini dan ketik <strong>Nama Lengkap Calon Santri</strong> pada formulir Langkah 1 terlebih dahulu sebagai patokan verifikasi dokumen.
                    </p>
                  </div>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                }`}
              >
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

                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <UploadSimple size={28} weight="duotone" />
                </div>

                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Pilih atau Tarik Semua Berkas ke Sini
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3 leading-relaxed">
                  Bisa beberapa foto dokumen (KK, Akta, SKL, KTP) atau 1 file PDF yang berisi gabungan berkas. Gemini AI akan otomatis memisahkan dan membaca isinya.
                </p>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold">
                  <Lightning size={14} weight="fill" />
                  <span>Maksimal 10 berkas (Foto atau PDF)</span>
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
                      className="text-slate-400 hover:text-rose-500 text-[11px]"
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
                              <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
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

          {/* STEP 2: Processing State */}
          {isProcessing && (
            <div className="py-10 text-center space-y-3">
              <SpinnerGap size={40} className="animate-spin text-teal-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Gemini Vision AI Sedang Bekerja...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {progressMsg}
              </p>
              <div className="w-48 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-pulse w-full" />
              </div>
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
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="text-[11px] underline font-bold"
                >
                  Pindai Ulang
                </button>
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
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <Check size={10} weight="bold" /> Cocok
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <WarningCircle size={10} weight="bold" /> Nama Berbeda
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              Berkas: {result.fileName}
                            </p>

                            {/* Extracted fields snippet */}
                            {result.extracted && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                                {result.extracted.namaLengkap && (
                                  <span>Nama: <b>{toTitleCase(result.extracted.namaLengkap)}</b></span>
                                )}
                                {result.extracted.nik && (
                                  <span>NIK: {result.extracted.nik}</span>
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
                              <p className="text-[11px] text-rose-600 font-semibold">{result.error}</p>
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
              onClick={handleStartBatchOcr}
              disabled={selectedFiles.length === 0 || isProcessing || isNameEmpty}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                isNameEmpty
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white disabled:opacity-50'
              }`}
              title={isNameEmpty ? 'Isi nama santri pada formulir terlebih dahulu' : undefined}
            >
              {isNameEmpty ? <LockKey size={16} weight="fill" /> : <Sparkle size={16} weight="fill" />}
              <span>{isNameEmpty ? 'Nama Santri Wajib Diisi' : `Mulai Pindai ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}</span>
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
