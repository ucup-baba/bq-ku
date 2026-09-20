import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Scan, 
  FileText, 
  CheckCircle, 
  Sparkle, 
  UserPlus, 
  ArrowRight,
  BookOpen,
  GraduationCap
} from '@phosphor-icons/react/dist/ssr';
import { listSantri } from '@/lib/db/santri-repo';
import { SantriCard } from '@/components/directory/SantriCard';
import { DoodleSparkle, DoodleSpeechBubble, DoodleUnderline } from '@/components/ui/DoodleStickers';

export const revalidate = 0;

export default async function HomePage() {
  const santriList = await listSantri();

  const total = santriList.length;
  const ikhwanCount = santriList.filter(s => s.jenisKelamin === 'IKHWAN').length;
  const akhwatCount = santriList.filter(s => s.jenisKelamin === 'AKHWAT').length;
  const recentSantri = santriList.slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-900 text-white p-8 sm:p-12 shadow-xl border border-teal-700/40">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl space-y-4">
          <div className="inline-block">
            <DoodleSpeechBubble text="Assalamu'alaikum!" className="text-lime-300" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Sistem Administrasi Berkas & Digital CV Santri
          </h1>

          <p className="text-sm sm:text-base text-teal-100/80 leading-relaxed">
            Kelola pengumpulan berkas wajib (KK, Akta, KTP, SKL) dan pendukung (KIP/KRM) dengan Smart OCR auto-fill, serta tampilkan biodata santri bergaya CV Poster Kreatif.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/tambah"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-slate-950 font-extrabold text-sm shadow-lg transition-all"
            >
              <Scan size={18} weight="bold" />
              Upload Berkas & OCR Scan
            </Link>
            <Link
              href="/santri"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-sm border border-white/20 transition-all"
            >
              <Users size={18} />
              Buka Direktori Santri
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Users size={22} weight="duotone" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{total}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Santri Terdaftar</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UserPlus size={22} weight="duotone" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{ikhwanCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Kelompok Ikhwan (Putra)</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center">
            <Sparkle size={22} weight="duotone" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-500 dark:text-rose-400">{akhwatCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Kelompok Akhwat (Putri)</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-lime-50 dark:bg-lime-950/60 text-lime-700 dark:text-lime-400 flex items-center justify-center">
            <FileText size={22} weight="duotone" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Smart OCR</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Ekstraksi Otomatis Siap</div>
          </div>
        </div>
      </div>

      {/* Recent Santri Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Santri Terbaru
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pratinjau kartu santri yang baru didaftarkan ke sistem
            </p>
          </div>
          <Link
            href="/santri"
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>

        {recentSantri.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentSantri.map(santri => (
              <SantriCard key={santri.id} santri={santri} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Belum ada santri terdaftar. Mulai dengan mengunggah berkas pertama!
            </p>
            <Link
              href="/tambah"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700"
            >
              <UserPlus size={16} /> Daftarkan Santri Baru
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
