import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/coupons/coupon-form";

export const metadata: Metadata = {
  title: "Buat Kupon",
  robots: { index: false, follow: false },
};

export default function NewCouponPage() {
  return <CouponForm coupon={null} />;
}
