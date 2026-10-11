import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCouponById } from "@/lib/coupons";
import { CouponDetailClient } from "@/components/admin/coupons/coupon-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const coupon = await getCouponById(id).catch(() => null);
  return { title: coupon ? `Kupon ${coupon.code}` : "Kupon" };
}

export default async function AdminCouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coupon = await getCouponById(id);
  if (!coupon) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke daftar kupon
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-secondary">
          Kupon
          <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-sm font-semibold text-slate-500">
            {coupon.code}
          </span>
        </h1>
      </div>
      <CouponDetailClient key={coupon.id} coupon={coupon} />
    </div>
  );
}
