import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
