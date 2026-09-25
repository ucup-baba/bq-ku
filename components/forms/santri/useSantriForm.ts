'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BatchItemResult } from '../BatchScanModal';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik, extractGenderFromNik } from '@/lib/ocr/parser';
import { useTheme } from '@/components/theme/ThemeProvider';
import { toTitleCase, deriveEducationFromDocument, checkNameMatch, rapikanAlamat, rapikanNamaTempat } from '@/lib/utils/formatters';
import type { DocumentMismatchData } from '@/components/modals/DocumentGuardModal';
import { santriClientSchema, zodFieldErrors } from '@/lib/validation/santri';

export interface OpsiSantriForm {
  initialData?: any;
  isEditing?: boolean;
  onSuccess?: (savedSantri: any) => void;
  /** Dipanggil saat validasi (klien/server) menemukan galat per field — wizard memakai ini untuk pindah langkah. */
  onGalatServer?: (fields: Record<string, string>) => void;
}

/**
 * Seluruh state & logika formulir santri (OCR, batch scan, draf, penjaga identitas,
 * foto, simpan). Dipindah apa adanya dari SantriForm lama; tata letak ada di komponen langkah.
 */
export function useSantriForm({ initialData, isEditing = false, onSuccess, onGalatServer }: OpsiSantriForm) {
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateNik, setDuplicateNik] = useState<{ existingId: string } | null>(null);
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



  // Superpower 5: Local Storage Draft Resiliency
  const DRAFT_STORAGE_KEY = 'bq_draft_santri_form';
  const [hasExistingDraft, setHasExistingDraft] = useState<boolean>(false);
  const [draftInfo, setDraftInfo] = useState<{ name: string; time: string } | null>(null);

  useEffect(() => {
    if (isEditing) return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formData?.namaLengkap) {
          setHasExistingDraft(true);
          setDraftInfo({
            name: parsed.formData.namaLengkap,
            time: parsed.savedAt
              ? new Date(parsed.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : 'sebelumnya',
          });
        }
      }
    } catch {}
  }, [isEditing]);

  // Auto-save draft on form changes
  useEffect(() => {
    if (isEditing || !formData.namaLengkap.trim()) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            formData,
            pendingDocuments,
            savedAt: Date.now(),
          })
        );
      } catch {}
    }, 800);
    return () => clearTimeout(timeout);
  }, [formData, pendingDocuments, isEditing]);

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData(parsed.formData);
          if (parsed.pendingDocuments) setPendingDocuments(parsed.pendingDocuments);
          if (parsed.formData.jenisKelamin) setGenderTheme(parsed.formData.jenisKelamin);
          setOcrAutoFilledNotice(`Draf pendaftaran untuk "${parsed.formData.namaLengkap}" berhasil dipulihkan!`);
        }
      }
    } catch {}
    setHasExistingDraft(false);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setHasExistingDraft(false);
  };


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
      updated.tempatLahir = rapikanNamaTempat(extracted.tempatLahir);
      newOcrTags.tempatLahir = true;
    }
    const rawTgl = extracted.tanggalLahir || (extracted.nik ? extractBirthDateFromNik(extracted.nik) : null);
    if (rawTgl) {
      const normalizedTgl = parseIndonesianDate(rawTgl) || rawTgl;
      updated.tanggalLahir = normalizedTgl;
      newOcrTags.tanggalLahir = true;
    }
    let g: 'IKHWAN' | 'AKHWAT' | undefined = undefined;
    if (extracted.nik) {
      const gNik = extractGenderFromNik(extracted.nik);
      if (gNik) g = gNik;
    }
    if (extracted.jenisKelamin) {
      if (/PEREMPUAN|AKHWAT|WANITA/i.test(extracted.jenisKelamin)) g = 'AKHWAT';
      else if (/LAKI|IKHWAN|PRIA/i.test(extracted.jenisKelamin)) g = 'IKHWAN';
    }
    if (g) {
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
    if (extracted.kontakWali) {
      updated.kontakWali = extracted.kontakWali;
      newOcrTags.kontakWali = true;
    }
    if (extracted.statusSosial) {
      updated.statusSosial = extracted.statusSosial;
      // REGULER itu nilai bawaan, bukan temuan — jangan beri label "terdeteksi".
      if (extracted.statusSosial !== 'REGULER') newOcrTags.statusSosial = true;
    }
    if (extracted.alamat) {
      updated.alamat = rapikanAlamat(extracted.alamat);
      newOcrTags.alamat = true;
    }
    if (extracted.pekerjaanOrtu) {
      updated.pekerjaanOrtu = extracted.pekerjaanOrtu;
      newOcrTags.pekerjaanOrtu = true;
    }
    let customNoticeText: string | null = null;
    const rawSchoolName = extracted.asalSekolahSebelumnya || '';
    if (rawSchoolName) {
      updated.asalSekolahSebelumnya = rapikanNamaTempat(rawSchoolName);
      newOcrTags.asalSekolahSebelumnya = true;
    }

    // Jenjang hanya dari berkas yang memuat info sekolah — KK/KTP tidak menimpanya.
    const derivedEdu = deriveEducationFromDocument({ ...extracted, kategori: extracted.kategori || kategori });
    if (derivedEdu) {
      updated.jenjang = derivedEdu.jenjang;
      updated.kelas = derivedEdu.kelas;
      newOcrTags.jenjang = true;
      newOcrTags.kelas = true;
      customNoticeText = derivedEdu.noticeText;
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

  // Handler untuk hasil Magic Multi-Scan (Batch)
  const handleBatchOcrCompleted = (results: BatchItemResult[]) => {
    if (!results || results.length === 0) return;

    // 1. Urutkan agar Kartu Keluarga diproses terlebih dahulu sebagai jangkar data master
    const sorted = [...results].sort((a, b) => {
      if (a.kategori === 'KARTU_KELUARGA') return -1;
      if (b.kategori === 'KARTU_KELUARGA') return 1;
      return 0;
    });

    let currentForm = { ...formData };
    let masterName = currentForm.namaLengkap;
    const addedDocs: any[] = [];
    const newOcrTags: Record<string, boolean> = { ...ocrFilledFields };

    for (const item of sorted) {
      if (!item.extracted || item.error) continue;
      const ext = item.extracted;

      // Jika belum ada master name dan item adalah KK, tetapkan nama dari KK
      if (item.kategori === 'KARTU_KELUARGA' && ext.namaLengkap) {
        masterName = ext.namaLengkap;
        setIsNameLockedFromKk(true);
      }

      // Validasi kesesuaian nama jika bukan KK dan master name sudah ada
      if (item.kategori !== 'KARTU_KELUARGA' && masterName && ext.namaLengkap) {
        const match = checkNameMatch(masterName, ext.namaLengkap);
        if (!match.isMatch) {
          console.warn(`[Batch] Melewati berkas ${item.fileName} karena nama (${ext.namaLengkap}) tidak cocok dengan (${masterName})`);
          continue;
        }
      }

      // Tambahkan ke pending documents
      if (item.fileUrl) {
        addedDocs.push({
          kategori: item.kategori,
          fileUrl: item.fileUrl,
          nomorDokumen: ext.nomorDokumen || (item.kategori === 'KARTU_KELUARGA' ? ext.noKk : ext.nik),
          rawOcrText: ext.rawText,
          extractedFields: ext,
          statusVerifikasi: 'VERIFIED',
        });
      }

      // Map fields ke formulir
      if (ext.namaLengkap && (!currentForm.namaLengkap || item.kategori === 'KARTU_KELUARGA')) {
        currentForm.namaLengkap = toTitleCase(ext.namaLengkap);
        newOcrTags.namaLengkap = true;
      }
      if (ext.nik && !currentForm.nik) {
        currentForm.nik = ext.nik;
        newOcrTags.nik = true;
      }
      if (ext.noKk && !currentForm.noKk) {
        currentForm.noKk = ext.noKk;
        newOcrTags.noKk = true;
      }
      if (ext.nisn && !currentForm.nisn) {
        currentForm.nisn = ext.nisn;
        newOcrTags.nisn = true;
      }
      if (ext.tempatLahir && !currentForm.tempatLahir) {
        currentForm.tempatLahir = rapikanNamaTempat(ext.tempatLahir);
        newOcrTags.tempatLahir = true;
      }
      const rawTgl = ext.tanggalLahir || (ext.nik ? extractBirthDateFromNik(ext.nik) : null);
      if (rawTgl && !currentForm.tanggalLahir) {
        currentForm.tanggalLahir = parseIndonesianDate(rawTgl) || rawTgl;
        newOcrTags.tanggalLahir = true;
      }
      // Deteksi Jenis Kelamin secara akurat (rumus NIK + teks dokumen)
      let detectedGender: 'IKHWAN' | 'AKHWAT' | undefined = undefined;
      if (ext.nik) {
        const gNik = extractGenderFromNik(ext.nik);
        if (gNik) detectedGender = gNik;
      }
      if (ext.jenisKelamin) {
        if (/PEREMPUAN|AKHWAT|WANITA/i.test(ext.jenisKelamin)) detectedGender = 'AKHWAT';
        else if (/LAKI|IKHWAN|PRIA/i.test(ext.jenisKelamin)) detectedGender = 'IKHWAN';
      }
      if (detectedGender) {
        currentForm.jenisKelamin = detectedGender;
        setGenderTheme(detectedGender);
        newOcrTags.jenisKelamin = true;
      }

      if (ext.namaAyah && !currentForm.namaAyah) {
        currentForm.namaAyah = ext.namaAyah.includes('(Alm') ? ext.namaAyah : toTitleCase(ext.namaAyah);
        newOcrTags.namaAyah = true;
      }
      if (ext.namaIbu && !currentForm.namaIbu) {
        currentForm.namaIbu = ext.namaIbu.includes('(Almh') ? ext.namaIbu : toTitleCase(ext.namaIbu);
        newOcrTags.namaIbu = true;
      }
      if (ext.kontakWali && !currentForm.kontakWali) {
        currentForm.kontakWali = ext.kontakWali;
        newOcrTags.kontakWali = true;
      }
      if (ext.statusSosial && ext.statusSosial !== 'REGULER' && currentForm.statusSosial === 'REGULER') {
        currentForm.statusSosial = ext.statusSosial;
        newOcrTags.statusSosial = true;
      }
      if (ext.alamat && !currentForm.alamat) {
        currentForm.alamat = rapikanAlamat(ext.alamat);
        newOcrTags.alamat = true;
      }
      if (ext.pekerjaanOrtu && !currentForm.pekerjaanOrtu) {
        currentForm.pekerjaanOrtu = ext.pekerjaanOrtu;
        newOcrTags.pekerjaanOrtu = true;
      }

      // Deteksi cerdas jenjang & asal sekolah
      const rawSchool = ext.asalSekolahSebelumnya || '';
      if (rawSchool && !currentForm.asalSekolahSebelumnya) {
        currentForm.asalSekolahSebelumnya = rapikanNamaTempat(rawSchool);
        newOcrTags.asalSekolahSebelumnya = true;
      }
      const derivedEdu = deriveEducationFromDocument({ ...ext, kategori: ext.kategori || item.kategori });
      if (derivedEdu) {
        currentForm.jenjang = derivedEdu.jenjang;
        currentForm.kelas = derivedEdu.kelas;
        newOcrTags.jenjang = true;
        newOcrTags.kelas = true;
      }
    }

    // Merge dokumen ke pending documents
    setPendingDocuments(prev => {
      const existingCategories = addedDocs.map(d => d.kategori);
      const remaining = prev.filter(d => !existingCategories.includes(d.kategori));
      return [...remaining, ...addedDocs];
    });

    setFormData(currentForm);
    setOcrFilledFields(newOcrTags);

    setOcrAutoFilledNotice(
      `✨ Multi-Scan Berhasil! ${addedDocs.length} berkas diproses & data formulir telah terisi otomatis.`
    );

    setTimeout(() => {
      const section = document.getElementById('santri-form-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
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

  const simpan = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setDuplicateNik(null);

    // Validasi awal di client (skema yang sama dengan server)
    const check = santriClientSchema.safeParse(formData);
    if (!check.success) {
      const errs = zodFieldErrors(check.error);
      setFieldErrors(errs);
      onGalatServer?.(errs);
      const first = Object.keys(errs)[0];
      setErrorMessage(`Periksa kembali: ${errs[first]}`);
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      setIsSubmitting(false);
      return;
    }
    setFieldErrors({});

    try {
      const endpoint = isEditing ? `/api/santri/${initialData.id}` : '/api/santri';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.status === 400 && data.fields) {
        setFieldErrors(data.fields);
        onGalatServer?.(data.fields);
        const first = Object.keys(data.fields)[0];
        document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        throw new Error(`Periksa kembali: ${data.fields[first]}`);
      }
      if (res.status === 409 && data.existingId) {
        setDuplicateNik({ existingId: data.existingId });
        throw new Error('NIK ini sudah terdaftar atas nama santri lain.');
      }
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

      // Bersihkan draf lokal saat santri berhasil disimpan
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

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

  return {
    isEditing, initialData,
    formData, setFormData, ocrFilledFields, newSkillInput, setNewSkillInput,
    isSubmitting, errorMessage, fieldErrors, setFieldErrors, duplicateNik,
    ocrAutoFilledNotice, setOcrAutoFilledNotice, mismatchData, uploadBoxKey, isNameLockedFromKk,
    pendingDocuments, setPendingDocuments, hasExistingDraft, draftInfo,
    handleRestoreDraft, handleDiscardDraft, handleOcrDataExtracted, handleBatchOcrCompleted,
    handleResetKkAndName, handleGuardCancel, handleGuardOpenNewRegistration, handlePhotoUpload,
    handleAddSkill, handleRemoveSkill, simpan, setGenderTheme, genderTheme,
  };
}

export type SantriFormCtx = ReturnType<typeof useSantriForm>;
