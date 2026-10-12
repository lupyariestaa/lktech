import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsIntegrasi } from "@/components/admin/settings/settings-integrasi";

export const metadata: Metadata = {
  title: "Integrasi & API",
  robots: { index: false, follow: false },
};

export default function SettingsIntegrasiPage() {
  return (
    <SettingsShell current="integrasi">
      <SettingsIntegrasi />
    </SettingsShell>
  );
}
