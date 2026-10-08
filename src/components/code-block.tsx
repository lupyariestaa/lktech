"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Blok kode dengan tombol salin. Satu-satunya bagian client di renderer markdown. */
export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard tidak tersedia: abaikan */
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-slate-400">{lang || "kode"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Salin kode"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
