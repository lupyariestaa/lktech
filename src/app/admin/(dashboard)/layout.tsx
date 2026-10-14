import { AdminServerGuard } from "@/components/admin/admin-server-guard";
import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { ToastProvider } from "@/components/admin/toast";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";

/**
 * Seluruh area dashboard WAJIB dinamis: bergantung pada cookie sesi admin &
 * data Firestore per-request. Tanpa ini, Next.js mencoba MENSTATISKAN `/admin`
 * saat build — menjalankan query Firestore di waktu build (mis. `BusinessHealth`)
 * yang bisa gagal (kuota/network) dan MENJATUHKAN build. Lihat
 * `docs/2026-10-14-perbaikan-build-admin-prerender.md`.
 */
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminServerGuard>
      <AuthGuard>
        <ToastProvider>
          <UnsavedChangesProvider>
            <AdminShell>{children}</AdminShell>
          </UnsavedChangesProvider>
        </ToastProvider>
      </AuthGuard>
    </AdminServerGuard>
  );
}
