"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Icon } from "@/components/icon";

/** Bentuk minimal layanan yang dibutuhkan kartu (kompatibel berbagai sumber). */
type ServiceLike = {
  slug: string;
  title: string;
  tagline?: string;
  description: string;
  icon: string;
  accent: string;
};

/**
 * Kartu layanan dengan efek 3D tilt saat hover.
 * Seluruh kartu menautkan ke halaman detail layanan (`/layanan/[slug]`).
 */
export function ServiceCard({ service }: { service: ServiceLike }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), {
    stiffness: 200,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
    stiffness: 200,
    damping: 20,
  });

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <Link
      ref={ref}
      href={`/layanan/${service.slug}`}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="group block h-full [perspective:1000px]"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="glass-strong relative flex h-full flex-col overflow-hidden rounded-3xl p-6 shadow-sm transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-primary/10"
      >
        <div
          className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${service.accent} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30`}
        />

        <div
          className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${service.accent} text-white shadow-lg shadow-primary/20`}
          style={{ transform: "translateZ(40px)" }}
        >
          <Icon name={service.icon} className="h-6 w-6" />
        </div>

        <h3 className="relative mt-5 text-lg font-bold text-secondary">
          {service.title}
        </h3>
        {service.tagline && (
          <p className="relative mt-1.5 text-sm font-medium text-primary">
            {service.tagline}
          </p>
        )}
        <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted">
          {service.description}
        </p>

        <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Lihat detail
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </motion.div>
    </Link>
  );
}
