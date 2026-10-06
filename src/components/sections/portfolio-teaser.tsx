import { ArrowRight } from "lucide-react";
import { getProjects } from "@/lib/projects";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { ProjectCard } from "@/components/project-card";
import { TrackedLink } from "@/components/tracked-link";
import { getPortfolioMediaMap } from "@/lib/portfolio-media";

export async function PortfolioTeaser() {
  const [projects, mediaMap] = await Promise.all([
    getProjects(),
    getPortfolioMediaMap(),
  ]);
  const featured = projects.slice(0, 3);

  return (
    <section id="portofolio" className="relative scroll-mt-24 bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Portofolio"
          title={
            <>
              Proyek yang{" "}
              <span className="text-gradient">kami banggakan</span>
            </>
          }
          description="Sebagian karya yang telah kami kerjakan untuk membantu bisnis dan institusi tumbuh secara digital."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((project, i) => (
            <Reveal key={project.slug} delay={i * 0.08}>
              <ProjectCard
                project={project}
                coverImage={mediaMap[project.slug]?.cover.secureUrl}
                coverAlt={mediaMap[project.slug]?.cover.alt}
              />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <TrackedLink
            href="/portofolio"
            location="portofolio-teaser"
            target="/portofolio"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-secondary backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lg hover:shadow-primary/10"
          >
            Lihat semua proyek
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </TrackedLink>
        </Reveal>
      </div>
    </section>
  );
}
