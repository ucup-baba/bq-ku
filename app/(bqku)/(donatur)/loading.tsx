export default function DonaturLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="h-16 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800" />

      {/* Row 1: Top Bento Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-12 lg:col-span-5 h-56 rounded-[26px] bg-slate-200/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50" />
        <div className="md:col-span-12 lg:col-span-7 grid sm:grid-cols-3 gap-4">
          <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
          <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
          <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
        </div>
      </div>

      {/* Row 2: Bento Chart & Reminder Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 h-80 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
        <div className="lg:col-span-4 h-80 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800" />
      </div>
    </div>
  );
}
