'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Certificate,
  IdentificationCard,
  GraduationCap,
  Sparkle,
  CheckCircle,
  WarningCircle,
  UploadSimple,
  Camera,
  SpinnerGap,
  ArrowLeft,
  ShieldCheck,
  User,
  Clock,
  Buildings,
  Eye,
  Check
} from '@phosphor-icons/react';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';

interface DocumentInfo {
  kategori: string;
  statusVerifikasi: string;
  fileUrl: string;
}

interface SantriPublicInfo {
  id: string;
  namaLengkap: string;
  namaPanggilan?: string | null;
  jenisKelamin: 'IKHWAN' | 'AKHWAT';
  jenjang: string;
  kelas: string;
  sekolahSekarang: string;
  fotoProfilUrl?: string | null;
  documents: DocumentInfo[];
}

const REQUIRED_DOCS = [
  { id: 'KARTU_KELUARGA', label: 'Kartu Keluarga (KK)', icon: FileText, desc: 'Foto atau scan KK asli yang jelas' },
  { id: 'AKTA_KELAHIRAN', label: 'Akta Kelahiran', icon: Certificate, desc: 'Akta kelahiran calon santri' },
  { id: 'KTP_ORTU', label: 'KTP Orang Tua', icon: IdentificationCard, desc: 'Foto KTP Ayah atau Ibu yang jelas' },
  { id: 'SKL_IJAZAH', label: 'SKL / Ijazah Terakhir', icon: GraduationCap, desc: 'Surat Keterangan Lulus atau Ijazah' },
];

const OPTIONAL_DOCS = [
  { id: 'KIP_PIP', label: 'KIP / PIP (Bansos)', icon: Sparkle, desc: 'Kartu Indonesia Pintar (jika memiliki)' },
  { id: 'SKTM', label: 'Surat Ket. Tidak Mampu', icon: FileText, desc: 'Dari Kelurahan/Desa (jika ada)' },
  { id: 'SERTIFIKAT_PRESTASI', label: 'Sertifikat Prestasi/Tahfidz', icon: Certificate, desc: 'Piagam lomba atau syahadah tahfidz' },
];

export default function UploadMandiriPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [santri, setSantri] = useState<SantriPublicInfo | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    fileUrl: string;
  }>({
    isOpen: false,
    title: '',
    fileUrl: '',
  });

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/upload-mandiri?token=${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Tautan tidak valid atau kedaluwarsa');
      }
      setSantri(data.santri);
      setExpiresAt(data.expiresAt);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data tautan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleFileSelect = async (kategori: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCategory(kategori);
    setUploadSuccessMsg(null);
    setUploadErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('kategori', kategori);
      formData.append('file', file);

      const res = await fetch('/api/upload-mandiri', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengunggah berkas');
      }

      setUploadSuccessMsg(`Berkas ${kategori.replace(/_/g, ' ')} berhasil diunggah dan terverifikasi!`);
      // Refresh data
      await fetchData();
    } catch (err: any) {
      setUploadErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah berkas');
    } finally {
      setUploadingCategory(null);
      // Reset input value
      if (fileInputRefs.current[kategori]) {
        fileInputRefs.current[kategori]!.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <SpinnerGap size={40} className="animate-spin text-teal-600 mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Memuat formulir unggah mandiri...
        </p>
      </div>
    );
  }

  if (error || !santri) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 text-center shadow-lg">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600">
            <WarningCircle size={32} weight="duotone" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Tautan Tidak Dapat Dibuka
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            {error || 'Tautan ini mungkin sudah kedaluwarsa atau tidak valid. Silakan hubungi pengurus atau panitia Baitul Qowwam untuk meminta tautan baru.'}
          </p>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-medium">
            Pesantren Baitul Qowwam Yogyakarta
          </div>
        </div>
      </div>
    );
  }

  const isIkhwan = santri.jenisKelamin === 'IKHWAN';
  const uploadedCategories = (santri.documents || []).map(d => d.kategori);
  const completedRequired = REQUIRED_DOCS.filter(d => uploadedCategories.includes(d.id)).length;
  const isComplete = completedRequired === REQUIRED_DOCS.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <span className="text-[11px] font-extrabold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            PONDOK PESANTREN BAITUL QOWWAM
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            Unggah Berkas Santri Mandiri
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Layanan pengumpulan berkas digital resmi untuk wali santri
          </p>
        </div>

        {/* Santri Profile Card */}
        <div className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm ${
          isIkhwan ? 'border-emerald-200 dark:border-emerald-950/60' : 'border-rose-200 dark:border-rose-950/60'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${
              isIkhwan ? 'border-lime-400' : 'border-rose-300'
            }`}>
              {santri.fotoProfilUrl ? (
                <img src={santri.fotoProfilUrl} alt={santri.namaLengkap} className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-slate-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isIkhwan ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                }`}>
                  {santri.jenisKelamin}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {santri.jenjang} • Kelas {santri.kelas}
                </span>
              </div>

              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {santri.namaLengkap}
              </h2>
              {santri.namaPanggilan && (
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">
                  Panggilan: "{santri.namaPanggilan}"
                </p>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1 truncate">
                <Buildings size={12} className="text-teal-600 shrink-0" />
                <span className="truncate">{santri.sekolahSekarang}</span>
              </p>
            </div>
          </div>

          {/* Progress Bar Berkas Wajib */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              <span>Kelengkapan Berkas Wajib:</span>
              <span className={`font-bold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-700 dark:text-teal-400'}`}>
                {completedRequired}/{REQUIRED_DOCS.length} Berkas
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-teal-500'}`}
                style={{ width: `${(completedRequired / REQUIRED_DOCS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {uploadSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {uploadErrorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
            <span>{uploadErrorMsg}</span>
          </div>
        )}

        {/* Section: Berkas Wajib */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-teal-600" weight="duotone" />
              <span>Berkas Wajib Administrasi</span>
            </h3>
            <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
              Harus Lengkap
            </span>
          </div>

          <div className="space-y-2.5">
            {REQUIRED_DOCS.map((doc) => {
              const Icon = doc.icon;
              const existingDoc = (santri.documents || []).find(d => d.kategori === doc.id);
              const isDone = !!existingDoc;
              const isUploadingThis = uploadingCategory === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {isDone ? (
                          <CheckCircle size={22} weight="fill" className="text-emerald-600" />
                        ) : (
                          <Icon size={20} weight="duotone" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.label}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {isDone ? 'Sudah terunggah & terverifikasi' : doc.desc}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        className="hidden"
                        ref={el => { fileInputRefs.current[doc.id] = el; }}
                        onChange={(e) => handleFileSelect(doc.id, e)}
                        disabled={isUploadingThis}
                      />

                      {isDone ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewModal({
                                isOpen: true,
                                title: doc.label,
                                fileUrl: existingDoc.fileUrl,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                          >
                            <Eye size={13} weight="bold" />
                            <span>Lihat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[doc.id]?.click()}
                            disabled={isUploadingThis}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Ganti berkas"
                          >
                            <span>Ganti</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[doc.id]?.click()}
                          disabled={isUploadingThis}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isUploadingThis ? (
                            <>
                              <SpinnerGap size={14} className="animate-spin" />
                              <span>Memindai...</span>
                            </>
                          ) : (
                            <>
                              <Camera size={14} weight="bold" />
                              <span>Unggah</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Berkas Tambahan / Bansos */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkle size={18} className="text-amber-500" weight="duotone" />
              <span>Berkas Tambahan (Opsional)</span>
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">
              Jika Ada
            </span>
          </div>

          <div className="space-y-2.5">
            {OPTIONAL_DOCS.map((doc) => {
              const Icon = doc.icon;
              const existingDoc = (santri.documents || []).find(d => d.kategori === doc.id);
              const isDone = !!existingDoc;
              const isUploadingThis = uploadingCategory === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-400">
                        {isDone ? <CheckCircle size={18} weight="fill" className="text-emerald-600" /> : <Icon size={16} weight="duotone" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{doc.label}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{doc.desc}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        className="hidden"
                        ref={el => { fileInputRefs.current[doc.id] = el; }}
                        onChange={(e) => handleFileSelect(doc.id, e)}
                        disabled={isUploadingThis}
                      />

                      {isDone ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewModal({
                              isOpen: true,
                              title: doc.label,
                              fileUrl: existingDoc.fileUrl,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <Eye size={12} />
                          <span>Lihat</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[doc.id]?.click()}
                          disabled={isUploadingThis}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                        >
                          {isUploadingThis ? <SpinnerGap size={12} className="animate-spin" /> : <UploadSimple size={12} />}
                          <span>Unggah</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security / Help Note */}
        <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/60 text-xs text-teal-800 dark:text-teal-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck size={16} weight="duotone" />
            <span>Keamanan Data Terjamin</span>
          </div>
          <p className="text-[11px] text-teal-700/80 dark:text-teal-300/80 leading-relaxed">
            Berkas yang Anda unggah disimpan aman di server terenkripsi Baitul Qowwam dan otomatis diverifikasi dengan teknologi OCR cerdas. Tautan ini akan kedaluwarsa secara otomatis demi keamanan privasi.
          </p>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        fileUrl={previewModal.fileUrl}
      />
    </div>
  );
}
