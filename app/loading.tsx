export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#0B5FA5]/20 border-t-[#0B5FA5] rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Memuat halaman…</p>
      </div>
    </div>
  );
}
