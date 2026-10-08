/**
 * Utilitas murni untuk editor artikel (tanpa React, tanpa alias "@/").
 * Dipakai oleh editor admin (sisip gambar) dan pelacak penggunaan media (body).
 */
/**
 * Sumber gambar aman. Sama dengan `safeImageSrc` di markdown-parse.ts
 * (disalin agar file ini tanpa import relatif berekstensi, yang ditolak tsc).
 * Dijaga oleh test round-trip di scripts/article-media.test.ts.
 */
function safeImageSrc(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (v.startsWith("//")) return null;
  if (v.startsWith("/")) return v;
  if (v.startsWith("https://res.cloudinary.com/")) return v;
  return null;
}

/**
 * Bangun sintaks gambar `![alt](src "wide")`. Mengembalikan null bila alt
 * kosong (alt wajib, B1.4) atau sumber tidak aman.
 * Karakter yang bisa merusak sintaks di alt dibuang.
 */
export function buildImageSnippet(
  alt: string,
  src: string,
  wide: boolean,
): string | null {
  const cleanAlt = alt
    .replace(/[[\]()"\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleanAlt) return null;

  const safe = safeImageSrc(src);
  if (!safe || /[\s()"]/.test(safe)) return null;

  return `![${cleanAlt}](${safe}${wide ? ' "wide"' : ""})`;
}

/**
 * Sisipkan `snippet` sebagai blok sendiri di posisi seleksi [start, end).
 * Menambah baris kosong bila perlu agar gambar tidak menempel paragraf.
 * Mengembalikan teks baru dan posisi kursor setelah sisipan.
 */
export function insertBlock(
  text: string,
  start: number,
  end: number,
  snippet: string,
): { text: string; cursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);

  const lead =
    before.length === 0 || before.endsWith("\n\n")
      ? ""
      : before.endsWith("\n")
        ? "\n"
        : "\n\n";
  const trail =
    after.length === 0 || after.startsWith("\n\n")
      ? ""
      : after.startsWith("\n")
        ? "\n"
        : "\n\n";

  const head = before + lead + snippet;
  return { text: head + trail + after, cursor: head.length };
}

/** Ambil semua URL gambar dari body Markdown (untuk pelacakan pemakaian media). */
export function extractImageUrls(body: string): string[] {
  const out = new Set<string>();
  const re = /!\[[^\]]*\]\(([^)\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out.add(m[1]);
  }
  return Array.from(out);
}
