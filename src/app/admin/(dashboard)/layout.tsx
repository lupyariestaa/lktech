import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { ToastProvider } from "@/components/admin/toast";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </AuthGuard>
  );
}
