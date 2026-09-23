import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DoodleProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function DoodleArrow({ className, direction = 'right', ...props }: DoodleProps & { direction?: 'right' | 'left' | 'down' | 'up' }) {
  const rotations = {
    right: 'rotate-0',
    down: 'rotate-90',
    left: 'rotate-180',
    up: '-rotate-90'
  };

  return (
    <svg 
      className={twMerge(`w-8 h-8 text-current transition-transform ${rotations[direction]}`, className)} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10 50 Q 50 30 90 50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="opacity-80" />
      <path d="M70 30 Q 85 45 90 50 Q 75 65 65 80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" />
    </svg>
  );
}

export function DoodleSparkle({ className, size = 24, ...props }: DoodleProps & { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      className={twMerge('text-amber-400', className)}
      {...props}
    >
      <path d="M50 10 Q 50 40 80 50 Q 50 60 50 90 Q 50 60 20 50 Q 50 40 50 10 Z" fill="currentColor" className="opacity-90" />
    </svg>
  );
}

export function DoodleBadgeTape({ className, text, ...props }: DoodleProps & { text: string }) {
  return (
    <svg 
      className={twMerge('w-48 h-12 text-yellow-200 drop-shadow-sm transform -rotate-2', className)} 
      viewBox="0 0 200 50" 
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M5,5 L195,2 L198,48 L2,45 Z" fill="currentColor" opacity="0.9" />
      <path d="M5,5 L0,15 L10,25 L0,35 L5,45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M195,2 L200,12 L190,22 L198,32 L195,48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <text x="100" y="28" textAnchor="middle" dominantBaseline="middle" fill="#713f12" className="font-writing text-xl font-medium">
        {text}
      </text>
    </svg>
  );
}

export function DoodleSpeechBubble({ className, text, ...props }: DoodleProps & { text: string }) {
  return (
    <svg 
      className={twMerge('w-48 h-20 text-emerald-100 dark:text-emerald-900/80 drop-shadow-sm', className)} 
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path 
        d="M20,10 C20,5 25,0 30,0 L170,0 C175,0 180,5 180,10 L180,50 C180,55 175,60 170,60 L40,60 L15,80 L20,55 C15,55 10,50 10,45 L10,20 C10,15 15,10 20,10 Z" 
        fill="currentColor" 
        stroke="currentColor" 
        strokeWidth="2" 
      />
      <text x="95" y="35" textAnchor="middle" dominantBaseline="middle" className="fill-emerald-900 dark:fill-emerald-100 font-writing text-xl">
        {text}
      </text>
    </svg>
  );
}

export function DoodleUnderline({ className, ...props }: DoodleProps) {
  return (
    <svg 
      className={twMerge('absolute -bottom-2 left-0 w-full h-3 text-emerald-400/60', className)} 
      viewBox="0 0 100 20" 
      preserveAspectRatio="none"
      fill="none"
      {...props}
    >
      <path d="M 0 10 Q 25 20 50 10 T 100 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="animate-draw" />
    </svg>
  );
}

/** Coretan bergelombang — dekorasi pojok kartu/ikon. */
export function DoodleCoretan({ className, ...props }: DoodleProps) {
  return (
    <svg className={twMerge('w-6 h-3 text-current', className)} viewBox="0 0 48 16" fill="none" aria-hidden="true" {...props}>
      <path data-doodle-garis="" d="M2 10 C 8 2, 14 14, 20 8 S 32 2, 38 9 S 44 12, 46 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Lingkaran tangan yang tidak tertutup sempurna. */
export function DoodleLingkaran({ className, ...props }: DoodleProps) {
  return (
    <svg className={twMerge('w-5 h-5 text-current', className)} viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <path data-doodle-garis="" d="M20 4 C 31 4, 37 12, 36 21 C 35 31, 26 37, 17 35 C 8 33, 3 25, 5 16 C 7 9, 13 5, 22 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
