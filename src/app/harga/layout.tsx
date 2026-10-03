import { CustomCursor } from "@/components/custom-cursor";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export default function HargaLayout({
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
