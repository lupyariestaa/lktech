import type { Metadata } from "next";
import { IntroLoader } from "@/components/intro-loader";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Technologies } from "@/components/sections/technologies";
import { Services } from "@/components/sections/services";
import { WhyUs } from "@/components/sections/why-us";
import { Process } from "@/components/sections/process";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { Stats } from "@/components/sections/stats";
import { PortfolioTeaser } from "@/components/sections/portfolio-teaser";
import { TamanSection } from "@/components/taman/taman-section";
import { TamanSchema } from "@/components/taman/taman-schema";
import { Pricing } from "@/components/sections/pricing";
import { Faq } from "@/components/sections/faq";
import { CtaContact } from "@/components/sections/cta-contact";
import { Footer } from "@/components/sections/footer";
import { SocialProof } from "@/components/social-proof";
import { ScrollDepthTracker } from "@/components/scroll-depth-tracker";

/**
 * Beranda memuat data dinamis (portofolio & bukti sosial nyata) — segarkan
 * berkala (5 menit) agar tidak basi, sambil tetap ter-prerender statis.
 */
export const revalidate = 300;

/**
 * Metadata khusus beranda (FASE H6): judul & deskripsi fokus pada layanan
 * (website, aplikasi mobile, konsultasi) sekaligus produk digital siap pakai.
 * `title.absolute` agar tidak digandakan oleh template `%s | LKTech` di layout.
 */
export const metadata: Metadata = {
  title: {
    absolute: "LKTech — Jasa Pembuatan Website, Aplikasi Mobile & Produk Digital",
  },
  description:
    "LKTech membangun website, aplikasi mobile, dan desain untuk bisnis Anda — plus produk digital siap pakai (template & software) yang bisa dibeli langsung. Harga transparan, hasil berkualitas.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LKTech — Jasa Pembuatan Website, Aplikasi Mobile & Produk Digital",
    description:
      "Jasa pembuatan website, aplikasi mobile, dan konsultasi teknologi — plus produk digital siap pakai. Harga transparan, hasil berkualitas.",
    url: "/",
  },
};

export default function Home() {
  return (
    <>
      <IntroLoader />
      <Navbar />
      <main id="konten">
        <Hero
          socialProof={
            <SocialProof className="flex items-center gap-1.5 text-xs font-semibold text-amber-700" />
          }
        />
        <Technologies />
        <Services />
        <PortfolioTeaser />
        <WhyUs />
        <Process />
        <FeaturedProducts />
        <Stats />
        <TamanSection />
        <TamanSchema />
        <Pricing />
        <Faq />
        <CtaContact />
      </main>
      <Footer />
      {/* Pelacak kedalaman scroll (FASE H7) — tanpa UI, aman tanpa analytics. */}
      <ScrollDepthTracker />
    </>
  );
}
