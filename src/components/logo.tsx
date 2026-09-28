import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { COMPANY } from "@/lib/content";

/**
 * Logo LKTech dari aset asli (folder public/logo).
 * variant "full" = mark + teks, "mark" = ikon saja.
 */
export function Logo({
  variant = "full",
  href = "#beranda",
  className,
  height = 36,
}: {
  variant?: "full" | "mark";
  href?: string | null;
  className?: string;
  height?: number;
}) {
  const src =
    variant === "mark"
      ? "/logo/lktech-logo.svg"
      : "/logo/lktech-logo-with-text.svg";

  const img = (
    <Image
      src={src}
      alt={`${COMPANY.name} logo`}
      height={height}
      width={variant === "mark" ? height : height * 4}
      priority
      className={cn(
        "transition-transform duration-300",
        href && "group-hover:scale-[1.03]",
      )}
      style={{ height, width: "auto" }}
    />
  );

  if (!href) {
    return <span className={cn("inline-flex items-center", className)}>{img}</span>;
  }

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center", className)}
      aria-label={COMPANY.name}
    >
      {img}
    </Link>
  );
}
