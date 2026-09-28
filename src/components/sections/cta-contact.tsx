"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/content";
import { ButtonAnchor } from "@/components/ui/button";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export function CtaContact() {
  return (
    <section id="kontak" className="relative bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-primary-dark px-8 py-16 shadow-2xl shadow-primary/30 sm:px-14"
        >
          {/* decorative */}
          <div className="grid-lines absolute inset-0 opacity-10" />
          <motion.div
            className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-white/15 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-wide text-white uppercase backdrop-blur">
              Siap Memulai?
            </span>
            <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl lg:text-[2.6rem] lg:leading-tight">
              Wujudkan ide digital Anda bersama {COMPANY.name}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/85">
              Konsultasi gratis, tanpa komitmen. Ceritakan kebutuhan Anda dan
              kami bantu temukan solusi terbaiknya.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonAnchor
                href="/kontak"
                variant="white"
                size="lg"
                className="group"
              >
                <MessageCircle className="h-5 w-5" />
                Mulai Konsultasi
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonAnchor>
              <ButtonAnchor
                href={waLink(WA_MESSAGES.general)}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                className="border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                <MessageCircle className="h-5 w-5" />
                Chat via WhatsApp
              </ButtonAnchor>
            </div>

            <p className="mt-6 text-sm text-white/70">
              Atau kirim email ke{" "}
              <a
                href={`mailto:${COMPANY.email}`}
                className="font-medium text-white underline underline-offset-2"
              >
                {COMPANY.email}
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
