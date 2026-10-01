"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceFaq } from "@/lib/content";

/**
 * Accordion FAQ reusable (dipakai di halaman detail layanan & beranda).
 */
export function FaqAccordion({ items }: { items: ServiceFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  // Prefix unik per-instance agar ID tidak bentrok bila accordion dirender
  // lebih dari sekali pada satu halaman.
  const uid = useId();

  return (
    <div className="flex flex-col gap-3">
      {items.map((faq, i) => {
        const isOpen = open === i;
        const panelId = `${uid}-faq-panel-${i}`;
        const buttonId = `${uid}-faq-button-${i}`;
        return (
          <div
            key={faq.question}
            className={cn(
              "overflow-hidden rounded-2xl border transition-colors duration-300",
              isOpen
                ? "border-primary/25 bg-primary-50/40"
                : "border-slate-200 bg-white hover:border-primary/20",
            )}
          >
            <button
              id={buttonId}
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span
                className={cn(
                  "text-sm font-semibold sm:text-base",
                  isOpen ? "text-primary" : "text-secondary",
                )}
              >
                {faq.question}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-300",
                  isOpen
                    ? "rotate-45 bg-primary text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                <Plus className="h-4 w-4" />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
