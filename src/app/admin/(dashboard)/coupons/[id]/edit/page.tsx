import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCouponById } from "@/lib/coupons";
import { CouponForm } from "@/components/admin/coupons/coupon-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const coupon = await getCouponById(id).catch(() => null);
  return {
    title: coupon ? `Edit Kupon ${coupon.code}` : "Edit Kupon",
    robots: { index: false, follow: false },
  };
}

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coupon = await getCouponById(id);
  if (!coupon) notFound();

  return <CouponForm coupon={coupon} />;
}
