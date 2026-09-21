'use client';

import React, { useState, useEffect } from 'react';
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
  Buildings,
  CheckCircle,
  LockKey,
  LockKeyOpen,
  Trash,
  XCircle,
  WarningCircle
} from '@phosphor-icons/react';
import { DocumentUploadBox } from './DocumentUploadBox';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik } from '@/lib/ocr/parser';
import { DoodleSpeechBubble, DoodleUnderline } from '@/components/ui/DoodleStickers';
import { useTheme } from '@/components/theme/ThemeProvider';
import { toTitleCase, calculateAge, deriveEducationFromPreviousSchool, checkNameMatch } from '@/lib/utils/formatters';
import { DocumentGuardModal, DocumentMismatchData } from '@/components/modals/DocumentGuardModal';

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
    tahunMasuk: initialData?.tahunMasuk || new Date().getFullYear(),
    jenjang: initialData?.jenjang || 'SMP',
    kelas: initialData?.kelas || '',
    sekolahSekarang: initialData?.sekolahSekarang || '',
    asalSekolahSebelumnya: initialData?.asalSekolahSebelumnya || '',
    namaAyah: initialData?.namaAyah || '',
    namaIbu: initialData?.namaIbu || '',
    statusSosial: initialData?.statusSosial || 'REGULER',
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
  const [ocrAutoFilledNotice, setOcrAutoFilledNotice] = useState<string | null>(null);
  const [mismatchData, setMismatchData] = useState<DocumentMismatchData | null>(null);
  const [uploadBoxKey, setUploadBoxKey] = useState<number>(0);
  const [isNameLockedFromKk, setIsNameLockedFromKk] = useState<boolean>(() => {
    return Boolean(
      initialData?.documents?.some((d: any) => d.kategori === 'KARTU_KELUARGA') && initialData?.namaLengkap
    );
  });
  const [pendingDocuments, setPendingDocuments] = useState<Array<{
    kategori: string;
    fileUrl: string;
    nomorDokumen?: string;
    rawOcrText?: string;
    extractedFields?: any;
    statusVerifikasi?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEED_FIX';
  }>>(() => {
    if (initialData?.documents && Array.isArray(initialData.documents)) {
      return initialData.documents.map((d: any) => ({
        kategori: d.kategori,
        fileUrl: d.fileUrl,
        nomorDokumen: d.nomorDokumen || undefined,
        statusVerifikasi: (d.statusVerifikasi as any) || 'VERIFIED',
      }));
    }
    return [];
  });


  // Ekstraksi data santri ke formulir
  const applyExtractedData = (
    extracted: ExtractedDocumentData,
    fileUrl: string,
    kategori: string,
    baseFormData = formData,
    resetPreviousDocuments = false
  ) => {
    const updated = { ...baseFormData };
    const newOcrTags: Record<string, boolean> = resetPreviousDocuments ? {} : { ...ocrFilledFields };

    if (fileUrl) {
      setPendingDocuments(prev => {
        const base = resetPreviousDocuments ? [] : prev;
        const filtered = base.filter(d => d.kategori !== kategori);
        return [
          ...filtered,
          {
            kategori,
            fileUrl,
            nomorDokumen: extracted.nomorDokumen || (kategori === 'KARTU_KELUARGA' ? extracted.noKk : extracted.nik),
            rawOcrText: extracted.rawText,
            extractedFields: extracted,
            statusVerifikasi: 'VERIFIED',
          },
        ];
      });
    }

    if (extracted.namaLengkap) {
      updated.namaLengkap = toTitleCase(extracted.namaLengkap);
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
    const rawTgl = extracted.tanggalLahir || (extracted.nik ? extractBirthDateFromNik(extracted.nik) : null);
    if (rawTgl) {
      const normalizedTgl = parseIndonesianDate(rawTgl) || rawTgl;
      updated.tanggalLahir = normalizedTgl;
      newOcrTags.tanggalLahir = true;
    }
    if (extracted.jenisKelamin) {
      let g = extracted.jenisKelamin;
      if (/LAKI|IKHWAN|PRIA/i.test(g)) g = 'IKHWAN';
      else if (/PEREMPUAN|AKHWAT|WANITA/i.test(g)) g = 'AKHWAT';
      updated.jenisKelamin = g;
      setGenderTheme(g);
      newOcrTags.jenisKelamin = true;
    }
    if (extracted.namaAyah) {
      updated.namaAyah = extracted.namaAyah.includes('(Alm') ? extracted.namaAyah : toTitleCase(extracted.namaAyah);
      newOcrTags.namaAyah = true;
    }
    if (extracted.namaIbu) {
      updated.namaIbu = extracted.namaIbu.includes('(Almh') ? extracted.namaIbu : toTitleCase(extracted.namaIbu);
      newOcrTags.namaIbu = true;
    }
    if (extracted.statusSosial) {
      updated.statusSosial = extracted.statusSosial;
      newOcrTags.statusSosial = true;
    }
    if (extracted.alamat) {
      updated.alamat = extracted.alamat;
      newOcrTags.alamat = true;
    }
    if (extracted.pekerjaanOrtu) {
      updated.pekerjaanOrtu = extracted.pekerjaanOrtu;
      newOcrTags.pekerjaanOrtu = true;
    }
    let customNoticeText: string | null = null;
    const rawSchoolName = extracted.asalSekolahSebelumnya || '';
    if (rawSchoolName) {
      updated.asalSekolahSebelumnya = rawSchoolName;
      newOcrTags.asalSekolahSebelumnya = true;
    }

    // Deteksi cerdas jenjang & status pendidikan di Baitul Qowwam berdasarkan asal sekolah atau teks berkas
    const targetSchoolToAnalyze = rawSchoolName || extracted.rawText || '';
    const derivedEdu = deriveEducationFromPreviousSchool(targetSchoolToAnalyze);

    if (derivedEdu) {
      updated.jenjang = derivedEdu.jenjang;
      newOcrTags.jenjang = true;

      if (extracted.tahunLulus && derivedEdu.jenjang === 'ALUMNI') {
        updated.kelas = `Lulus ${extracted.tahunLulus}`;
      } else {
        updated.kelas = derivedEdu.kelas;
      }
      newOcrTags.kelas = true;

      if (derivedEdu.sekolahSekarang) {
        updated.sekolahSekarang = derivedEdu.sekolahSekarang;
        newOcrTags.sekolahSekarang = true;
      }

      customNoticeText = derivedEdu.noticeText;
    } else if (extracted.jenjangTerdeteksi) {
      if (extracted.jenjangTerdeteksi === 'ALUMNI') {
        updated.jenjang = 'ALUMNI';
        newOcrTags.jenjang = true;
        updated.kelas = extracted.tahunLulus ? `Lulus ${extracted.tahunLulus}` : 'Lulus 2024';
        newOcrTags.kelas = true;
        customNoticeText = 'Terdeteksi jenjang ALUMNI! Status disesuaikan ke Lulusan SMA/SMK.';
      } else if (extracted.jenjangTerdeteksi === 'SMA') {
        updated.jenjang = 'SMA';
        newOcrTags.jenjang = true;
        updated.kelas = '10';
        newOcrTags.kelas = true;
        customNoticeText = 'Terdeteksi jenjang SMA! Jenjang disetel ke SMA (Kelas 10).';
      } else if (extracted.jenjangTerdeteksi === 'SMP') {
        updated.jenjang = 'SMP';
        newOcrTags.jenjang = true;
        updated.kelas = '7';
        newOcrTags.kelas = true;
        customNoticeText = 'Terdeteksi jenjang SMP! Jenjang disetel ke SMP (Kelas 7).';
      }
    }

    setFormData(updated);
    setOcrFilledFields(newOcrTags);

    const filledCount = Object.keys(newOcrTags).length;
    if (customNoticeText) {
      setOcrAutoFilledNotice(customNoticeText);
    } else if (filledCount > 0) {
      const categoryName = kategori.replace(/_/g, ' ');
      setOcrAutoFilledNotice(`Formulir berhasil terisi otomatis dari berkas ${categoryName}! (${filledCount} kolom terisi dari OCR).`);
    } else {
      setOcrAutoFilledNotice(null);
    }

    setTimeout(() => {
      const section = document.getElementById('santri-form-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // Menerima data pendaftaran baru yang dibuka via DocumentGuardModal di tab baru
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('from_guard') === '1') {
        const stored = sessionStorage.getItem('bq_pending_new_santri');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            sessionStorage.removeItem('bq_pending_new_santri');
            if (parsed.extracted && parsed.fileUrl && parsed.kategori) {
              applyExtractedData(parsed.extracted, parsed.fileUrl, parsed.kategori);
            }
          } catch (err) {
            console.error('Failed to parse pending new santri from guard:', err);
          }
        }
      }
    }
  }, []);

  // Handle OCR extracted data injection dengan Penjaga Identitas Dokumen
  const handleOcrDataExtracted = (
    extracted: ExtractedDocumentData, 
    fileUrl: string, 
    kategori: string,
    fileName?: string
  ) => {
    // 🛡️ PENJAGA IDENTITAS DOKUMEN:
    // Jika berkas BUKAN Kartu Keluarga, dan di formulir sudah ada nama santri (baik manual atau dari KK),
    // maka berkas ini WAJIB cocok dengan nama santri di formulir. Jika tidak cocok -> LANGSUNG TOLAK!
    if (
      kategori !== 'KARTU_KELUARGA' &&
      formData.namaLengkap && 
      formData.namaLengkap.trim() && 
      extracted.namaLengkap && 
      extracted.namaLengkap.trim()
    ) {
      const matchCheck = checkNameMatch(formData.namaLengkap, extracted.namaLengkap);
      if (!matchCheck.isMatch) {
        // Tampilkan Modal Penolakan Berkas (Strict Rejection) & hentikan proses
        setMismatchData({
          extracted,
          fileUrl,
          kategori,
          fileName: fileName || 'Dokumen',
          currentName: formData.namaLengkap,
          detectedName: toTitleCase(extracted.namaLengkap),
          currentAttachedCount: pendingDocuments.length,
        });
        return;
      }
    }

    if (kategori === 'KARTU_KELUARGA' && extracted.namaLengkap) {
      setIsNameLockedFromKk(true);
    }

    applyExtractedData(extracted, fileUrl, kategori);
  };

  // Reset identitas dan berkas Kartu Keluarga jika ingin mengganti santri
  const handleResetKkAndName = () => {
    if (confirm('Hapus nama santri dan berkas Kartu Keluarga untuk mengganti santri?')) {
      setFormData(prev => ({
        ...prev,
        namaLengkap: '',
        namaPanggilan: '',
        nik: '',
        noKk: '',
        tempatLahir: '',
        tanggalLahir: '',
        namaAyah: '',
        namaIbu: '',
        alamat: '',
      }));
      setPendingDocuments(prev => prev.filter(d => d.kategori !== 'KARTU_KELUARGA'));
      setOcrFilledFields(prev => {
        const copy = { ...prev };
        delete copy.namaLengkap;
        delete copy.nik;
        delete copy.noKk;
        delete copy.tempatLahir;
        delete copy.tanggalLahir;
        delete copy.namaAyah;
        delete copy.namaIbu;
        delete copy.alamat;
        return copy;
      });
      setIsNameLockedFromKk(false);
      setUploadBoxKey(prev => prev + 1);
      setOcrAutoFilledNotice('Identitas nama dan berkas Kartu Keluarga telah dihapus. Silakan unggah berkas santri baru.');
    }
  };

  // Guard Action Handlers
  const handleGuardCancel = () => {
    if (mismatchData) {
      setOcrAutoFilledNotice(
        `Dokumen ditolak: Berkas "${mismatchData.fileName || 'baru'}" dibatalkan karena nama santri (${mismatchData.detectedName}) tidak sesuai dengan Kartu Keluarga.`
      );
    }
    setMismatchData(null);
    setUploadBoxKey(prev => prev + 1);
  };

  const handleGuardOpenNewRegistration = (data: DocumentMismatchData) => {
    try {
      sessionStorage.setItem(
        'bq_pending_new_santri',
        JSON.stringify({
          extracted: data.extracted,
          fileUrl: data.fileUrl,
          kategori: data.kategori,
          fileName: data.fileName,
        })
      );
      window.open('/tambah?from_guard=1', '_blank');
      setOcrAutoFilledNotice(
        `Pendaftaran baru untuk "${data.detectedName}" telah dibuka di tab baru. Data formulir "${formData.namaLengkap}" tetap aman.`
      );
    } catch (e) {
      console.error(e);
    }
    setMismatchData(null);
    setUploadBoxKey(prev => prev + 1);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'fotoFormalUrl' | 'fotoProfilUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('kategori', targetField === 'fotoFormalUrl' ? 'FOTO_FORMAL' : 'FOTO_PROFIL');
      uploadData.append('tahunMasuk', String(formData.tahunMasuk || new Date().getFullYear()));
      uploadData.append('jenisKelamin', formData.jenisKelamin);
      if (formData.namaLengkap) uploadData.append('namaSantri', formData.namaLengkap);
      uploadData.append('enhance', 'true');

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

      const santriId = isEditing ? initialData.id : data.data.id;

      // Simpan semua dokumen berkas yang diunggah selama proses form
      if (pendingDocuments.length > 0) {
        for (const doc of pendingDocuments) {
          try {
            await fetch(`/api/santri/${santriId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(doc),
            });
          } catch (docErr) {
            console.error('Failed to attach document to santri:', docErr);
          }
        }
      }

      if (onSuccess) {
        onSuccess(data.data);
      } else {
        router.push(`/santri/${santriId}`);
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

      {/* Step 1: Input Nama Santri (Paling Utama) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-teal-500/30 rounded-3xl p-6 shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
              1
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Identitas Utama Santri (Nama)
                {isNameLockedFromKk ? (
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-teal-200 dark:border-teal-800">
                    <LockKey size={12} weight="fill" /> Terkunci dari Kartu Keluarga
                  </span>
                ) : ocrFilledFields.namaLengkap ? (
                  <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400 bg-lime-100 dark:bg-lime-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" /> Sesuai Kartu Keluarga
                  </span>
                ) : null}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nama santri menjadi kunci acuan pencocokan seluruh dokumen berkas di Pondok Pesantren Baitul Qowwam.
              </p>
            </div>
          </div>
          {formData.namaLengkap && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Sparkle size={14} weight="duotone" className="text-teal-500" />
              <span>Target Acuan: {toTitleCase(formData.namaLengkap)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
          <div className="sm:col-span-6">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Lengkap Calon Santri *</span>
              {isNameLockedFromKk ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  <LockKey size={12} weight="fill" /> Terkunci dari KK
                </span>
              ) : (
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                  (Otomatis Title Case)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                readOnly={isNameLockedFromKk}
                value={formData.namaLengkap}
                onChange={(e) => !isNameLockedFromKk && setFormData({ ...formData, namaLengkap: e.target.value })}
                onBlur={() => {
                  if (formData.namaLengkap && !isNameLockedFromKk) {
                    setFormData((prev) => ({ ...prev, namaLengkap: toTitleCase(prev.namaLengkap) }));
                  }
                }}
                placeholder="Contoh: Muhammad Hanif"
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold transition-all shadow-inner ${
                  isNameLockedFromKk 
                    ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-not-allowed select-all pr-24'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none'
                }`}
              />
              {isNameLockedFromKk && (
                <button
                  type="button"
                  onClick={handleResetKkAndName}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  title="Hapus nama & lepaskan berkas KK"
                >
                  <Trash size={13} weight="bold" />
                  Hapus
                </button>
              )}
            </div>
            {isNameLockedFromKk && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Nama terkunci otomatis sebagai acuan dokumen. Klik tombol <strong>Hapus</strong> jika ingin mengganti santri.
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Tahun Masuk *</span>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
                Format Berkas
              </span>
            </label>
            <input
              type="number"
              min={2000}
              max={2099}
              required
              value={formData.tahunMasuk}
              onChange={(e) => setFormData({ ...formData, tahunMasuk: parseInt(e.target.value, 10) || new Date().getFullYear() })}
              placeholder="2026"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all shadow-inner"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Panggilan
            </label>
            <input
              type="text"
              value={formData.namaPanggilan}
              onChange={(e) => setFormData({ ...formData, namaPanggilan: e.target.value })}
              onBlur={() => {
                if (formData.namaPanggilan) {
                  setFormData((prev) => ({ ...prev, namaPanggilan: toTitleCase(prev.namaPanggilan) }));
                }
              }}
              placeholder="Contoh: Hanif"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Pindai Dokumen Kependudukan (OCR) */}
      {showOcrBox && (
        <div className="bg-gradient-to-br from-teal-500/5 via-emerald-500/5 to-cyan-500/5 border border-teal-200 dark:border-teal-900/60 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-base">
              <Sparkle size={20} weight="duotone" className="text-teal-600 dark:text-teal-400" />
              <span>Opsi 1: Pindai Otomatis dari Dokumen (OCR Presisi Tinggi)</span>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                Rekomendasi
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Opsional</span>
          </div>

          <DocumentUploadBox 
            key={uploadBoxKey}
            onDataExtracted={handleOcrDataExtracted} 
            targetNamaSantri={formData.namaLengkap} 
            tahunMasuk={formData.tahunMasuk}
            jenisKelamin={formData.jenisKelamin}
            uploadedDocuments={pendingDocuments}
            onRemoveDocument={(kategori) => {
              setPendingDocuments(prev => prev.filter(d => d.kategori !== kategori));
            }}
          />
        </div>
      )}


      {/* Auto-filled Notification Banner */}
      {ocrAutoFilledNotice && (
        <div className={`p-4 rounded-3xl flex items-center justify-between shadow-sm animate-pulse-once border-2 ${
          ocrAutoFilledNotice.toLowerCase().includes('ditolak') || ocrAutoFilledNotice.toLowerCase().includes('dibatalkan') || ocrAutoFilledNotice.toLowerCase().includes('dihapus')
            ? 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-100'
            : ocrAutoFilledNotice.toLowerCase().includes('peringatan')
            ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-100'
            : 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl text-white flex items-center justify-center flex-shrink-0 shadow ${
              ocrAutoFilledNotice.toLowerCase().includes('ditolak') || ocrAutoFilledNotice.toLowerCase().includes('dibatalkan') || ocrAutoFilledNotice.toLowerCase().includes('dihapus')
                ? 'bg-rose-500'
                : ocrAutoFilledNotice.toLowerCase().includes('peringatan')
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}>
              {ocrAutoFilledNotice.toLowerCase().includes('ditolak') || ocrAutoFilledNotice.toLowerCase().includes('dibatalkan') || ocrAutoFilledNotice.toLowerCase().includes('dihapus') ? (
                <XCircle size={20} weight="fill" />
              ) : ocrAutoFilledNotice.toLowerCase().includes('peringatan') ? (
                <WarningCircle size={20} weight="fill" />
              ) : (
                <CheckCircle size={20} weight="bold" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                {ocrAutoFilledNotice}
              </h4>
              <p className="text-xs opacity-80">
                Data formulir telah disesuaikan. Anda dapat memeriksa, mengedit, atau menyimpannya langsung.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOcrAutoFilledNotice(null)}
            className="text-xs font-bold hover:underline px-3 py-1 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Dual Photo Section */}
      <div id="santri-form-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm scroll-mt-6">
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

      {/* Bagian Identitas Kependudukan Santri */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
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
              {ocrFilledFields.nik && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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
              {ocrFilledFields.noKk && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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
              {ocrFilledFields.nisn && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Lahir *
              </label>
              {(() => {
                const ageInfo = calculateAge(formData.tanggalLahir);
                return ageInfo ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    <Sparkle size={12} weight="fill" className="text-teal-500" />
                    Usia: {ageInfo.text}
                  </span>
                ) : null;
              })()}
            </div>
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

        {formData.jenjang === 'ALUMNI' && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <GraduationCap size={22} weight="duotone" className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Kategori Santri Purna / Alumni BQ (Lulusan SMA/SMK)</p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                Santri yang telah lulus tingkat SMA/SMK di Baitul Qowwam. Isi kolom di bawah dengan status kelulusan dan aktivitas studi lanjut (kuliah) atau khidmah saat ini.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Jenjang Pendidikan *</span>
              {ocrFilledFields.jenjang && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <select
              value={formData.jenjang}
              onChange={e => setFormData({ ...formData, jenjang: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
              {ocrFilledFields.kelas && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              type="text"
              required
              value={formData.kelas}
              onChange={e => setFormData({ ...formData, kelas: e.target.value })}
              placeholder={formData.jenjang === 'ALUMNI' ? 'Contoh: Lulus 2024 / Angkatan 6' : 'Contoh: 7A, 10 IPA'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{formData.jenjang === 'ALUMNI' ? 'Aktivitas / Kampus / Khidmah Saat Ini *' : 'Sekolah Sekarang *'}</span>
              {ocrFilledFields.sekolahSekarang && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
            </label>
            <input
              type="text"
              required
              value={formData.sekolahSekarang}
              onChange={e => setFormData({ ...formData, sekolahSekarang: e.target.value })}
              placeholder={formData.jenjang === 'ALUMNI' ? 'Contoh: Mahasiswa UNY / Khidmah Asrama BQ / Bekerja' : 'Contoh: SMA Negeri 1 Tempel / SMK / Sekolah Luar'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{formData.jenjang === 'ALUMNI' ? 'Asal SMA / SMK Terakhir (Lulusan)' : 'Asal Sekolah Sebelumnya (SD / MTs / SMP)'}</span>
              {ocrFilledFields.asalSekolahSebelumnya && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                Status Santri (Kondisi Sosial / Keluarga)
              </span>
              {ocrFilledFields.statusSosial && (
                <span className="text-[10px] font-bold text-lime-700 dark:text-lime-400 bg-lime-100 dark:bg-lime-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-lime-300 dark:border-lime-800">
                  <Sparkle size={11} weight="fill" /> Terdeteksi dari KK: Cerai Mati (Yatim)
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
                  <div className="text-[10px] opacity-75 font-normal leading-tight mt-0.5">{st.desc}</div>
                </button>
              ))}
            </div>
            {formData.statusSosial === 'YATIM' && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5 font-medium">
                <CheckCircle size={13} weight="fill" className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Calon santri terdata sebagai <strong>Yatim</strong> (Ayah wafat/Almarhum). Prioritas beasiswa pendidikan & santunan yayasan.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nama Ayah</span>
              {ocrFilledFields.namaAyah && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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
              {ocrFilledFields.namaIbu && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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
              {ocrFilledFields.alamat && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime-300/80 dark:border-lime-700"><Sparkle size={10} weight="fill" /> OCR</span>}
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

      {/* Modal Penjaga Identitas Dokumen */}
      <DocumentGuardModal
        data={mismatchData}
        onCancel={handleGuardCancel}
        onOpenNewRegistration={handleGuardOpenNewRegistration}
      />
    </form>
  );
}
