import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsLanjutan } from "@/components/admin/settings/settings-lanjutan";

export const metadata: Metadata = {
  title: "Lanjutan & Sistem",
  robots: { index: false, follow: false },
};

export default function SettingsLanjutanPage() {
  return (
    <SettingsShell current="lanjutan">
      <SettingsLanjutan />
    </SettingsShell>
  );
}
