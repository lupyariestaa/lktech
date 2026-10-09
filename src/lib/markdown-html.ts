/**
 * Konversi Markdown → HTML aman (tanpa React, tanpa alias "@/") untuk RSS
 * `content:encoded` (B7.3). Memakai parser yang sama dengan renderer publik
 * sehingga hasil konsisten. Semua teks di-escape; URL lewat filter aman.
 */
/** Bentuk AST yang dipakai (identik dengan markdown-parse.ts). */
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

/** Escape entitas HTML untuk teks & atribut. */
export function htmlEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ubah sumber relatif (`/...`) jadi absolut terhadap `siteUrl` agar gambar &
 * tautan tetap jalan di pembaca RSS. URL absolut dibiarkan.
 */
export function absolutize(url: string, siteUrl: string): string {
  if (url.startsWith("/")) return `${siteUrl.replace(/\/$/, "")}${url}`;
  return url;
}

function renderInline(nodes: Inline[], siteUrl: string): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return htmlEscape(n.v);
        case "b":
          return `<strong>${htmlEscape(n.v)}</strong>`;
        case "i":
          return `<em>${htmlEscape(n.v)}</em>`;
        case "code":
          return `<code>${htmlEscape(n.v)}</code>`;
        case "a":
          return `<a href="${htmlEscape(absolutize(n.href, siteUrl))}">${htmlEscape(n.text)}</a>`;
        case "img":
          return figure(n.src, n.alt, siteUrl);
      }
    })
    .join("");
}

function figure(src: string, alt: string, siteUrl: string): string {
  return `<figure><img src="${htmlEscape(absolutize(src, siteUrl))}" alt="${htmlEscape(alt)}" /></figure>`;
}

function renderBlock(b: Block, siteUrl: string): string {
  switch (b.t) {
    case "h":
      return `<h${b.level} id="${htmlEscape(b.id)}">${renderInline(b.inline, siteUrl)}</h${b.level}>`;
    case "p":
      return `<p>${renderInline(b.inline, siteUrl)}</p>`;
    case "ul":
      return `<ul>${b.items.map((it) => `<li>${renderInline(it, siteUrl)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${b.items.map((it) => `<li>${renderInline(it, siteUrl)}</li>`).join("")}</ol>`;
    case "quote":
      return `<blockquote>${renderInline(b.inline, siteUrl)}</blockquote>`;
    case "code":
      return `<pre><code>${htmlEscape(b.code)}</code></pre>`;
    case "hr":
      return "<hr />";
    case "img":
      return figure(b.src, b.alt, siteUrl);
  }
}

/**
 * Blok AST (hasil `parseMarkdown`) → HTML aman untuk RSS `content:encoded`.
 * Pemanggil meng-parse dulu agar modul ini tidak bergantung pada impor relatif.
 */
export function blocksToHtml(blocks: Block[], siteUrl: string): string {
  return blocks.map((b) => renderBlock(b, siteUrl)).join("\n");
}

/**
 * Bungkus HTML dalam CDATA untuk elemen XML. `]]>` dipecah agar tidak menutup
 * CDATA lebih awal.
 */
export function cdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** Hitung kata dari HTML (kasar, untuk JSON-LD wordCount, B7.5). */
export function wordCountFromMarkdown(source: string): number {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*>`_\-]/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
