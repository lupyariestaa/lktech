"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  ClipboardCheck,
  Contrast,
  Copy,
  Droplets,
  ImagePlus,
  Palette,
  Pipette,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ImageDropzone } from "@/components/tools/image-dropzone";
import { Button } from "@/components/ui/button";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_LIMITS,
  formatBytes,
  validateImageFile,
} from "@/lib/tools/image-tool-pure";
import { decodeImageFile } from "@/lib/tools/image-client";
import {
  buildColorScale,
  contrastTextColor,
  extractPaletteFromRgba,
  formatHsl,
  formatRgb,
  getContrastReport,
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
const DEFAULT_GRADIENT_END: Rgb = { r: 14, g: 165, b: 233 };
const MAX_ANALYSIS_SIDE = 720;

const PRESETS: Array<{ name: string; rgb: Rgb }> = [
  { name: "Primary", rgb: DEFAULT_RGB },
  { name: "Merah", rgb: { r: 239, g: 68, b: 68 } },
  { name: "Amber", rgb: { r: 245, g: 158, b: 11 } },
  { name: "Hijau", rgb: { r: 16, g: 185, b: 129 } },
  { name: "Biru", rgb: { r: 59, g: 130, b: 246 } },
  { name: "Ungu", rgb: { r: 139, g: 92, b: 246 } },
  { name: "Slate", rgb: { r: 15, g: 23, b: 42 } },
  { name: "Putih", rgb: { r: 255, g: 255, b: 255 } },
];

const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

type StudioTab = "warna" | "gambar" | "kontras" | "gradient";
type PaletteColor = { id: string; rgb: Rgb; alpha: number };

const STUDIO_TABS: Array<{ id: StudioTab; label: string; icon: typeof Pipette }> = [
  { id: "warna", label: "Pilih warna", icon: Pipette },
  { id: "gambar", label: "Dari gambar", icon: ImagePlus },
  { id: "kontras", label: "Kontras", icon: Contrast },
  { id: "gradient", label: "Gradient", icon: Droplets },
];

function colorId(rgb: Rgb, alpha: number) {
  return `${rgbaToHex(rgb, alpha)}-${cryptoSafeId()}`;
}

function cryptoSafeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function scaledSize(width: number, height: number) {
  const longest = Math.max(width, height);
  if (longest <= MAX_ANALYSIS_SIDE) return { width, height };
  const scale = MAX_ANALYSIS_SIDE / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function colorCss(rgb: Rgb, alpha = 1) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${roundAlpha(alpha)})`;
}

/**
 * Color Studio: pilih/ekspor warna, ambil warna dari gambar lokal, ekstrak
 * palet representatif, periksa kontras, dan buat gradient CSS. Seluruh proses
 * gambar dilakukan di canvas lokal; tool tidak memiliki jalur upload.
 */
export function ColorPickerTool() {
  const [tab, setTab] = useState<StudioTab>("warna");
  const [rgb, setRgb] = useState<Rgb>(DEFAULT_RGB);
  const [alpha, setAlpha] = useState(1);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [imageInfo, setImageInfo] = useState<{ name: string; size: number; width: number; height: number } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [samplePoint, setSamplePoint] = useState<{ x: number; y: number } | null>(null);
  const [contrastRgb, setContrastRgb] = useState<Rgb>({ r: 255, g: 255, b: 255 });
  const [gradientEnd, setGradientEnd] = useState<Rgb>(DEFAULT_GRADIENT_END);
  const [gradientAngle, setGradientAngle] = useState(135);

  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Bersihkan bitmap canvas ketika meninggalkan workspace agar piksel besar
  // tidak menetap pada navigasi client-side.
  useEffect(
    () => () => {
      const canvas = imageCanvasRef.current;
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
    },
    [],
  );

  const hex = rgbToHex(rgb);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const textColor = contrastTextColor(rgb);
  const hexInvalid = hexDraft !== null && parseHex(hexDraft) === null;
  const contrast = useMemo(() => getContrastReport(rgb, contrastRgb), [rgb, contrastRgb]);
  const scale = useMemo(() => buildColorScale(rgb), [rgb]);
  const gradientCss = `linear-gradient(${gradientAngle}deg, ${rgbToHex(rgb)}, ${rgbToHex(gradientEnd)})`;

  const values: Array<{ id: string; label: string; value: string }> = [
    { id: "hex", label: "HEX", value: rgbaToHex(rgb, alpha) },
    { id: "rgb", label: "RGB", value: formatRgb(rgb, alpha) },
    { id: "hsl", label: "HSL", value: formatHsl(hsl, alpha) },
    { id: "css", label: "CSS", value: `background: ${rgbaToHex(rgb, alpha)};` },
  ];

  const setColor = (next: Rgb, nextAlpha = 1) => {
    setRgb(next);
    setAlpha(roundAlpha(nextAlpha));
    setHexDraft(null);
  };

  const onHexInput = (value: string) => {
    setHexDraft(value);
    const parsed = parseHex(value);
    if (!parsed) return;
    setRgb(parsed.rgb);
    const digits = value.trim().replace(/^#/, "").length;
    if (digits === 4 || digits === 8) setAlpha(roundAlpha(parsed.alpha));
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = STUDIO_TABS.findIndex((item) => item.id === tab);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % STUDIO_TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + STUDIO_TABS.length) % STUDIO_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = STUDIO_TABS.length - 1;
    else return;
    event.preventDefault();
    const nextTab = STUDIO_TABS[next];
    if (!nextTab) return;
    setTab(nextTab.id);
    tabRefs.current[next]?.focus();
  };

  const onCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1600);
    } catch {
      // Nilai tetap dirender dalam teks agar dapat disalin manual.
    }
  };

  const addPaletteColor = (nextRgb = rgb, nextAlpha = alpha) => {
    const encoded = rgbaToHex(nextRgb, nextAlpha);
    setPalette((current) =>
      current.some((item) => rgbaToHex(item.rgb, item.alpha) === encoded)
        ? current
        : [...current, { id: colorId(nextRgb, nextAlpha), rgb: nextRgb, alpha: nextAlpha }],
    );
  };

  const onImageFiles = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.ok) {
      setImageError(check.reason);
      return;
    }

    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    setImageError(null);
    setSamplePoint(null);
    try {
      const decoded = await decodeImageFile(file);
      try {
        const target = scaledSize(decoded.width, decoded.height);
        canvas.width = target.width;
        canvas.height = target.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Kanvas gambar tidak tersedia di browser ini.");
        context.clearRect(0, 0, target.width, target.height);
        context.drawImage(decoded.source, 0, 0, target.width, target.height);
        setImageInfo({ name: file.name, size: file.size, width: decoded.width, height: decoded.height });
        const pixels = context.getImageData(0, 0, target.width, target.height).data;
        const extracted = extractPaletteFromRgba(pixels, 8);
        setPalette(extracted.map((color) => ({ id: colorId(color, 1), rgb: color, alpha: 1 })));
      } finally {
        decoded.release();
      }
    } catch (error) {
      setImageInfo(null);
      canvas.width = 1;
      canvas.height = 1;
      setImageError(error instanceof Error ? error.message : "Gambar tidak dapat diproses.");
    }
  };

  const sampleAt = (x: number, y: number) => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !imageInfo) return;
    const pointX = Math.min(canvas.width - 1, Math.max(0, Math.round(x)));
    const pointY = Math.min(canvas.height - 1, Math.max(0, Math.round(y)));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const pixel = context.getImageData(pointX, pointY, 1, 1).data;
    setColor({ r: pixel[0], g: pixel[1], b: pixel[2] }, pixel[3] / 255);
    setSamplePoint({ x: pointX, y: pointY });
  };

  const sampleImage = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !imageInfo) return;
    const rect = canvas.getBoundingClientRect();
    sampleAt(
      ((event.clientX - rect.left) / rect.width) * canvas.width,
      ((event.clientY - rect.top) / rect.height) * canvas.height,
    );
  };

  const onCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !imageInfo) return;
    const step = event.shiftKey ? 10 : 1;
    const base = samplePoint ?? {
      x: Math.floor(canvas.width / 2),
      y: Math.floor(canvas.height / 2),
    };
    let x = base.x;
    let y = base.y;
    if (event.key === "ArrowLeft") x -= step;
    else if (event.key === "ArrowRight") x += step;
    else if (event.key === "ArrowUp") y -= step;
    else if (event.key === "ArrowDown") y += step;
    else if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    sampleAt(x, y);
  };

  const clearImage = () => {
    const canvas = imageCanvasRef.current;
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
    setImageInfo(null);
    setImageError(null);
    setSamplePoint(null);
  };

  const exportPalette = () => {
    const colors = palette.length > 0 ? palette : [{ id: "current", rgb, alpha }];
    const css = `:root {\n${colors.map((item, index) => `  --color-${index + 1}: ${rgbaToHex(item.rgb, item.alpha)};`).join("\n")}\n}`;
    void onCopy("palette", css);
  };

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {imageError ? `Gagal membaca gambar: ${imageError}` : copied ? "Nilai telah disalin." : ""}
      </p>

      <div
        role="tablist"
        aria-label="Menu Color Studio"
        onKeyDown={onTabKeyDown}
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2"
      >
        {STUDIO_TABS.map((item, index) => {
          const active = tab === item.id;
          const TabIcon = item.icon;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`studio-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={active ? `studio-panel-${item.id}` : undefined}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                active ? "bg-primary text-white" : "text-slate-600 hover:bg-surface hover:text-primary",
              )}
            >
              <TabIcon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <section
          id={`studio-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`studio-tab-${tab}`}
          className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          {tab === "warna" && (
            <ColorControls
              rgb={rgb}
              alpha={alpha}
              hex={hex}
              hexDraft={hexDraft}
              hexInvalid={hexInvalid}
              textColor={textColor}
              onHexInput={onHexInput}
              onHexBlur={() => setHexDraft(null)}
              onColor={setColor}
              onAlpha={(value) => setAlpha(roundAlpha(value))}
              onAddPalette={() => addPaletteColor()}
            />
          )}

          {tab === "gambar" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-secondary">Ambil warna dari gambar</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Pilih gambar lokal lalu klik titik pada preview. Gambar diperkecil maksimal {MAX_ANALYSIS_SIDE} px untuk analisis palet dan tidak diunggah ke server.
                </p>
              </div>
              {!imageInfo && (
                <ImageDropzone
                  onFiles={onImageFiles}
                  accept={IMAGE_ACCEPT_ATTR}
                  label="Pilih gambar lokal"
                  hint={`Maks. ${formatBytes(IMAGE_LIMITS.maxFileBytes)}. PNG, JPG, WebP, GIF, BMP, atau AVIF.`}
                />
              )}
              <div className={cn("flex flex-col gap-4", !imageInfo && "hidden")}>
                {imageInfo && (
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-surface p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-secondary">{imageInfo.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatBytes(imageInfo.size)} · {imageInfo.width} × {imageInfo.height} px
                      </p>
                    </div>
                    <button type="button" onClick={clearImage} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-primary/40 hover:text-primary">
                      <RotateCcw className="h-3.5 w-3.5" /> Ganti gambar
                    </button>
                  </div>
                )}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface p-2" style={CHECKERBOARD}>
                  <canvas
                    ref={imageCanvasRef}
                    onClick={sampleImage}
                    onKeyDown={onCanvasKeyDown}
                    className="block max-h-[480px] w-full cursor-crosshair rounded-xl bg-white object-contain focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    aria-label="Pratinjau gambar. Klik untuk mengambil warna pada titik tersebut. Pengguna keyboard: gunakan tombol panah untuk memindahkan titik sampel, lalu Enter atau Spasi untuk mengambil warna."
                    role="img"
                    tabIndex={0}
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  Klik titik pada gambar. Pengguna keyboard: panah memindahkan titik sampel (Shift untuk 10 px), Enter atau Spasi mengambil warna.
                </p>
                {samplePoint && <p className="text-xs text-muted">Titik terakhir: {samplePoint.x + 1}, {samplePoint.y + 1} pada preview analisis.</p>}
              </div>
              {imageError && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{imageError}</p>}
            </div>
          )}

          {tab === "kontras" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-secondary">Pemeriksa kontras</h2>
                <p className="mt-1 text-sm text-muted">Bandingkan warna aktif sebagai teks dengan warna latar. Penilaian mengikuti ambang WCAG 2.x untuk teks opaque.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput label="Warna teks" value={rgbToHex(rgb)} onChange={(value) => { const parsed = parseHex(value); if (parsed) setColor(parsed.rgb, parsed.alpha); }} />
                <ColorInput label="Warna latar" value={rgbToHex(contrastRgb)} onChange={(value) => { const parsed = parseHex(value); if (parsed) setContrastRgb(parsed.rgb); }} />
              </div>
              <div className="rounded-2xl p-6" style={{ backgroundColor: rgbToHex(contrastRgb), color: rgbToHex(rgb) }}>
                <p className="text-2xl font-bold">Contoh teks</p>
                <p className="mt-2 text-sm">Teks normal harus memenuhi rasio minimal 4,5:1 untuk AA.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Rasio kontras" value={`${contrast.ratio.toFixed(2)}:1`} pass={contrast.normalAa} />
                <Metric label="Teks normal" value={contrast.normalAaa ? "AAA" : contrast.normalAa ? "AA" : "Belum AA"} pass={contrast.normalAa} />
                <Metric label="Teks besar" value={contrast.largeAaa ? "AAA" : contrast.largeAa ? "AA" : "Belum AA"} pass={contrast.largeAa} />
                <Metric label="WCAG" value="2.x · warna opaque" pass />
              </div>
            </div>
          )}

          {tab === "gradient" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-secondary">Pembuat gradient</h2>
                <p className="mt-1 text-sm text-muted">Gunakan warna aktif sebagai titik awal, atur titik akhir dan sudutnya, lalu salin CSS.</p>
              </div>
              <div className="h-48 rounded-3xl border border-slate-200" style={{ background: gradientCss }} />
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInput label="Titik awal" value={rgbToHex(rgb)} onChange={(value) => { const parsed = parseHex(value); if (parsed) setColor(parsed.rgb, parsed.alpha); }} />
                <ColorInput label="Titik akhir" value={rgbToHex(gradientEnd)} onChange={(value) => { const parsed = parseHex(value); if (parsed) setGradientEnd(parsed.rgb); }} />
              </div>
              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
                <span className="flex justify-between text-xs font-semibold text-secondary">Sudut <span className="font-mono text-muted">{gradientAngle}°</span></span>
                <input type="range" min={0} max={360} value={gradientAngle} onChange={(event) => setGradientAngle(Number(event.target.value))} className="h-2 w-full accent-primary" />
              </label>
              <CopyRow id="gradient" label="CSS gradient" value={`background: ${gradientCss};`} copied={copied === "gradient"} onCopy={onCopy} />
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="relative h-36" style={CHECKERBOARD}>
              <div className="absolute inset-0" style={{ backgroundColor: colorCss(rgb, alpha) }} />
              <div className="relative flex h-full flex-col justify-end p-5" style={{ color: textColor }}>
                <p className="text-lg font-bold">Warna aktif</p>
                <p className="text-xs opacity-80">{rgbaToHex(rgb, alpha)}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => setColor(preset.rgb)} aria-label={`Pilih warna ${preset.name}`} title={preset.name} className={cn("h-8 w-8 rounded-full border transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none", rgbToHex(preset.rgb) === hex ? "border-primary ring-2 ring-primary/30" : "border-slate-200")} style={{ backgroundColor: rgbToHex(preset.rgb) }} />
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {values.map((value) => <CopyRow key={value.id} {...value} copied={copied === value.id} onCopy={onCopy} />)}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-secondary">Palet kerja</h2>
                <p className="mt-1 text-xs text-muted">Warna dari gambar atau pilihan Anda saat ini.</p>
              </div>
              <button type="button" onClick={() => addPaletteColor()} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary/40">Tambah aktif</button>
            </div>
            {palette.length > 0 ? (
              <>
                <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-4">
                  {palette.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setColor(item.rgb, item.alpha)} title={rgbaToHex(item.rgb, item.alpha)} aria-label={`Pilih ${rgbaToHex(item.rgb, item.alpha)} dari palet`} className="group w-full focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
                        <span className="block aspect-square rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:-translate-y-0.5" style={{ backgroundColor: colorCss(item.rgb, item.alpha) }} />
                        <span className="mt-1 block truncate font-mono text-[10px] text-muted">{rgbaToHex(item.rgb, item.alpha)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={exportPalette}><ClipboardCheck className="h-4 w-4" /> Salin CSS</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPalette([])}>Kosongkan</Button>
                </div>
              </>
            ) : <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">Tambahkan warna aktif atau pilih gambar untuk membuat palet otomatis.</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold text-secondary">Variasi warna aktif</h2></div>
            <div className="mt-4 grid grid-cols-5 overflow-hidden rounded-xl border border-slate-200">
              {scale.map((item, index) => <button key={`${rgbToHex(item)}-${index}`} type="button" aria-label={`Pilih variasi ${rgbToHex(item)}`} title={rgbToHex(item)} onClick={() => setColor(item)} className="h-12 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none" style={{ backgroundColor: rgbToHex(item) }} />)}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ColorControls({ rgb, alpha, hex, hexDraft, hexInvalid, textColor, onHexInput, onHexBlur, onColor, onAlpha, onAddPalette }: {
  rgb: Rgb; alpha: number; hex: string; hexDraft: string | null; hexInvalid: boolean; textColor: string;
  onHexInput: (value: string) => void; onHexBlur: () => void; onColor: (rgb: Rgb) => void; onAlpha: (value: number) => void; onAddPalette: () => void;
}) {
  return <div className="flex flex-col gap-5">
    <div><h2 className="text-lg font-bold text-secondary">Pilih dan gunakan warna</h2><p className="mt-1 text-sm text-muted">Masukkan kode atau gunakan pemilih visual. Semua format nilai tersedia untuk disalin di panel kanan.</p></div>
    <div className="relative h-52 overflow-hidden rounded-3xl border border-slate-200" style={CHECKERBOARD}>
      <div className="absolute inset-0 transition-colors" style={{ backgroundColor: colorCss(rgb, alpha) }} />
      <div className="relative flex h-full flex-col justify-end p-5" style={{ color: textColor }}><p className="text-lg font-bold">Contoh Teks</p><p className="text-xs opacity-80">Pratinjau kepekatan warna aktif</p></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"><input type="color" value={hex} onChange={(event) => { const parsed = parseHex(event.target.value); if (parsed) onColor(parsed.rgb); }} aria-label="Pilih warna visual" className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" /><span className="flex items-center gap-1.5 text-xs font-semibold text-secondary"><Pipette className="h-3.5 w-3.5 text-primary" />Pemilih warna</span></label>
      <label className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Kode HEX</span><input type="text" value={hexDraft ?? hex} onChange={(event) => onHexInput(event.target.value)} onBlur={onHexBlur} spellCheck={false} autoComplete="off" aria-label="Kode warna HEX" aria-invalid={hexInvalid} className={cn("w-full bg-transparent font-mono text-sm font-semibold text-secondary uppercase focus:outline-none", hexInvalid && "text-rose-500")} /></label>
    </div>
    <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4"><span className="flex items-center justify-between text-xs font-semibold text-secondary">Kepekatan (alfa)<span className="font-mono text-muted">{roundAlpha(alpha)}</span></span><input type="range" min={0} max={1} step={0.01} value={alpha} onChange={(event) => onAlpha(Number(event.target.value))} aria-label="Atur kepekatan warna" className="h-2 w-full cursor-pointer accent-primary" /></label>
    <Button className="self-start" onClick={onAddPalette}><Palette className="h-4 w-4" /> Tambahkan ke palet</Button>
  </div>;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" /><span className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span><span className="font-mono text-sm font-semibold text-secondary">{value}</span></span></label>;
}

function CopyRow({ id, label, value, copied, onCopy }: { id: string; label: string; value: string; copied: boolean; onCopy: (id: string, value: string) => void }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><div className="min-w-0"><p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</p><p className="truncate font-mono text-xs text-secondary">{value}</p></div><button type="button" onClick={() => onCopy(id, value)} aria-label={`Salin nilai ${label}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div>;
}

function Metric({ label, value, pass }: { label: string; value: string; pass: boolean }) {
  return <div className="rounded-2xl bg-surface px-4 py-3"><p className="text-[11px] font-medium text-muted">{label}</p><p className={cn("mt-1 text-sm font-bold", pass ? "text-emerald-700" : "text-amber-700")}>{value}</p></div>;
}
