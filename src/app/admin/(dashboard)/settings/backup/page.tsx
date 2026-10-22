import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsBackup } from "@/components/admin/settings/settings-backup";
import { isOwnerEmail } from "@/lib/admins";
import { ADMIN_SESSION_COOKIE } from "@/lib/session-constants";
import { verifyAdminSessionCookie } from "@/lib/session";

export const metadata: Metadata = {
  title: "Backup & Restore",
  robots: { index: false, follow: false },
};

export default async function SettingsBackupPage() {
  // Defense-in-depth: layout sudah memverifikasi admin; halaman ini khusus
  // OWNER. ADMIN yang mengetik URL langsung diarahkan ke ringkasan.
  const store = await cookies();
  const session = await verifyAdminSessionCookie(
    store.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!session || !isOwnerEmail(session.email)) {
    redirect("/admin/settings");
  }

  return (
    <SettingsShell current="backup">
      <SettingsBackup />
    </SettingsShell>
  );
}
