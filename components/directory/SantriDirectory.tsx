'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { FilterBar } from './FilterBar';
import { SantriCard } from './SantriCard';
import { UserPlus, Sparkle, Tray } from '@phosphor-icons/react';
import { DoodleArrow, DoodleSpeechBubble } from '@/components/ui/DoodleStickers';

export interface SantriDirectoryProps {
  initialSantriList?: any[];
}

export function SantriDirectory({ initialSantriList = [] }: SantriDirectoryProps) {
  const [santriList, setSantriList] = useState<any[]>(initialSantriList);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'IKHWAN' | 'AKHWAT'>('ALL');
  const [selectedJenjang, setSelectedJenjang] = useState<'ALL' | 'SMP' | 'SMA' | 'SMK' | 'ALUMNI'>('ALL');

  // Counts for filter bar
  const counts = useMemo(() => {
    const total = santriList.length;
    const ikhwan = santriList.filter(s => s.jenisKelamin === 'IKHWAN').length;
    const akhwat = santriList.filter(s => s.jenisKelamin === 'AKHWAT').length;
    return { total, ikhwan, akhwat };
  }, [santriList]);

  // Filtered list
  const filteredList = useMemo(() => {
    return santriList.filter(santri => {
      // Gender filter
      if (selectedGender !== 'ALL' && santri.jenisKelamin !== selectedGender) {
        return false;
      }

      // Jenjang filter
      if (selectedJenjang !== 'ALL' && santri.jenjang !== selectedJenjang) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = santri.namaLengkap?.toLowerCase().includes(q);
        const matchPanggilan = santri.namaPanggilan?.toLowerCase().includes(q);
        const matchNik = santri.nik?.includes(q);
        const matchSekolah = santri.sekolahSekarang?.toLowerCase().includes(q) || santri.asalSekolahSebelumnya?.toLowerCase().includes(q);
        if (!matchNama && !matchPanggilan && !matchNik && !matchSekolah) {
          return false;
        }
      }

      return true;
    });
  }, [santriList, selectedGender, selectedJenjang, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Direktori Santri & Berkas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold border border-teal-300/50">
              {filteredList.length} Santri
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arsip lengkap berkas administrasi dan kartu digital CV santri terbagi per kelompok
          </p>
        </div>

        <Link
          href="/tambah"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <UserPlus size={16} weight="bold" />
          Tambah Santri & Berkas Baru
        </Link>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGender={selectedGender}
        onGenderChange={setSelectedGender}
        selectedJenjang={selectedJenjang}
        onJenjangChange={setSelectedJenjang}
        counts={counts}
      />

      {/* Cards Grid */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map(santri => (
            <SantriCard key={santri.id} santri={santri} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Tray size={32} weight="duotone" />
          </div>
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
            Tidak ada santri yang cocok
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            Coba ubah kata kunci pencarian atau sesuaikan filter jenis kelamin dan jenjang pendidikan.
          </p>
          <Link
            href="/tambah"
            className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-colors"
          >
            + Daftarkan Santri Baru Sekarang
          </Link>
        </div>
      )}
    </div>
  );
}
