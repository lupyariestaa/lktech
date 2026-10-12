import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsOverview } from "@/components/admin/settings/settings-overview";

export const metadata: Metadata = {
  title: "Pengaturan",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <SettingsShell current="">
      <SettingsOverview />
    </SettingsShell>
  );
}
