import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsKontak } from "@/components/admin/settings/settings-kontak";

export const metadata: Metadata = {
  title: "Kontak & Identitas",
  robots: { index: false, follow: false },
};

export default function SettingsKontakPage() {
  return (
    <SettingsShell current="kontak">
      <SettingsKontak />
    </SettingsShell>
  );
}
