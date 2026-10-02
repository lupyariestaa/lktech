import type { Metadata } from "next";
import { OrdersManager } from "@/components/admin/orders-manager";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Pesanan",
};

export default function AdminOrdersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Pesanan</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola pesanan yang masuk dari checkout produk.
        </p>
      </div>
      <OrdersManager />
    </div>
  );
}
