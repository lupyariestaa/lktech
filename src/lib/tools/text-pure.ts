/**
 * LOGIKA MURNI Formatter Teks (F2d).
 *
 * Bebas impor runtime (tanpa alias `@/`) agar diuji Node lewat
 * `--experimental-strip-types`. Semua fungsi aman untuk input liar dan tidak
 * menyentuh DOM/`navigator`.
 */

export const TEXT_LIMITS = {
  /** Batas lunak input agar UI tidak membeku pada teks sangat besar. */
  maxInputChars: 2_000_000,
} as const;

export type JsonIndent = 2 | 4 | "tab";
export type TextMode = "json-pretty" | "json-minify" | "text-clean";

export type TextStats = {
  chars: number;
  words: number;
  lines: number;
  bytes: number;
};

export type TransformOptions = {
  mode: TextMode;
  indent?: JsonIndent;
  sortKeys?: boolean;
};

export type TransformResult =
  | { ok: true; output: string; stats: TextStats }
  | { ok: false; error: string; stats: TextStats };

/** Statistik teks: jumlah karakter (code point), kata, baris, dan byte UTF-8. */
export function countTextStats(text: string): TextStats {
  const value = text ?? "";
  const chars = Array.from(value).length;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lines = value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length;
  const bytes =
    typeof TextEncoder === "function"
      ? new TextEncoder().encode(value).length
      : value.length;
  return { chars, words, lines, bytes };
}

/** Nilai `space` untuk `JSON.stringify` berdasarkan pilihan indentasi. */
export function indentValue(indent: JsonIndent = 2): string | number {
  if (indent === "tab") return "\t";
  return indent === 4 ? 4 : 2;
}

/** Urutkan kunci objek secara rekursif (array tetap pada urutannya). */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

/** Ubah akhir baris ke `lf` atau `crlf`. */
export function normalizeLineEndings(text: string, style: "lf" | "crlf"): string {
  const lf = (text ?? "").replace(/\r\n?/g, "\n");
  return style === "crlf" ? lf.replace(/\n/g, "\r\n") : lf;
}

/**
 * Rapikan teks biasa: samakan akhir baris ke LF, buang spasi di ujung baris,
 * dan ringkas baris kosong beruntun menjadi satu.
 */
export function cleanText(text: string): string {
  const lf = normalizeLineEndings(text ?? "", "lf");
  return lf
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}

/**
 * Transformasi teks sesuai mode.
 * - `json-pretty`: validasi JSON lalu cetak rapi.
 * - `json-minify`: validasi JSON lalu cetak satu baris.
 * - `text-clean`: rapikan spasi/baris tanpa parsing.
 */
export function transformText(
  input: string,
  options: TransformOptions,
): TransformResult {
  const value = input ?? "";
  const inputStats = countTextStats(value);

  if (inputStats.chars > TEXT_LIMITS.maxInputChars) {
    return {
      ok: false,
      error: `Teks terlalu besar (${inputStats.chars.toLocaleString("id-ID")} karakter; maks ${TEXT_LIMITS.maxInputChars.toLocaleString("id-ID")}).`,
      stats: inputStats,
    };
  }

  if (options.mode === "text-clean") {
    const output = cleanText(value);
    return { ok: true, output, stats: countTextStats(output) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON tidak valid.";
    return { ok: false, error: `JSON tidak valid: ${message}`, stats: inputStats };
  }

  const prepared = options.sortKeys ? sortKeysDeep(parsed) : parsed;
  const output =
    options.mode === "json-minify"
      ? JSON.stringify(prepared)
      : JSON.stringify(prepared, null, indentValue(options.indent));

  return { ok: true, output, stats: countTextStats(output) };
}