import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "white";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5",
  outline:
    "border border-slate-200 bg-white/70 text-secondary backdrop-blur hover:border-primary/40 hover:text-primary hover:-translate-y-0.5",
  ghost: "text-secondary hover:bg-primary-50 hover:text-primary",
  white:
    "bg-white text-primary shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:shadow-xl",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base max-sm:h-12 max-sm:px-6",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonAnchor({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & ComponentProps<"a">) {
  return (
    <a
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
