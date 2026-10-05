"use client";

import { cn } from "@/lib/utils";

/** Kunci tab portal akun. */
export const ACCOUNT_TABS = [
  "ringkasan",
  "pesanan",
  "poin",
  "favorit",
  "alamat",
  "profil",
] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export const ACCOUNT_TAB_LABEL: Record<AccountTab, string> = {
  ringkasan: "Ringkasan",
  pesanan: "Pesanan",
  poin: "Poin",
  favorit: "Favorit",
  alamat: "Alamat",
  profil: "Profil",
};

/**
 * Bilah tab portal akun (aksesibel: role="tablist" + aria-selected).
 * Responsif: bisa digeser horizontal di layar sempit.
 */
export function AccountTabs({
  active,
  onChange,
  badges,
}: {
  active: AccountTab;
  onChange: (tab: AccountTab) => void;
  /** Angka kecil (mis. jumlah pesanan/favorit) opsional per tab. */
  badges?: Partial<Record<AccountTab, number>>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Navigasi akun"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px"
    >
      {ACCOUNT_TABS.map((tab) => {
        const isActive = tab === active;
        const count = badges?.[tab];
        return (
          <button
            key={tab}
            role="tab"
            id={`tab-${tab}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab}`}
            onClick={() => onChange(tab)}
            className={cn(
              "relative shrink-0 rounded-t-xl px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
              isActive
                ? "text-primary"
                : "text-slate-500 hover:text-secondary",
            )}
          >
            {ACCOUNT_TAB_LABEL[tab]}
            {typeof count === "number" && count > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  isActive
                    ? "bg-primary-50 text-primary"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {count}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
