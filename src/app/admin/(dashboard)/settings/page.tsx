import { SettingsManager } from "@/components/admin/settings-manager";
import { EmailNotifier } from "@/components/admin/email-notifier";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola informasi kontak &amp; media sosial yang tampil di website.
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <SettingsManager />
        <EmailNotifier />
      </div>
    </div>
  );
}
