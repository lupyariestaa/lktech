import type { Metadata } from "next";
import { CustomCursor } from "@/components/custom-cursor";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Keranjang Belanja",
  description: "Tinjau produk di keranjang Anda lalu checkout via WhatsApp.",
  robots: { index: false, follow: true },
};

export default function KeranjangPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main id="konten">
        <CartView />
      </main>
      <Footer />
    </>
  );
}
