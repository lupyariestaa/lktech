import { IntroLoader } from "@/components/intro-loader";
import { CustomCursor } from "@/components/custom-cursor";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { TrustedBy } from "@/components/sections/trusted-by";
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

export default function Home() {
  return (
    <>
      <IntroLoader />
      <CustomCursor />
      <Navbar />
      <main id="konten">
        <Hero />
        <TrustedBy />
        <Services />
        <WhyUs />
        <Process />
        <Stats />
        <PortfolioTeaser />
        <Testimonials />
        <Pricing />
        <Faq />
        <CtaContact />
      </main>
      <Footer />
    </>
  );
}
