'use client';

import React from 'react';
import { MagnifyingGlass, Users, Sparkle, Funnel } from '@phosphor-icons/react';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGender: 'ALL' | 'IKHWAN' | 'AKHWAT';
  onGenderChange: (g: 'ALL' | 'IKHWAN' | 'AKHWAT') => void;
  selectedJenjang: 'ALL' | 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
  onJenjangChange: (j: 'ALL' | 'SMP' | 'SMA' | 'SMK' | 'ALUMNI') => void;
  counts?: {
    total: number;
    ikhwan: number;
    akhwat: number;
  };
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedGender,
  onGenderChange,
  selectedJenjang,
  onJenjangChange,
  counts = { total: 0, ikhwan: 0, akhwat: 0 }
}: FilterBarProps) {
  const jenjangOptions: Array<{ id: 'ALL' | 'SMP' | 'SMA' | 'SMK' | 'ALUMNI'; label: string }> = [
    { id: 'ALL', label: 'Semua Jenjang' },
    { id: 'SMP', label: 'SMP' },
    { id: 'SMA', label: 'SMA' },
    { id: 'SMK', label: 'SMK' },
    { id: 'ALUMNI', label: 'Alumni' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Top Bar: Gender Segment Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Gender Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => onGenderChange('ALL')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedGender === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Semua ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => onGenderChange('IKHWAN')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedGender === 'IKHWAN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-lime-400" />
            Ikhwan ({counts.ikhwan})
          </button>
          <button
            type="button"
            onClick={() => onGenderChange('AKHWAT')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedGender === 'AKHWAT'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-300" />
            Akhwat ({counts.akhwat})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari santri berdasarkan nama, NIK, atau asal sekolah..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bottom Bar: Jenjang Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
          <Funnel size={14} /> Jenjang:
        </span>
        {jenjangOptions.map(opt => {
          const isActive = selectedJenjang === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onJenjangChange(opt.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
