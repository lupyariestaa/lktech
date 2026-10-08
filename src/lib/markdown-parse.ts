/**
 * Parser Markdown murni (tanpa React, tanpa dependensi, tanpa innerHTML).
 * Mengubah teks menjadi AST block & inline yang dirender oleh `markdown.tsx`.
 *
 * Didukung:
 * - Block: heading (##, ###, ####), paragraf, daftar (-, *), daftar bernomor (1.),
 *   kutipan (>), blok kode fenced (```), garis pemisah (---), gambar tunggal.
 * - Inline: **tebal**, *miring*, `kode`, [teks](url), ![alt](url "wide").
 *
 * Keamanan: URL tautan hanya skema aman (http/https/mailto/relatif). URL gambar
 * hanya dari host Cloudinary atau path relatif internal. Selain itu jadi teks.
 *
 * PENTING: file ini tidak boleh import alias "@/..." agar bisa dites langsung
 * dengan `node --experimental-strip-types`.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "b"; v: string }
  | { t: "i"; v: string }
  | { t: "code"; v: string }
  | { t: "a"; href: string; text: string; external: boolean }
  | { t: "img"; src: string; alt: string; wide: boolean };

export type Block =
  | { t: "h"; level: 2 | 3 | 4; id: string; inline: Inline[] }
  | { t: "p"; inline: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "quote"; inline: Inline[] }
  | { t: "code"; lang: string; code: string }
  | { t: "hr" }
  | { t: "img"; src: string; alt: string; wide: boolean };

/** Skema tautan aman. Mengembalikan null bila tidak diizinkan. */
export function safeHref(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (v.startsWith("//")) return null; // protocol-relative: tolak
  if (v.startsWith("/") || v.startsWith("#")) return v;
  if (/^(https?:\/\/|mailto:)/i.test(v)) return v;
  return null;
}

/** Sumber gambar aman: path relatif internal atau host Cloudinary. */
export function safeImageSrc(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (v.startsWith("//")) return null;
  if (v.startsWith("/")) return v;
  if (v.startsWith("https://res.cloudinary.com/")) return v;
  return null;
}

/** Slug untuk id anchor heading (aman untuk atribut id & URL fragment). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// URL boleh berisi satu tingkat kurung, mis. javascript:alert(1).
const URL_PAT = String.raw`(?:[^()\s]|\([^()\s]*\))+`;
// Grup: 1 kode, 2 tebal, 3 miring, 4 alt gambar, 5 src, 6 title, 7 teks tautan, 8 href.
const INLINE_RE = new RegExp(
  [
    "`([^`]+)`",
    String.raw`\*\*([^*]+)\*\*`,
    String.raw`\*([^*]+)\*`,
    String.raw`!\[([^\]]*)\]\((${URL_PAT})(?:\s+"([^"]*)")?\)`,
    String.raw`\[([^\]]+)\]\((${URL_PAT})\)`,
  ].join("|"),
  "g",
);

/** Tokenize teks inline menjadi daftar node. Teks biasa tidak pernah dieksekusi. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  const pushText = (s: string) => {
    if (!s) return;
    const prev = out[out.length - 1];
    if (prev && prev.t === "text") prev.v += s;
    else out.push({ t: "text", v: s });
  };

  while ((m = INLINE_RE.exec(text)) !== null) {
    pushText(text.slice(last, m.index));
    last = INLINE_RE.lastIndex;

    if (m[1] !== undefined) {
      out.push({ t: "code", v: m[1] });
    } else if (m[2] !== undefined) {
      out.push({ t: "b", v: m[2] });
    } else if (m[3] !== undefined) {
      out.push({ t: "i", v: m[3] });
    } else if (m[5] !== undefined) {
      // Gambar: tanpa alt atau src aman → tidak dirender (alt wajib, B1.4).
      const src = safeImageSrc(m[5]);
      const alt = (m[4] ?? "").trim();
      if (src && alt) {
        out.push({ t: "img", src, alt, wide: (m[6] ?? "").trim() === "wide" });
      }
    } else if (m[7] !== undefined) {
      const href = safeHref(m[8]);
      if (href) {
        out.push({
          t: "a",
          href,
          text: m[7],
          external: /^https?:\/\//i.test(href),
        });
      } else {
        // Skema tidak aman → teks biasa tanpa tautan.
        pushText(m[7]);
      }
    }
  }
  pushText(text.slice(last));
  return out;
}

/** Parse dokumen Markdown menjadi daftar block. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    // Baris kosong.
    if (!trimmed) {
      i += 1;
      continue;
    }

    // Blok kode fenced.
    const fence = /^```\s*([\w+-]*)\s*$/.exec(trimmed);
    if (fence) {
      const lang = fence[1] ?? "";
      const code: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== "```") {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // lewati penutup (atau akhir dokumen)
      blocks.push({ t: "code", lang, code: code.join("\n") });
      continue;
    }

    // Garis pemisah.
    if (trimmed === "---") {
      blocks.push({ t: "hr" });
      i += 1;
      continue;
    }

    // Heading (#### → h4, ### → h3, ## dan # → h2; h1 dihindari untuk SEO).
    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const hashes = heading[1].length;
      const level = (hashes <= 2 ? 2 : hashes) as 2 | 3 | 4;
      const text = heading[2];
      blocks.push({ t: "h", level, id: headingId(text), inline: parseInline(text) });
      i += 1;
      continue;
    }

    // Gambar tunggal satu baris.
    const figure = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/.exec(trimmed);
    if (figure) {
      const src = safeImageSrc(figure[2]);
      const alt = (figure[1] ?? "").trim();
      if (src && alt) {
        blocks.push({ t: "img", src, alt, wide: (figure[3] ?? "").trim() === "wide" });
      }
      i += 1;
      continue;
    }

    // Kutipan (baris berurutan dengan ">").
    if (trimmed.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ t: "quote", inline: parseInline(quoted.join(" ")) });
      continue;
    }

    // Daftar tak-bernomor.
    if (/^[-*]\s+/.test(trimmed)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(parseInline(lines[i].trim().replace(/^[-*]\s+/, "")));
        i += 1;
      }
      blocks.push({ t: "ul", items });
      continue;
    }

    // Daftar bernomor.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(parseInline(lines[i].trim().replace(/^\d+\.\s+/, "")));
        i += 1;
      }
      blocks.push({ t: "ol", items });
      continue;
    }

    // Paragraf: gabungkan baris berurutan sampai ketemu blok lain.
    const para: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || isBlockStart(t)) break;
      para.push(t);
      i += 1;
    }
    if (para.length === 0) {
      // Jaga agar tidak loop tanpa kemajuan.
      para.push(trimmed);
      i += 1;
    }
    blocks.push({ t: "p", inline: parseInline(para.join(" ")) });
  }

  return blocks;
}

function isBlockStart(t: string): boolean {
  return (
    t.startsWith("```") ||
    t === "---" ||
    /^#{1,4}\s/.test(t) ||
    t.startsWith(">") ||
    /^[-*]\s+/.test(t) ||
    /^\d+\.\s+/.test(t) ||
    /^!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)$/.test(t)
  );
}
