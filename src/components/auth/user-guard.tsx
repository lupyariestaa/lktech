"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

/**
 * Melindungi halaman yang butuh login user.
 * Bila belum login → redirect ke `/masuk?next=<halaman>` agar kembali ke sini
 * setelah login berhasil.
 */
export function UserGuard({
  children,
  redirectTo = "/masuk",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const target =
        redirectTo === "/masuk" && pathname
          ? `/masuk?next=${encodeURIComponent(pathname)}`
          : redirectTo;
      router.replace(target);
    }
  }, [loading, user, router, redirectTo, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memeriksa sesi...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
