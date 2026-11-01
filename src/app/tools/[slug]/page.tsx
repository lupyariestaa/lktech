import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { UserGuard } from "@/components/auth/user-guard";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { availableToolSlugs, getToolBySlug } from "@/lib/tools-registry-pure";

/** Hanya tool `tersedia` yang punya halaman workspace. */
export function generateStaticParams() {
  return availableToolSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || tool.status !== "tersedia") {
    return { title: "Tool tidak ditemukan", robots: { index: false, follow: false } };
  }
  return {
    title: `${tool.name} — LKTech Tools`,
    description: tool.summary,
    robots: { index: false, follow: false },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || tool.status !== "tersedia") notFound();

  return (
    <>
      <Navbar />
      <main id="konten">
        <UserGuard>
          <ToolWorkspace tool={tool} />
        </UserGuard>
      </main>
      <Footer />
    </>
  );
}
