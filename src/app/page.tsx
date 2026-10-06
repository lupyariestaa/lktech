import { IntroLoader } from "@/components/intro-loader";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Technologies } from "@/components/sections/technologies";
import { Services } from "@/components/sections/services";
import { WhyUs } from "@/components/sections/why-us";
import { Process } from "@/components/sections/process";
import { Stats } from "@/components/sections/stats";
import { PortfolioTeaser } from "@/components/sections/portfolio-teaser";
import { Testimonials } from "@/components/sections/testimonials";
import { Pricing } from "@/components/sections/pricing";
import { Faq } from "@/components/sections/faq";
import { CtaContact } from "@/components/sections/cta-contact";
import { Footer } from "@/components/sections/footer";
import { SocialProof } from "@/components/social-proof";

/**
 * Beranda memuat data dinamis (portofolio & bukti sosial nyata) — segarkan
 * berkala (5 menit) agar tidak basi, sambil tetap ter-prerender statis.
 */
export const revalidate = 300;

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
        <Stats />
        <Testimonials />
        <Pricing />
        <Faq />
        <CtaContact />
      </main>
      <Footer />
    </>
  );
}
