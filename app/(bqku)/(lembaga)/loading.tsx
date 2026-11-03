export default function LembagaLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-40 rounded-[26px] bg-slate-200/90 dark:bg-slate-800/80" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60" />
        <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}
