import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Keranjang Belanja",
  description: "Tinjau produk di keranjang Anda lalu checkout via WhatsApp.",
  robots: { index: false, follow: false },
};

export default function KeranjangPage() {
  return (
    <>
      <Navbar />
      <main id="konten">
        <CartView />
      </main>
      <Footer />
    </>
  );
}
