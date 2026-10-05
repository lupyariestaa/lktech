"use client";

import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Form opt-in newsletter (Tema 2.2). Dapat dipakai di footer & halaman promo.
 */
export function NewsletterForm({
  source = "website",
  className,
  compact = false,
}: {
  source?: string;
  className?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error ?? "Gagal mendaftar." });
      } else {
        setMsg({ ok: true, text: data?.message ?? "Berhasil berlangganan." });
        setEmail("");
      }
    } catch {
      setMsg({ ok: false, text: "Gagal mendaftar. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)}>
      <div className={cn("flex gap-2", compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row")}>
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Anda"
            aria-label="Email untuk newsletter"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>
        {/* Honeypot (tersembunyi dari user, terisi bila bot) */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Berlangganan
        </button>
      </div>
      {msg && (
        <p
          className={cn(
            "mt-2 text-xs",
            msg.ok ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}
