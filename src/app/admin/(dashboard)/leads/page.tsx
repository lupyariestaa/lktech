import { LeadsManager } from "@/components/admin/leads-manager";

export default function AdminLeadsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Lead &amp; Pesan</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola pesan yang masuk dari form kontak website.
        </p>
      </div>
      <LeadsManager />
    </div>
  );
}
