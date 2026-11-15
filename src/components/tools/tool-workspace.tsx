"use client";

import { useEffect, useRef, type ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { ToolShell } from "@/components/tools/tool-shell";
import { ToolCard } from "@/components/tools/tool-card";
import { ColorPickerTool } from "@/components/tools/color-picker-tool";
import { ImageToWebpTool } from "@/components/tools/image-to-webp-tool";
import { ImageToPdfTool } from "@/components/tools/image-to-pdf-tool";
import { PdfToImageTool } from "@/components/tools/pdf-to-image-tool";
import { TextFormatterTool } from "@/components/tools/text-formatter-tool";
import { recordToolOpen } from "@/lib/tools-storage";
import {
  trackToolsToolOpen,
  trackToolsToolOpenIntent,
} from "@/lib/analytics";
import {
  getRelatedTools,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";

/**
 * Peta slug → komponen body tool. Tool yang ditandai `tersedia` di registry
 * tetapi belum punya body akan menampilkan pesan jujur "belum tersedia",
 * bukan UI palsu.
 */
const TOOL_BODIES: Record<string, ComponentType> = {
  "color-picker": ColorPickerTool,
  "image-to-webp": ImageToWebpTool,
  "image-to-pdf": ImageToPdfTool,
  "pdf-to-image": PdfToImageTool,
  "text-formatter": TextFormatterTool,
};

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const Body = TOOL_BODIES[tool.slug];
  const related = getRelatedTools(tool);
  const recordedRef = useRef<string | null>(null);

  // Catat recent + usage SEKALI per kunjungan workspace (termasuk deep link &
  // refresh). Ref guard mencegah hitung ganda dari StrictMode di development.
  useEffect(() => {
    if (recordedRef.current === tool.slug) return;
    recordedRef.current = tool.slug;
    recordToolOpen(tool.slug);
    trackToolsToolOpen({ tool: tool.slug });
  }, [tool.slug]);

  return (
    <ToolShell tool={tool}>
      {Body ? (
        <Body />
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-surface py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <Wrench className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-semibold text-secondary">
            Tool ini belum tersedia di rilis ini
          </p>
          <p className="mt-1 text-sm text-muted">
            Kami sedang menyiapkannya. Silakan coba tool lain di katalog.
          </p>
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-100 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-secondary">
                Jelajahi tool lain
              </h2>
              <p className="mt-1 text-sm text-muted">
                Tool lain di ruang yang sama — tanpa perlu kembali ke katalog.
              </p>
            </div>
            <Link
              href="/tools/ruang"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              Semua tool
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.slug} className="h-full">
              <ToolCard
                tool={item}
                onOpen={(picked) =>
                  trackToolsToolOpenIntent({
                    tool: picked.slug,
                    source: "related",
                  })
                }
              />
              </li>
            ))}
          </ul>
        </section>
      )}
    </ToolShell>
  );
}
