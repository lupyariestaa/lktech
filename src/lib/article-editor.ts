/**
 * Logika murni editor artikel (tanpa React, tanpa alias "@/") agar bisa dites
 * dengan `node --experimental-strip-types`.
 */

/** Hasil operasi teks: teks baru dan seleksi baru [start, end). */
export type Edit = { text: string; start: number; end: number };

/** Bungkus seleksi dengan `before`/`after`. Tanpa seleksi, pakai `placeholder`. */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder = "teks",
): Edit {
  const selected = text.slice(start, end) || placeholder;
  const next = text.slice(0, start) + before + selected + after + text.slice(end);
  const s = start + before.length;
  return { text: next, start: s, end: s + selected.length };
}

/**
 * Terapkan awalan ke setiap baris yang disentuh seleksi.
 * - `makePrefix(i)` memberi awalan untuk baris ke-i (untuk daftar bernomor).
 * - `stripRe` (opsional): bila SEMUA baris sudah cocok, awalan dilepas (toggle).
 */
export function prefixLines(
  text: string,
  start: number,
  end: number,
  makePrefix: (i: number) => string,
  stripRe?: RegExp,
): Edit {
  const ls = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const nl = text.indexOf("\n", end);
  const le = nl === -1 ? text.length : nl;

  const lines = text.slice(ls, le).split("\n");
  const toggleOff = Boolean(stripRe) && lines.every((l) => stripRe!.test(l));
  const out = lines.map((l, i) =>
    toggleOff ? l.replace(stripRe!, "") : makePrefix(i) + l,
  );
  const block = out.join("\n");
  return {
    text: text.slice(0, ls) + block + text.slice(le),
    start: ls,
    end: ls + block.length,
  };
}

/** Sisipkan blok dengan spasi baris kosong yang benar (mirip insertBlock). */
export function insertAt(text: string, start: number, end: number, snippet: string): Edit {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead =
    before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail =
    after.length === 0 || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const head = before + lead + snippet;
  return { text: head + trail + after, start: head.length, end: head.length };
}

/** Jumlah kata sederhana dari teks Markdown (simbol format tidak dihitung). */
export function countWords(body: string): number {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*>`_\-[\]()!]/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Estimasi menit baca (200 kata/menit, minimal 1). */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(countWords(body) / 200));
}

/** Status panjang teks terhadap rentang rekomendasi. */
export function lengthStatus(len: number, min: number, max: number): "kosong" | "pendek" | "ok" | "panjang" {
  if (len === 0) return "kosong";
  if (len < min) return "pendek";
  if (len > max) return "panjang";
  return "ok";
}

/** Zona waktu tampilan admin: WIB (UTC+7). */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * ISO → nilai `datetime-local` dalam WIB ("YYYY-MM-DDTHH:mm").
 * Mengembalikan "" bila tidak valid/kosong.
 */
export function isoToWibInput(iso: string | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t + WIB_OFFSET_MS).toISOString().slice(0, 16);
}

/**
 * Nilai `datetime-local` (dianggap WIB) → ISO UTC.
 * "" → "" (tanpa jadwal). Format salah → null.
 */
export function wibInputToIso(value: string): string | null {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}:00+07:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Kunci localStorage untuk autosave. `key` = slug atau "baru". */
export function draftStorageKey(key: string): string {
  return `lktech:article-draft:${key || "baru"}`;
}
