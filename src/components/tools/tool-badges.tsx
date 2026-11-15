import { Clock, Laptop, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolStatus } from "@/lib/tools-registry-pure";

/** Badge status ketersediaan tool. */
export function ToolStatusBadge({
  status,
  className,
}: {
  status: ToolStatus;
  className?: string;
}) {
  if (status === "tersedia") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Tersedia
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700",
        className,
      )}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      Segera
    </span>
  );
}

/** Badge “Lokal” — pengingat bahwa proses tidak meninggalkan browser. */
export function ToolLocalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
        className,
      )}
    >
      <Laptop className="h-3 w-3" aria-hidden="true" />
      Lokal
    </span>
  );
}

/** Badge editorial “Baru” untuk tool yang baru ditambahkan. */
export function ToolNewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      Baru
    </span>
  );
}
