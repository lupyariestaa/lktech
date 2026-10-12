import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsKeamanan } from "@/components/admin/settings/settings-keamanan";

export const metadata: Metadata = {
  title: "Keamanan & Akses",
  robots: { index: false, follow: false },
};

export default function SettingsKeamananPage() {
  return (
    <SettingsShell current="keamanan">
      <SettingsKeamanan />
    </SettingsShell>
  );
}
