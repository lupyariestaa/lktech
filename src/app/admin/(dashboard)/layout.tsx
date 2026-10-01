import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { ToastProvider } from "@/components/admin/toast";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <ToastProvider>
        <UnsavedChangesProvider>
          <AdminShell>{children}</AdminShell>
        </UnsavedChangesProvider>
      </ToastProvider>
    </AuthGuard>
  );
}
