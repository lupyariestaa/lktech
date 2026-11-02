"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Eraser, Sparkles, Wand2 } from "lucide-react";
import { Button, ButtonAnchor } from "@/components/ui/button";
import {
  TEXT_LIMITS,
  countTextStats,
  transformText,
  type JsonIndent,
  type TextMode,
  type TextStats,
} from "@/lib/tools/text-pure";
import { cn } from "@/lib/utils";

const MODE_OPTIONS: Array<{ value: TextMode; label: string }> = [
  { value: "json-pretty", label: "Rapikan JSON" },
  { value: "json-minify", label: "Minify JSON" },
  { value: "text-clean", label: "Rapikan teks" },
];

const INDENT_OPTIONS: Array<{ value: JsonIndent; label: string }> = [
  { value: 2, label: "2 spasi" },
  { value: 4, label: "4 spasi" },
  { value: "tab", label: "Tab" },
];

const SAMPLE = `{"nama":"LKTech","layanan":["website","mobile"],"aktif":true,"harga":{"mulai":1500000,"mata":"IDR"}}`;

/** Tool Formatter Teks — rapikan JSON/teks. Diproses di browser. */
export function TextFormatterTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<TextMode>("json-pretty");
  const [indent, setIndent] = useState<JsonIndent>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputStats, setOutputStats] = useState<TextStats | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const inputStats = useMemo(() => countTextStats(input), [input]);
  const isJson = mode !== "text-clean";
  const overLimit = inputStats.chars > TEXT_LIMITS.maxInputChars;

  const clearResult = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setOutput(null);
    setOutputStats(null);
    setResultUrl(null);
    setError(null);
  };

  const onProcess = () => {
    const result = transformText(input, {
      mode,
      indent,
      sortKeys: isJson && sortKeys,
    });
    clearResult();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOutput(result.output);
    setOutputStats(result.stats);
    const blob = new Blob([result.output], {
      type: isJson ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    setResultUrl(url);
  };

  const onCopy = async () => {
    if (output === null) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard tidak tersedia — hasil tetap bisa disalin manual */
    }
  };

  const downloadName = isJson ? "hasil.json" : "hasil.txt";

  return (
    <div className="flex flex-col gap-6">
      {/* Kontrol */}
      <div className="flex flex-wrap items-end gap-4 rounded-3xl border border-slate-200 bg-white p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-secondary">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TextMode)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label
          className={cn(
            "flex flex-col gap-1.5",
            (mode !== "json-pretty") && "opacity-50",
          )}
        >
          <span className="text-xs font-semibold text-secondary">Indentasi</span>
          <select
            value={String(indent)}
            disabled={mode !== "json-pretty"}
            onChange={(e) =>
              setIndent(e.target.value === "tab" ? "tab" : (Number(e.target.value) as 2 | 4))
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:cursor-not-allowed"
          >
            {INDENT_OPTIONS.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label
          className={cn(
            "flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-secondary",
            !isJson && "opacity-50",
          )}
        >
          <input
            type="checkbox"
            checked={sortKeys}
            disabled={!isJson}
            onChange={(e) => setSortKeys(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Urutkan kunci
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onProcess} disabled={overLimit || input.trim() === ""}>
            <Wand2 className="h-4 w-4" />
            Proses
          </Button>
          <Button variant="outline" onClick={() => setInput(SAMPLE)}>
            <Sparkles className="h-4 w-4" />
            Muat contoh
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setInput("");
              clearResult();
            }}
          >
            <Eraser className="h-4 w-4" />
            Bersihkan
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {error
          ? `Gagal: ${error}`
          : output !== null
            ? "Hasil siap disalin atau diunduh."
            : ""}
      </p>

      {error && (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Masukan */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label htmlFor="tf-input" className="text-sm font-semibold text-secondary">
              Masukan
            </label>
            <span className="text-xs text-muted">
              {inputStats.chars.toLocaleString("id-ID")} kar ·{" "}
              {inputStats.lines.toLocaleString("id-ID")} baris
            </span>
          </div>
          <textarea
            id="tf-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Tempel JSON atau teks di sini…"
            aria-invalid={overLimit || undefined}
            className={cn(
              "min-h-[320px] w-full resize-y rounded-2xl border bg-white p-4 font-mono text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:outline-none",
              overLimit ? "border-rose-300" : "border-slate-200",
            )}
          />
          {overLimit && (
            <p className="text-xs text-rose-600">
              Teks melebihi batas {TEXT_LIMITS.maxInputChars.toLocaleString("id-ID")}{" "}
              karakter. Pangkas dulu sebelum memproses.
            </p>
          )}
        </div>

        {/* Hasil */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-secondary">Hasil</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopy}
                disabled={output === null}
                aria-label="Salin hasil"
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </span>
          </div>
          <textarea
            readOnly
            value={output ?? ""}
            aria-label="Hasil"
            placeholder="Hasil akan muncul di sini…"
            className="min-h-[320px] w-full resize-y rounded-2xl border border-slate-200 bg-surface p-4 font-mono text-sm text-secondary placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {outputStats
                ? `${outputStats.chars.toLocaleString("id-ID")} kar · ${outputStats.words.toLocaleString("id-ID")} kata · ${outputStats.lines.toLocaleString("id-ID")} baris · ${outputStats.bytes.toLocaleString("id-ID")} byte`
                : "Belum ada hasil."}
            </span>
            {resultUrl && (
              <ButtonAnchor href={resultUrl} download={downloadName} variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Unduh
              </ButtonAnchor>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}