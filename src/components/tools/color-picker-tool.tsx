"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Pipette } from "lucide-react";
import {
  contrastTextColor,
  formatHsl,
  formatRgb,
  parseHex,
  rgbToHex,
  rgbToHsl,
  rgbaToHex,
  roundAlpha,
  type Rgb,
} from "@/lib/tools/color-pure";
import { cn } from "@/lib/utils";

/** Warna awal: primary LKTech. */
const DEFAULT_RGB: Rgb = { r: 79, g: 70, b: 229 };

const PRESETS: Array<{ name: string; rgb: Rgb }> = [
  { name: "Primary", rgb: { r: 79, g: 70, b: 229 } },
  { name: "Merah", rgb: { r: 239, g: 68, b: 68 } },
  { name: "Amber", rgb: { r: 245, g: 158, b: 11 } },
  { name: "Hijau", rgb: { r: 16, g: 185, b: 129 } },
  { name: "Biru", rgb: { r: 59, g: 130, b: 246 } },
  { name: "Ungu", rgb: { r: 139, g: 92, b: 246 } },
  { name: "Slate", rgb: { r: 15, g: 23, b: 42 } },
  { name: "Putih", rgb: { r: 255, g: 255, b: 255 } },
];

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

/** Tool Color Picker — pilih warna & salin nilai HEX/RGB/HSL. Proses lokal. */
export function ColorPickerTool() {
  const [rgb, setRgb] = useState<Rgb>(DEFAULT_RGB);
  const [alpha, setAlpha] = useState(1);
  // Saat pengguna mengetik HEX, kami menampilkan draf apa adanya agar tidak
  // "menelan" karakter; `null` berarti tampilkan nilai kanonik dari state.
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const hex = rgbToHex(rgb);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const textColor = contrastTextColor(rgb);
  const hexInvalid = hexDraft !== null && parseHex(hexDraft) === null;

  const values: Array<{ id: string; label: string; value: string }> = [
    { id: "hex", label: "HEX", value: rgbaToHex(rgb, alpha) },
    { id: "rgb", label: "RGB", value: formatRgb(rgb, alpha) },
    { id: "hsl", label: "HSL", value: formatHsl(hsl, alpha) },
    { id: "css", label: "CSS (bg)", value: `background: ${rgbaToHex(rgb, alpha)};` },
  ];

  const onHexInput = (value: string) => {
    setHexDraft(value);
    const parsed = parseHex(value);
    if (!parsed) return;
    setRgb(parsed.rgb);
    const digits = value.trim().replace(/^#/, "").length;
    if (digits === 4 || digits === 8) setAlpha(roundAlpha(parsed.alpha));
  };

  const onCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard tidak tersedia — nilai tetap tampil untuk disalin manual */
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Pratinjau */}
      <div>
        <div
          className="relative h-48 overflow-hidden rounded-3xl border border-slate-200 sm:h-56"
          style={CHECKERBOARD}
        >
          <div
            className="absolute inset-0 transition-colors"
            style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` }}
          />
          <div
            className="relative flex h-full flex-col justify-end p-5"
            style={{ color: textColor }}
          >
            <p className="text-lg font-bold">Contoh Teks</p>
            <p className="text-xs opacity-80">
              Kontras terhadap latar ini: {textColor === "#FFFFFF" ? "teks terang" : "teks gelap"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setRgb(p.rgb);
                setHexDraft(null);
              }}
              aria-label={`Pilih warna ${p.name}`}
              title={p.name}
              className={cn(
                "h-8 w-8 rounded-full border transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                rgbToHex(p.rgb) === hex ? "border-primary ring-2 ring-primary/30" : "border-slate-200",
              )}
              style={{ backgroundColor: rgbToHex(p.rgb) }}
            />
          ))}
        </div>
      </div>

      {/* Kontrol & nilai */}
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <input
              type="color"
              value={hex}
              onChange={(e) => {
                const parsed = parseHex(e.target.value);
                if (parsed) {
                  setRgb(parsed.rgb);
                  setHexDraft(null);
                }
              }}
              aria-label="Pilih warna visual"
              className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
              <Pipette className="h-3.5 w-3.5 text-primary" />
              Pemilih warna
            </span>
          </label>

          <label className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Kode HEX
            </span>
            <input
              type="text"
              value={hexDraft ?? hex}
              onChange={(e) => onHexInput(e.target.value)}
              onBlur={() => setHexDraft(null)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Kode warna HEX"
              aria-invalid={hexInvalid}
              className={cn(
                "w-full bg-transparent font-mono text-sm font-semibold text-secondary uppercase focus:outline-none",
                hexInvalid && "text-rose-500",
              )}
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <span className="flex items-center justify-between text-xs font-semibold text-secondary">
            Kepekatan (alfa)
            <span className="font-mono text-muted">{roundAlpha(alpha)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha}
            onChange={(e) => setAlpha(roundAlpha(Number(e.target.value)))}
            aria-label="Atur kepekatan warna"
            className="h-2 w-full cursor-pointer accent-primary"
          />
        </label>

        <ul className="flex flex-col gap-2">
          {values.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  {v.label}
                </p>
                <p className="truncate font-mono text-sm text-secondary">{v.value}</p>
              </div>
              <button
                type="button"
                onClick={() => onCopy(v.id, v.value)}
                aria-label={`Salin nilai ${v.label}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                {copied === v.id ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
