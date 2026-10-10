import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrderById } from "@/lib/orders";
import { shortOrderCode } from "@/lib/format";
import { OrderPageClient } from "@/components/admin/orders/order-page-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Pesanan ${shortOrderCode(id)}` };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary print:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke daftar pesanan
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-secondary">
          Pesanan
          <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-sm font-semibold text-slate-500">
            {shortOrderCode(order.id)}
          </span>
        </h1>
      </div>
      <OrderPageClient key={order.id} order={order} />
    </div>
  );
}