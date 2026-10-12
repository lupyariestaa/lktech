import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsPembayaran } from "@/components/admin/settings/settings-pembayaran";

export const metadata: Metadata = {
  title: "Pembayaran & Mayar",
  robots: { index: false, follow: false },
};

export default function SettingsPembayaranPage() {
  return (
    <SettingsShell current="pembayaran">
      <SettingsPembayaran />
    </SettingsShell>
  );
}
