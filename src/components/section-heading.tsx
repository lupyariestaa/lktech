import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light = false,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  light?: boolean;
  /**
   * Elemen opsional di sisi kanan (mis. tautan "Lihat semua →"). Hanya
   * ditampilkan saat `align="left"` — memberi ritme pada halaman beranda
   * (F2: variasi heading) alih-alih semua section berjudul tengah.
   */
  action?: ReactNode;
}) {
  const inner = (
    <>
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide uppercase",
            light ? "bg-white/15 text-white" : "bg-primary-50 text-primary",
          )}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "mt-4 text-3xl font-bold sm:text-4xl lg:text-[2.75rem] lg:leading-tight",
          light ? "text-white" : "text-secondary",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            light ? "text-white/80" : "text-muted",
          )}
        >
          {description}
        </p>
      )}
    </>
  );

  if (align === "center") {
    return <div className="mx-auto max-w-2xl text-center">{inner}</div>;
  }

  // Rata kiri: heading + (opsional) aksi di kanan, sejajar dasar pada layar
  // lebar dan menumpuk pada layar sempit.
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">{inner}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
