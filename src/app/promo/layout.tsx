import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export default function PromoLayout({
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
