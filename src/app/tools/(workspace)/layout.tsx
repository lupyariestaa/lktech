import type { Metadata } from "next";
import { UserGuard } from "@/components/auth/user-guard";
import { ToolsShell } from "@/components/tools/dashboard/tools-shell";

/**
 * Layout bersama area workspace LKTech Tools (route group `(workspace)`).
 *
 * URL tetap `/tools/ruang` dan `/tools/[slug]`; route group hanya berbagi
 * guard, metadata `noindex`, dan shell dashboard (sidebar + topbar mobile).
 * Landing `/tools` dan panduan publik `/tools/panduan` berada di luar group
 * ini sehingga tetap publik & indexable.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ToolsWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <UserGuard>
      <ToolsShell>{children}</ToolsShell>
    </UserGuard>
  );
}
