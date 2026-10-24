/**
 * Loading boundary dashboard admin.
 *
 * Berada di dalam layout `(dashboard)` sehingga sidebar/header tetap tampil;
 * pengguna tidak dilempar ke loading publik saat berpindah menu.
 */
export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Memuat dashboard">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-40 rounded-full bg-slate-200" />
        <div className="h-4 w-72 max-w-full rounded-full bg-slate-100" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="h-4 w-52 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-80 max-w-full rounded-full bg-slate-100" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="h-9 w-9 rounded-xl bg-slate-100" />
                <div className="mt-4 h-5 w-24 rounded-full bg-slate-200" />
                <div className="mt-2 h-3 w-32 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-4">
                <div className="h-4 w-20 rounded-full bg-slate-100" />
                <div className="mt-3 h-7 w-16 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
