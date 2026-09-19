'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={twMerge(
        'relative inline-flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
        'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700',
        'shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
        className
      )}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        <Sun
          weight="duotone"
          className={clsx(
            'absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300',
            theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          )}
        />
        <Moon
          weight="duotone"
          className={clsx(
            'absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300',
            theme === 'light' ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          )}
        />
      </div>
    </button>
  );
}
