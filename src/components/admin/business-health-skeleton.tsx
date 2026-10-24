/**
 * Skeleton Kesehatan Bisnis (ADM-20).
 *
 * Dipakai sebagai fallback Suspense agar halaman Ringkasan tetap responsif
 * saat query analitik server masih berjalan.
 */
export function BusinessHealthSkeleton() {
  return (
    <section
      className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6"
      aria-busy="true"
      aria-label="Memuat Kesehatan Bisnis"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="h-4 w-52 rounded-full bg-slate-200" />
          <div className="h-3 w-80 max-w-full rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-28 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-slate-100" />
              <div className="h-3 w-10 rounded-full bg-slate-100" />
            </div>
            <div className="mt-4 h-6 w-28 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-24 rounded-full bg-slate-100" />
            <div className="mt-1 h-2.5 w-32 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
