"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
} from "lucide-react";
import { Markdown } from "@/lib/markdown";
import {
  countWords,
  insertAt,
  prefixLines,
  readingMinutes,
  wrapSelection,
  type Edit,
} from "@/lib/article-editor";
import { cn } from "@/lib/utils";

type ToolId =
  | "bold"
  | "italic"
  | "h2"
  | "h3"
  | "link"
  | "ul"
  | "ol"
  | "quote"
  | "code"
  | "hr"
  | "image";

/**
 * Editor Markdown dengan toolbar, preview berdampingan (renderer publik yang
 * sama), dan tombol sisip gambar. Operasi teks ada di `article-editor.ts`.
 *
 * `onRequestImage` dipanggil saat tombol gambar ditekan. Pemanggil membuka media
 * picker, lalu memanggil `insert(snippet)` dengan sintaks gambar yang sudah jadi.
 */
export function MarkdownEditor({
  value,
  onChange,
  onRequestImage,
  placeholder,
  rows = 18,
  fieldClass,
}: {
  value: string;
  onChange: (text: string) => void;
  onRequestImage: (insert: (snippet: string) => void, cursor: { start: number; end: number }) => void;
  placeholder?: string;
  rows?: number;
  fieldClass: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const selection = () => {
    const el = areaRef.current;
    return el
      ? { start: el.selectionStart, end: el.selectionEnd }
      : { start: value.length, end: value.length };
  };

  /** Terapkan hasil edit lalu kembalikan seleksi ke textarea. */
  const apply = (e: Edit) => {
    onChange(e.text);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(e.start, e.end);
    });
  };

  const wrap = (before: string, after: string, placeholderText?: string) => {
    const s = selection();
    apply(wrapSelection(value, s.start, s.end, before, after, placeholderText));
  };

  const linePrefix = (prefix: string | ((i: number) => string), stripRe?: RegExp) => {
    const s = selection();
    const make = typeof prefix === "string" ? () => prefix : prefix;
    apply(prefixLines(value, s.start, s.end, make, stripRe));
  };

  const link = () => {
    const s = selection();
    const selected = value.slice(s.start, s.end) || "teks tautan";
    const url = "https://";
    const snippet = `[${selected}](${url})`;
    const next = insertAt(value, s.start, s.end, snippet);
    // Seleksi URL agar langsung bisa diketik.
    const urlStart = next.text.lastIndexOf(url, next.start);
    onChange(next.text);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(urlStart, urlStart + url.length);
    });
  };

  const sisipGambar = () => {
    const s = selection();
    onRequestImage((snippet) => {
      const r = insertAt(value, s.start, s.end, snippet);
      apply(r);
    }, s);
  };

  // Daftar aksi (tanpa akses ref saat render). Eksekusi dilakukan di handler.
  const tools: Array<{ id: ToolId; label: string; icon: ReactNode }> = [
    { id: "bold", label: "Tebal", icon: <Bold className="h-4 w-4" /> },
    { id: "italic", label: "Miring", icon: <Italic className="h-4 w-4" /> },
    { id: "h2", label: "Subjudul", icon: <Heading2 className="h-4 w-4" /> },
    { id: "h3", label: "Sub-subjudul", icon: <Heading3 className="h-4 w-4" /> },
    { id: "link", label: "Tautan", icon: <LinkIcon className="h-4 w-4" /> },
    { id: "ul", label: "Daftar", icon: <List className="h-4 w-4" /> },
    { id: "ol", label: "Daftar bernomor", icon: <ListOrdered className="h-4 w-4" /> },
    { id: "quote", label: "Kutipan", icon: <Quote className="h-4 w-4" /> },
    { id: "code", label: "Kode", icon: <Code className="h-4 w-4" /> },
    { id: "hr", label: "Garis pemisah", icon: <Minus className="h-4 w-4" /> },
    { id: "image", label: "Sisipkan gambar", icon: <ImageIcon className="h-4 w-4" /> },
  ];

  const run = (id: ToolId) => {
    switch (id) {
      case "bold": return wrap("**", "**", "teks tebal");
      case "italic": return wrap("*", "*", "teks miring");
      case "h2": return linePrefix("## ");
      case "h3": return linePrefix("### ");
      case "link": return link();
      case "ul": return linePrefix("- ", /^- /);
      case "ol": return linePrefix((i) => `${i + 1}. `, /^\d+\. /);
      case "quote": return linePrefix("> ", /^> /);
      case "code": return wrap("`", "`", "kode");
      case "hr": {
        const s = selection();
        return apply(insertAt(value, s.start, s.end, "---"));
      }
      case "image": return sisipGambar();
    }
  };

  // Hitungan memakai fungsi murni yang sama dengan estimasi di server (B5.1).
  const words = countWords(value);
  const minutes = readingMinutes(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="toolbar" aria-label="Format teks" className="flex flex-wrap items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => run(t.id)}
              aria-label={t.label}
              title={t.label}
              disabled={preview}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
            >
              {t.icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>
            {words} kata · ~{minutes} menit baca
          </span>
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5" role="group" aria-label="Mode tampilan">
            <button
              type="button"
              onClick={() => setPreview(false)}
              aria-pressed={!preview}
              className={cn("rounded-full px-3 py-1 font-semibold", !preview ? "bg-primary text-white" : "text-slate-500")}
            >
              Tulis
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              aria-pressed={preview}
              className={cn("rounded-full px-3 py-1 font-semibold", preview ? "bg-primary text-white" : "text-slate-500")}
            >
              Pratinjau
            </button>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-3", preview ? "" : "lg:grid-cols-2")}>
        {!preview && (
          <textarea
            ref={areaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Isi artikel (Markdown)"
            className={cn(fieldClass, "resize-y font-mono text-xs leading-relaxed")}
          />
        )}
        {/* Mode tulis: pratinjau berdampingan di layar lebar. Mode pratinjau: penuh. */}
        <div
          aria-label="Pratinjau isi"
          className={cn(
            "overflow-y-auto rounded-2xl border border-slate-200 bg-white px-5 py-4",
            preview ? "min-h-[300px]" : "hidden lg:block",
          )}
          style={{ maxHeight: `${rows * 1.6}rem` }}
        >
          {value.trim() ? (
            <Markdown content={value} />
          ) : (
            <p className="text-sm text-muted">Pratinjau akan tampil di sini.</p>
          )}
        </div>
      </div>
    </div>
  );
}
