import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
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
    </div>
  );
}
