import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsBackup } from "@/components/admin/settings/settings-backup";

export const metadata: Metadata = {
  title: "Backup & Restore",
  robots: { index: false, follow: false },
};

export default function SettingsBackupPage() {
  return (
    <SettingsShell current="backup">
      <SettingsBackup />
    </SettingsShell>
  );
}
