import { SettingsManager } from "@/components/admin/settings-manager";

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola informasi kontak &amp; media sosial yang tampil di website.
        </p>
      </div>
      <SettingsManager />
    </div>
  );
}
