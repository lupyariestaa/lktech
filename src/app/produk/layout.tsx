import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

// S1/R8: metadata TIDAK lagi ditetapkan di layout (sebelumnya hardcoded
// `title: "Produk"` yang duplikat & bersaing dengan `produk/page.tsx` dan
// `produk/[slug]/page.tsx`). Biarkan masing-masing halaman menetapkan metadata
// (termasuk canonical) sendiri.
export default function ProdukLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      <main id="konten">{children}</main>
      <Footer />
    </>
  );
}
