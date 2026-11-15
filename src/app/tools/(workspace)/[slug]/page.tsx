import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import {
  availableToolSlugs,
  getToolBySlug,
} from "@/lib/tools-registry-pure";

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
    return { title: "Tool tidak ditemukan" };
  }
  return {
    title: `${tool.name} — LKTech Tools`,
    description: tool.summary,
  };
}

/**
 * Workspace tool (`/tools/[slug]`). Guard, `noindex`, sidebar, dan topbar
 * mobile berasal dari layout `(workspace)`; halaman ini hanya merender body
 * tool di area utama.
 */
export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || tool.status !== "tersedia") notFound();

  return <ToolWorkspace tool={tool} />;
}
