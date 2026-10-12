import type { Metadata } from "next";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { SettingsSeo } from "@/components/admin/settings/settings-seo";

export const metadata: Metadata = {
  title: "SEO & Situs",
  robots: { index: false, follow: false },
};

export default function SettingsSeoPage() {
  return (
    <SettingsShell current="seo">
      <SettingsSeo />
    </SettingsShell>
  );
}
