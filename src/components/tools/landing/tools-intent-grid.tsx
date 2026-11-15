"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { SectionHeading } from "@/components/section-heading";
import { ToolIcon } from "@/components/tools/tool-icon";
import { trackToolsIntent } from "@/lib/analytics";
import {
  resolveToolIntents,
  toolWorkspaceHref,
} from "@/lib/tools-registry-pure";

const INTENTS = resolveToolIntents();

/**
 * Pintu masuk berbasis kebutuhan. Setiap tile menautkan langsung ke workspace
 * tool; pengguna yang belum masuk diarahkan ke `/masuk?next=<tool>` agar
 * setelah login mendarat di tool yang dipilih.
 */
export function ToolsIntentGrid() {
  const { user } = useAuth();
  const loggedIn = Boolean(user);

  return (
    <section id="mulai" className="relative scroll-mt-24 bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Mulai dari kebutuhan"
          title={
            <>
              Mulai dari kebutuhan,{" "}
              <span className="text-gradient">bukan nama tool.</span>
            </>
          }
          description="Pilih masalah yang ingin dibereskan; kami arahkan ke tool yang tepat. Bila belum masuk, Anda akan dibawa ke halaman masuk lebih dulu."
        />

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {INTENTS.map(({ intent, tool }) => {
            const target = toolWorkspaceHref(tool.slug);
            const href = loggedIn
              ? target
              : `/masuk?next=${encodeURIComponent(target)}`;

            return (
              <li key={intent.id} className="h-full">
                <Link
                  href={href}
                  onClick={() =>
                    trackToolsIntent({ tool: tool.slug, intent: intent.id })
                  }
                  className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                    <ToolIcon name={tool.icon} className="h-5 w-5" />
                  </span>

                  <p className="mt-4 text-sm leading-snug font-bold text-secondary">
                    {intent.problem}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                    {intent.action}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </p>

                  <span className="mt-auto flex items-center justify-between gap-2 pt-5">
                    <span className="text-[11px] font-medium text-slate-400">
                      {tool.name}
                    </span>
                    {!loggedIn && (
                      <Lock
                        className="h-3 w-3 text-slate-300"
                        aria-label="Perlu masuk"
                      />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
