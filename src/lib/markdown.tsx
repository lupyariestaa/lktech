import type { ReactNode } from "react";

/**
 * Renderer Markdown minimal (tanpa dependency eksternal & tanpa innerHTML).
 * Mendukung: heading (#..###), paragraf, daftar (- / *), tebal (**), miring (*),
 * tautan ([teks](url)), dan garis pemisah (---).
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Pola: **bold**, *italic*, [text](url)
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-secondary">
          {match[2]}
        </strong>,
      );
    } else if (match[4]) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {match[4]}
        </em>,
      );
    } else if (match[6] && match[7]) {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${i}`}
          href={match[7]}
          className="text-primary underline underline-offset-2 hover:text-primary-dark"
        >
          {match[6]}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
    i += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = [...listBuffer];
    listBuffer = [];
    blocks.push(
      <ul key={`ul-${key++}`} className="my-5 flex flex-col gap-2 pl-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-3 text-base leading-relaxed text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{renderInline(item, `li-${key}-${idx}`)}</span>
          </li>
        ))}
      </ul>,
    );
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${key++}`} className="mt-8 mb-3 text-lg font-bold text-secondary">
          {renderInline(line.slice(4), `h3-${key}`)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={`h2-${key++}`} className="mt-10 mb-4 text-2xl font-bold text-secondary">
          {renderInline(line.slice(3), `h2-${key}`)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h2 key={`h1-${key++}`} className="mt-10 mb-4 text-2xl font-bold text-secondary">
          {renderInline(line.slice(2), `h1-${key}`)}
        </h2>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === "---") {
      flushList();
      blocks.push(
        <hr key={`hr-${key++}`} className="my-8 border-slate-200" />,
      );
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className="my-4 text-base leading-relaxed text-slate-700">
          {renderInline(line, `p-${key}`)}
        </p>,
      );
    }
  }
  flushList();

  return <div>{blocks}</div>;
}
