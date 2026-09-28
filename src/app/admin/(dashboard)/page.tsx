import { DashboardOverview } from "@/components/admin/dashboard-overview";

export default function AdminHomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Ringkasan</h1>
        <p className="mt-1 text-sm text-muted">
          Statistik singkat lead &amp; aktivitas terbaru.
        </p>
      </div>
      <DashboardOverview />
    </div>
  );
}
