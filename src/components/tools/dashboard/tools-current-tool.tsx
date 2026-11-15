import { ToolIcon } from "@/components/tools/tool-icon";
import {
  TOOL_CATEGORY_LABEL,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";

/** Kartu konteks tool yang sedang dibuka (bukan link duplikat). */
export function ToolsCurrentTool({ tool }: { tool: ToolDefinition }) {
  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-3">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
          <ToolIcon name={tool.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-secondary">
            {tool.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {TOOL_CATEGORY_LABEL[tool.category]}
          </p>
        </div>
      </div>
    </div>
  );
}
