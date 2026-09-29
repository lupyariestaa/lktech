import { PricingManager } from "@/components/admin/pricing-manager";

export default function AdminPricingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Harga</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola paket harga yang tampil di beranda.
        </p>
      </div>
      <PricingManager />
    </div>
  );
}
