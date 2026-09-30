import type { Metadata } from "next";
import { CustomCursor } from "@/components/custom-cursor";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Produk",
  description:
    "Produk digital LKTech: template, software, aplikasi, dan e-book siap pakai dengan harga transparan.",
};

export default function ProdukLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main id="konten">{children}</main>
      <Footer />
    </>
  );
}
