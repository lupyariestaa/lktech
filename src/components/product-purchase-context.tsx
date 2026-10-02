"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PurchaseContextValue = {
  /** Slug varian yang dipilih (null bila belum dipilih). */
  selectedVariantSlug: string | null;
  selectVariant: (slug: string | null) => void;
};

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

/**
 * State pemilihan paket, dibagikan antara kartu paket (section #paket) dan
 * panel pembelian di sidebar. Tanpa ini, dua blok terpisah di layout tidak bisa
 * berbagi satu pilihan "paket terpilih".
 */
export function ProductPurchaseProvider({ children }: { children: ReactNode }) {
  const [selectedVariantSlug, setSelected] = useState<string | null>(null);

  const selectVariant = useCallback((slug: string | null) => {
    setSelected(slug);
  }, []);

  const value = useMemo<PurchaseContextValue>(
    () => ({ selectedVariantSlug, selectVariant }),
    [selectedVariantSlug, selectVariant],
  );

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

/**
 * Akses state pemilihan paket. Aman dipakai walau tanpa Provider (fallback
 * no-op) — mis. bila komponen dipakai di konteks lain.
 */
export function useProductPurchase(): PurchaseContextValue {
  const ctx = useContext(PurchaseContext);
  return (
    ctx ?? {
      selectedVariantSlug: null,
      selectVariant: () => {},
    }
  );
}
