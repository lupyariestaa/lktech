import { FaqManager } from "@/components/admin/faq-manager";

export default function AdminFaqPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">FAQ</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola pertanyaan umum (FAQ) yang tampil di beranda.
        </p>
      </div>
      <FaqManager />
    </div>
  );
}
