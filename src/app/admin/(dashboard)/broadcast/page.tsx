import { BroadcastManager } from "@/components/admin/broadcast-manager";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter & Broadcast",
  robots: { index: false, follow: false },
};

export default function AdminBroadcastPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">
          Newsletter &amp; Broadcast
        </h1>
        <p className="mt-1 text-sm text-muted">
          Kelola pelanggan newsletter &amp; kirim promo/konten ke segmen terpilih.
        </p>
      </div>
      <BroadcastManager />
    </div>
  );
}
