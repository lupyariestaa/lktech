"use client";

import { useId, useState } from "react";
import { Check, ClipboardCopy, Paintbrush, WandSparkles } from "lucide-react";
import { trackToolsDemo } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAMPLE_JSON =
  '{"nama":"LKTech Tools","lokal":true,"tools":["webp","pdf"]}';
const MAX_DEMO_CHARS = 20_000;

type DemoMode = "warna" | "teks";

/** Nama event analytics memakai bahasa Inggris singkat. */
function analyticsDemo(mode: DemoMode): "color" | "text" {
  return mode === "warna" ? "color" : "text";
}

/**
 * Demo mini landing `/tools` — hanya warna & teks, tanpa akun.
 *
 * Tidak ada unggahan berkas, unduhan, atau penyimpanan. Semua proses memakai API
 * browser standar. Batas 20.000 karakter menjaga input tetap ringan.
 */
export function ToolsDemo() {
  const uid = useId();
  const [mode, setMode] = useState<DemoMode>("warna");
  const [color, setColor] = useState("#2563EB");
  const [text, setText] = useState(SAMPLE_JSON);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const announce = (message: string) => {
    setStatus(message);
  };

  const copy = async (value: string, demo: DemoMode) => {
    try {
      await navigator.clipboard.writeText(value);
      announce("Disalin ke clipboard.");
      trackToolsDemo({ demo: analyticsDemo(demo), action: "copy" });
    } catch {
      announce("Clipboard tidak tersedia. Salin nilainya secara manual.");
    }
  };

  const formatJson = () => {
    setError(null);
    if (text.length > MAX_DEMO_CHARS) {
      setError(
        `Demo dibatasi ${MAX_DEMO_CHARS.toLocaleString("id-ID")} karakter.`,
      );
      return;
    }
    try {
      const parsed: unknown = JSON.parse(text);
      const pretty = JSON.stringify(parsed, null, 2);
      setOutput(pretty);
      announce("JSON berhasil dirapikan.");
      trackToolsDemo({ demo: "text", action: "format" });
    } catch {
      setOutput("");
      setError("JSON belum valid. Periksa tanda kurung, koma, dan tanda kutip.");
    }
  };

  const switchMode = (next: DemoMode) => {
    setMode(next);
    setStatus("");
    trackToolsDemo({ demo: analyticsDemo(next), action: "open" });
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-secondary">
            Demo mini: warna &amp; teks
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Demo kecil ini berjalan di browser Anda. Workspace lengkap ada di
            ruang tools.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          Tanpa akun
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Pilih demo"
        className="mt-5 flex gap-1 rounded-full border border-slate-200 bg-surface p-1"
      >
        {(
          [
            { id: "warna", label: "Warna", icon: Paintbrush },
            { id: "teks", label: "Teks", icon: WandSparkles },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${tab.id}`}
            aria-selected={mode === tab.id}
            aria-controls={`${uid}-panel-${tab.id}`}
            onClick={() => switchMode(tab.id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
              mode === tab.id
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-secondary",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "warna" ? (
        <div
          role="tabpanel"
          id={`${uid}-panel-warna`}
          aria-labelledby={`${uid}-tab-warna`}
          className="mt-5 flex flex-1 flex-col"
        >
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-surface p-4">
            <label className="flex items-center gap-3">
              <span className="sr-only">Pilih warna</span>
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setStatus("");
                }}
                className="h-14 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
            </label>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                Nilai HEX
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-secondary">
                {color.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => copy(color.toUpperCase(), "warna")}
            >
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              Salin HEX
            </Button>
            <span
              className="inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              Pratinjau
            </span>
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`${uid}-panel-teks`}
          aria-labelledby={`${uid}-tab-teks`}
          className="mt-5 flex flex-1 flex-col"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-secondary">
              Tempel JSON
            </span>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
                setOutput("");
                setStatus("");
              }}
              maxLength={MAX_DEMO_CHARS}
              rows={4}
              spellCheck={false}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-surface p-3 font-mono text-xs leading-relaxed text-secondary focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </label>

          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted">
            <span>
              {text.length.toLocaleString("id-ID")} /{" "}
              {MAX_DEMO_CHARS.toLocaleString("id-ID")} karakter
            </span>
            <span>Diproses di browser</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={formatJson}>
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
              Rapikan JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!output}
              onClick={() => copy(output, "teks")}
            >
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              Salin hasil
            </Button>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          {output && (
            <pre className="mt-3 max-h-44 overflow-auto rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 font-mono text-xs leading-relaxed text-secondary">
              {output}
            </pre>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-[11px] leading-relaxed text-muted">
          Demo mini — tanpa unggah berkas, tanpa unduhan.
        </p>
        <p
          role="status"
          aria-live="polite"
          className="inline-flex min-h-5 items-center gap-1 text-[11px] font-semibold text-emerald-700"
        >
          {status && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          {status}
        </p>
      </div>
    </div>
  );
}
