"use client";

import type { ComponentType } from "react";
import { Wrench } from "lucide-react";
import { ToolShell } from "@/components/tools/tool-shell";
import { ColorPickerTool } from "@/components/tools/color-picker-tool";
import { ImageToWebpTool } from "@/components/tools/image-to-webp-tool";
import { ImageToPdfTool } from "@/components/tools/image-to-pdf-tool";
import { PdfToImageTool } from "@/components/tools/pdf-to-image-tool";
import { TextFormatterTool } from "@/components/tools/text-formatter-tool";
import type { ToolDefinition } from "@/lib/tools-registry-pure";

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
    </ToolShell>
  );
}
