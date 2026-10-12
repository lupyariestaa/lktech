import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsNotifikasi } from "@/components/admin/settings/settings-notifikasi";

export const metadata: Metadata = {
  title: "Notifikasi",
  robots: { index: false, follow: false },
};

export default function SettingsNotifikasiPage() {
  return (
    <SettingsShell current="notifikasi">
      <SettingsNotifikasi />
    </SettingsShell>
  );
}
