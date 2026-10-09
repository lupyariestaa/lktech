"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { whatsappShareUrl } from "@/lib/article-ui";
import { trackArticleShare } from "@/lib/analytics";


/**
 * Tombol bagikan (B6.4): WhatsApp (tautan wa.me) dan salin tautan.
 * Tanpa skrip pihak ketiga.
 */
export function ArticleShare({ slug, title, url }: { slug: string; title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    trackArticleShare({ slug, method: "copy" });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard tidak tersedia: abaikan */
    }
  };

  const btn =
    "inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors motion-reduce:transition-none hover:border-primary/40 hover:text-primary";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Bagikan artikel">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        Bagikan
      </span>
      <a
        href={whatsappShareUrl(title, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackArticleShare({ slug, method: "whatsapp" })}
        className={btn}
      >
        WhatsApp
      </a>
      <button type="button" onClick={copy} className={btn}>
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? "Tautan disalin" : "Salin tautan"}
      </button>
    </div>
  );
}
