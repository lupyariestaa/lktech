/**
 * LOGIKA MURNI Color Picker (F2a).
 *
 * Bebas impor runtime (tanpa alias `@/`) agar dapat diuji Node lewat
 * `--experimental-strip-types`. Semua fungsi wajib aman untuk input liar
 * (string apa pun, angka di luar rentang) dan tidak boleh melempar.
 */

export type Rgb = { r: number; g: number; b: number };
/** `h` 0–360, `s`/`l` 0–100 (dibulatkan ke bilangan bulat). */
export type Hsl = { h: number; s: number; l: number };

/** Batasi angka ke rentang `[min, max]`; non-finite → `min`. */
export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Bulatkan + batasi ke rentang bilangan bulat aman. */
function toByte(n: number): number {
  return Math.round(clamp(n, 0, 255));
}

/** Normalisasi alfa: non-finite → 1; selain itu dibatasi `[0, 1]`. */
export function clampAlpha(a: number): number {
  if (!Number.isFinite(a)) return 1;
  return clamp(a, 0, 1);
}

/**
 * Urai kode HEX. Menerima `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, dengan atau
 * tanpa `#`, serta spasi di tepi. Mengembalikan `null` bila tidak valid.
 */
export function parseHex(
  input: string,
): { rgb: Rgb; alpha: number } | null {
  const raw = (input ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]+$/.test(raw)) return null;

  let r: number;
  let g: number;
  let b: number;
  let a = 1;

  if (raw.length === 3 || raw.length === 4) {
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
    if (raw.length === 4) a = parseInt(raw[3] + raw[3], 16) / 255;
  } else if (raw.length === 6 || raw.length === 8) {
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
    if (raw.length === 8) a = parseInt(raw.slice(6, 8), 16) / 255;
  } else {
    return null;
  }

  return { rgb: { r, g, b }, alpha: clampAlpha(a) };
}

/** `#RRGGBB` (huruf besar). */
export function rgbToHex(rgb: Rgb): string {
  const h = (n: number) => toByte(n).toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase();
}

/** `#RRGGBBAA` bila `alpha < 1`, selain itu `#RRGGBB`. */
export function rgbaToHex(rgb: Rgb, alpha: number): string {
  const base = rgbToHex(rgb);
  const a = clampAlpha(alpha);
  if (a >= 1) return base;
  return `${base}${Math.round(a * 255).toString(16).padStart(2, "0")}`.toUpperCase();
}

/** Konversi RGB (0–255) → HSL. */
export function rgbToHsl(rgb: Rgb): Hsl {
  const r = toByte(rgb.r) / 255;
  const g = toByte(rgb.g) / 255;
  const b = toByte(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Konversi HSL → RGB (0–255). */
export function hslToRgb(hsl: Hsl): Rgb {
  const h = ((clamp(hsl.h, 0, 360) % 360) + 360) % 360 / 360;
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;

  if (s === 0) {
    const v = toByte(l * 255);
    return { r: v, g: v, b: v };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  return {
    r: toByte(hue(h + 1 / 3) * 255),
    g: toByte(hue(h) * 255),
    b: toByte(hue(h - 1 / 3) * 255),
  };
}

/** Urai `hsl(...)`, `hsl(h, s%, l%)`, atau `h,s,l` polos. `null` bila gagal. */
export function parseHsl(input: string): Hsl | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const body = raw.replace(/^hsla?\(/i, "").replace(/\)$/, "");
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if (![h, s, l].every(Number.isFinite)) return null;
  return {
    h: Math.round(((h % 360) + 360) % 360),
    s: Math.round(clamp(s, 0, 100)),
    l: Math.round(clamp(l, 0, 100)),
  };
}

/** Bulatkan alfa ke 2 desimal agar string stabil (mis. `0.5`, bukan `0.50000001`). */
export function roundAlpha(alpha: number): number {
  return Math.round(clampAlpha(alpha) * 100) / 100;
}

/** `rgb(r, g, b)` atau `rgba(r, g, b, a)`. */
export function formatRgb(rgb: Rgb, alpha = 1): string {
  const r = toByte(rgb.r);
  const g = toByte(rgb.g);
  const b = toByte(rgb.b);
  const a = roundAlpha(alpha);
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** `hsl(h, s%, l%)` atau `hsla(h, s%, l%, a)`. */
export function formatHsl(hsl: Hsl, alpha = 1): string {
  const h = Math.round(((clamp(hsl.h, 0, 360) % 360) + 360) % 360);
  const s = Math.round(clamp(hsl.s, 0, 100));
  const l = Math.round(clamp(hsl.l, 0, 100));
  const a = roundAlpha(alpha);
  return a >= 1
    ? `hsl(${h}, ${s}%, ${l}%)`
    : `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

/** Luminansi relatif (WCAG) untuk memilih warna teks kontras. */
export function relativeLuminance(rgb: Rgb): number {
  const chan = (v: number) => {
    const c = toByte(v) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(rgb.r) + 0.7152 * chan(rgb.g) + 0.0722 * chan(rgb.b);
}

/** Warna teks paling kontras (hitam/putih) untuk latar `rgb`. */
export function contrastTextColor(rgb: Rgb): string {
  return relativeLuminance(rgb) > 0.179 ? "#000000" : "#FFFFFF";
}
