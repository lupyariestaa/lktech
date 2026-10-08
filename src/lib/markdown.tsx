import type { ReactNode } from "react";
import Image from "next/image";
import { CodeBlock } from "@/components/code-block";
import { parseMarkdown, type Block, type Inline } from "@/lib/markdown-parse";

/**
 * Renderer Markdown. Parsing ada di `markdown-parse.ts` (murni & dites);
 * file ini hanya memetakan AST ke elemen React. Tanpa innerHTML.
 */

function renderInline(nodes: Inline[], keyPrefix: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (n.t) {
      case "text":
        return <span key={key}>{n.v}</span>;
      case "b":
        return (
          <strong key={key} className="font-semibold text-secondary">
            {n.v}
          </strong>
        );
      case "i":
        return (
          <em key={key} className="italic">
            {n.v}
          </em>
        );
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-secondary"
          >
            {n.v}
          </code>
        );
      case "a":
        return (
          <a
            key={key}
            href={n.href}
            target={n.external ? "_blank" : undefined}
            rel={n.external ? "noopener noreferrer" : undefined}
            className="text-primary underline underline-offset-2 hover:text-primary-dark"
          >
            {n.text}
          </a>
        );
      case "img":
        return <InlineFigure key={key} src={n.src} alt={n.alt} wide={n.wide} />;
    }
  });
}

function InlineFigure({ src, alt, wide }: { src: string; alt: string; wide: boolean }) {
  return (
    <span className={wide ? "my-8 block -mx-4 sm:-mx-8" : "my-6 block"}>
      <span className="relative block aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={wide ? "100vw" : "(max-width: 768px) 100vw, 720px"}
          className="object-cover"
        />
      </span>
    </span>
  );
}

function renderBlock(b: Block, idx: number): ReactNode {
  const key = `b-${idx}`;
  switch (b.t) {
    case "h": {
      const cls =
        b.level === 2
          ? "mt-10 mb-4 scroll-mt-28 text-2xl font-bold text-secondary"
          : b.level === 3
            ? "mt-8 mb-3 scroll-mt-28 text-lg font-bold text-secondary"
            : "mt-6 mb-2 scroll-mt-28 text-base font-bold text-secondary";
      const content = renderInline(b.inline, key);
      if (b.level === 2) return <h2 key={key} id={b.id} className={cls}>{content}</h2>;
      if (b.level === 3) return <h3 key={key} id={b.id} className={cls}>{content}</h3>;
      return <h4 key={key} id={b.id} className={cls}>{content}</h4>;
    }
    case "p":
      return (
        <p key={key} className="my-4 text-base leading-relaxed text-slate-700">
          {renderInline(b.inline, key)}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="my-5 flex flex-col gap-2 pl-1">
          {b.items.map((item, j) => (
            <li key={j} className="flex gap-3 text-base leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{renderInline(item, `${key}-${j}`)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="my-5 flex list-decimal flex-col gap-2 pl-6">
          {b.items.map((item, j) => (
            <li key={j} className="text-base leading-relaxed text-slate-700 marker:font-semibold marker:text-primary">
              {renderInline(item, `${key}-${j}`)}
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote
          key={key}
          className="my-6 border-l-4 border-primary bg-surface py-3 pl-5 pr-4 italic text-slate-600"
        >
          {renderInline(b.inline, key)}
        </blockquote>
      );
    case "code":
      return <CodeBlock key={key} code={b.code} lang={b.lang} />;
    case "hr":
      return <hr key={key} className="my-8 border-slate-200" />;
    case "img":
      return <InlineFigure key={key} src={b.src} alt={b.alt} wide={b.wide} />;
  }
}

export function Markdown({ content }: { content: string }) {
  const blocks = parseMarkdown(content);
  return (
    <div className="break-words [overflow-wrap:anywhere]">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}
