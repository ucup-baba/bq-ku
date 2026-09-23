export default function SantriLoading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-60 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Grid Bento Santri Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
        {/* Hero Card Skeleton */}
        <div className="md:col-span-7 h-64 rounded-[26px] bg-slate-200/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50" />
        {/* Perlu Dilengkapi Skeleton */}
        <div className="md:col-span-5 h-64 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
        {/* Carousel / Stats Skeleton */}
        <div className="md:col-span-12 h-36 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
        {/* Santri Terbaru Skeleton */}
        <div className="md:col-span-12 h-72 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
      </div>
    </div>
  );
}
