'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  ArrowSquareOut, 
  DownloadSimple, 
  FilePdf, 
  Image as ImageIcon, 
  MagnifyingGlassPlus, 
  MagnifyingGlassMinus, 
  ArrowsCounterClockwise,
  CheckCircle
} from '@phosphor-icons/react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string;
  fileType?: string; // 'pdf' | 'image' | 'application/pdf' | etc.
  badge?: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  title,
  fileUrl,
  fileType,
  badge = 'Terverifikasi'
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Close on Escape key & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    setZoom(1);
    setIsLoading(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, fileUrl]);

  if (!isOpen || !fileUrl) return null;

  // Determine if file is PDF or image
  const isPdf = 
    fileType === 'pdf' || 
    fileType?.includes('pdf') || 
    fileUrl.toLowerCase().includes('.pdf') ||
    fileUrl.startsWith('data:application/pdf');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 z-10">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
              {isPdf ? <FilePdf size={20} weight="fill" /> : <ImageIcon size={20} weight="fill" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
                  {title}
                </h3>
                {badge && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    <CheckCircle size={12} weight="fill" /> {badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {isPdf ? 'Dokumen PDF Scan Resmi' : 'Berkas Gambar HD'}
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Image Zoom Tools */}
            {!isPdf && (
              <div className="hidden sm:flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/50 mr-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  title="Zoom Out"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <MagnifyingGlassMinus size={16} />
                </button>
                <span className="text-[11px] font-mono px-2 text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  title="Zoom In"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <MagnifyingGlassPlus size={16} />
                </button>
                {zoom !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                    className="p-1.5 text-teal-400 hover:text-teal-300 hover:bg-slate-700/60 rounded-lg transition-colors ml-1 cursor-pointer"
                  >
                    <ArrowsCounterClockwise size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Open in New Tab */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka Dokumen di Tab Baru"
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowSquareOut size={16} />
              <span className="hidden md:inline">Tab Baru</span>
            </a>

            {/* Download */}
            <a
              href={fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              title="Download Berkas"
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-teal-200 border border-teal-500/30 flex items-center gap-1.5 transition-colors"
            >
              <DownloadSimple size={16} />
              <span className="hidden md:inline">Unduh</span>
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Tutup (Esc)"
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30 transition-colors cursor-pointer ml-1"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 relative bg-slate-950/80 overflow-auto flex items-center justify-center p-2 sm:p-4">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/50 z-20">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Memuat pratinjau dokumen...</p>
            </div>
          )}

          {isPdf ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full rounded-xl bg-slate-800 border border-slate-800 shadow-inner"
                title={title}
                onLoad={() => setIsLoading(false)}
              />
              <div className="py-2 px-3 text-center text-[11px] text-slate-400">
                Pratinjau PDF interaktif • Jika tampilan terhalang oleh pengaturan keamanan browser HP, Anda dapat{' '}
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-teal-400 underline font-semibold hover:text-teal-300"
                >
                  buka di tab baru
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={fileUrl}
                alt={title}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-200"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
