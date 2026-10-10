"use client";

import { useState } from "react";
import {
  Loader2,
  Trash2,
  Download,
  X,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-types";
import { cn } from "@/lib/utils";

export type BulkAction =
  | { action: "status"; status: OrderStatus }
  | { action: "delete" }
  | { action: "export" }
  | { action: "resend" };

/**
 * Bilah aksi massal (FASE O4) — pola `media-bulk-bar`. Muncul saat ada pesanan
 * terpilih. Aksi destruktif dikonfirmasi oleh pemanggil.
 */
export function OrdersBulkBar({
  count,
  busy,
  onClear,
  onAction,
}: {
  count: number;
  busy: boolean;
  onClear: () => void;
  onAction: (action: BulkAction) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[11500] flex justify-center px-4">
      <div
        role="toolbar"
        aria-label="Aksi massal pesanan"
        className="pointer-events-auto flex max-w-[95vw] flex-wrap items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur"
      >
        <span className="px-2.5 text-sm font-semibold text-secondary">
          {count} dipilih
        </span>
        <span className="mx-1 h-6 w-px bg-slate-200" />

        <div className="relative">
          <BulkButton
            icon={<RefreshCw className="h-4 w-4" />}
            label="Ubah status"
            busy={busy}
            iconRight={
              <ChevronUp
                className={cn("h-3.5 w-3.5 transition-transform", statusOpen && "rotate-180")}
              />
            }
            onClick={() => setStatusOpen((v) => !v)}
          />
          {statusOpen && (
            <div className="absolute bottom-12 left-1/2 max-h-64 w-48 -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusOpen(false);
                    onAction({ action: "status", status: s });
                  }}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-secondary"
                >
                  {ORDER_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        <BulkButton
          icon={<Download className="h-4 w-4" />}
          label="Ekspor terpilih"
          busy={busy}
          onClick={() => onAction({ action: "export" })}
        />

        <BulkButton
          icon={<RefreshCw className="h-4 w-4" />}
          label="Kirim ulang email"
          busy={busy}
          onClick={() => onAction({ action: "resend" })}
        />

        <BulkButton
          icon={<Trash2 className="h-4 w-4" />}
          label="Hapus"
          tone="danger"
          busy={busy}
          onClick={() => onAction({ action: "delete" })}
        />

        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          type="button"
          onClick={onClear}
          aria-label="Batalkan pilihan"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-surface hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BulkButton({
  icon,
  iconRight,
  label,
  onClick,
  busy,
  tone = "default",
}: {
  icon: React.ReactNode;
  iconRight?: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-600 hover:bg-surface hover:text-secondary",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
      {iconRight}
    </button>
  );
}