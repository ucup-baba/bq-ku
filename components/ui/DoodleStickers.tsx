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

export function DoodleBadgeTape({ className, text, ...props }: React.HTMLAttributes<HTMLDivElement> & { text: string }) {
  return (
    <div 
      className={twMerge(
        'inline-flex items-center justify-center px-4 py-1.5 transform -rotate-2',
        'bg-yellow-200/90 text-yellow-900 font-medium text-sm shadow-sm',
        'border border-yellow-300/50 backdrop-blur-sm',
        className
      )}
      style={{
        clipPath: 'polygon(2% 0, 98% 2%, 100% 98%, 0 100%)',
        borderRadius: '2px 8px 3px 6px'
      }}
      {...props}
    >
      <span className="font-writing transform rotate-1">{text}</span>
    </div>
  );
}

export function DoodleSpeechBubble({ className, text, ...props }: React.HTMLAttributes<HTMLDivElement> & { text: string }) {
  return (
    <div className={twMerge('relative inline-block', className)} {...props}>
      <svg className="absolute -bottom-2 -left-2 w-6 h-6 text-emerald-100 dark:text-emerald-900/50" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 0 L0 24 L24 24 Z" />
      </svg>
      <div className="relative bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm border border-emerald-200 dark:border-emerald-800/50 font-writing text-lg">
        {text}
      </div>
    </div>
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
