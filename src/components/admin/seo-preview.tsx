"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  analyzeSnippet,
  buildSnippetPreview,
  formatBreadcrumbUrl,
  summarizeChecklist,
  validateOgImageUrl,
  SNIPPET_GUIDE,
  type SeoChecklistItem,
} from "@/lib/seo-workflow-pure";

/** Host aktif di klien (untuk breadcrumb preview); aman untuk SSR. */
const noopSubscribe = () => () => {};
function useHost(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.host,
    () => "",
  );
}

const STATUS_TONE: Record<string, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  missing: "text-slate-500",
  kosong: "text-slate-500",
  pendek: "text-amber-600",
  panjang: "text-amber-600",
};

function statusIcon(status: string) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  if (status === "warn" || status === "pendek" || status === "panjang")
    return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
  if (status === "missing") return <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />;
  return <Info className="h-4 w-4 text-slate-400" aria-hidden="true" />;
}

/**
 * Preview snippet gaya hasil pencarian + panduan panjang. Judul/deskripsi yang
 * ditampilkan sudah diresolusi (meta bila ada, fallback judul/ringkasan) agar
 * mencerminkan metadata yang benar-benar dipakai.
 */
export function SeoSnippetPreview({
  title,
  description,
  titleFallback,
  descriptionFallback,
  path = "/",
}: {
  title: string;
  description: string;
  titleFallback?: string;
  descriptionFallback?: string;
  path?: string;
}) {
  const host = useHost();
  const preview = buildSnippetPreview({
    title,
    description,
    titleFallback,
    descriptionFallback,
    path,
    origin: host || "lktech.id",
  });
  const checks = analyzeSnippet({ title, description, titleFallback, descriptionFallback });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Preview hasil pencarian
      </p>
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <p className="truncate text-xs text-emerald-700">
          {host ? formatBreadcrumbUrl(host, path) : formatBreadcrumbUrl("lktech.id", path)}
        </p>
        <p className="mt-0.5 text-base leading-snug text-[#1a0dab]">{preview.title || "Judul halaman"}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
          {preview.description || "Deskripsi halaman akan tampil di sini."}
        </p>
      </div>
      <dl className="mt-3 grid gap-1.5 text-[11px]">
        <div className="flex items-start gap-2">
          {statusIcon(checks.title.status)}
          <div>
            <dt className={cn("font-medium", STATUS_TONE[checks.title.status])}>
              Judul · {checks.title.length} karakter
            </dt>
            <dd className="text-muted">{checks.title.guidance}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {statusIcon(checks.description.status)}
          <div>
            <dt className={cn("font-medium", STATUS_TONE[checks.description.status])}>
              Deskripsi · {checks.description.length} karakter
            </dt>
            <dd className="text-muted">{checks.description.guidance}</dd>
          </div>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-muted">
        Rentang ideal {SNIPPET_GUIDE.title.min}–{SNIPPET_GUIDE.title.max} (judul) dan{" "}
        {SNIPPET_GUIDE.description.min}–{SNIPPET_GUIDE.description.max} (deskripsi) bersifat panduan —
        Google tidak menjamin batas pasti.
      </p>
    </div>
  );
}

/** Preview kartu Open Graph (judul, deskripsi, gambar) dengan validasi statis. */
export function OgPreview({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image?: string;
}) {
  const check = validateOgImageUrl(image ?? "");
  const showImage = Boolean((image ?? "").trim()) && check.status !== "invalid";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Preview Open Graph
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-36 w-full bg-slate-100 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-36 w-full place-items-center bg-slate-100 text-xs text-muted">
            {check.status === "invalid" ? check.reason : "Tanpa gambar (memakai default situs)"}
          </div>
        )}
        <div className="p-3">
          <p className="text-sm font-semibold text-secondary">{title.trim() || "Judul halaman"}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
            {description.trim() || "Deskripsi halaman."}
          </p>
        </div>
      </div>
      {check.reason && check.status !== "invalid" && (
        <p className="mt-2 text-[11px] text-amber-600">{check.reason}</p>
      )}
      {check.status === "invalid" && (
        <p className="mt-2 text-[11px] text-rose-600" role="alert">
          {check.reason}
        </p>
      )}
    </div>
  );
}

const CHECKLIST_ICON = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />,
  missing: <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />,
} as const;

/**
 * Checklist pra-terbit. Bersifat bantuan — TIDAK memblokir publish kecuali
 * aturan bisnis eksplisit diaktifkan (lihat `SEO_CHECKLIST_BLOCKING_ENABLED`).
 */
export function SeoChecklistPanel({
  items,
  heading = "Checklist pra-terbit",
}: {
  items: SeoChecklistItem[];
  heading?: string;
}) {
  const summary = summarizeChecklist(items);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-secondary">{heading}</h3>
        <span className="text-[11px] text-muted">
          {summary.ok} siap · {summary.warn} perhatian · {summary.missing} belum ada
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            {CHECKLIST_ICON[item.status]}
            <div className="min-w-0">
              <p className="text-xs font-medium text-secondary">{item.label}</p>
              <p className="break-words text-[11px] text-muted">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted">
        Checklist ini panduan, bukan penghalang. Tidak ada perubahan konten otomatis dan tidak ada
        klaim peringkat.
      </p>
    </section>
  );
}
