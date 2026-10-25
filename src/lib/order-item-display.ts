import type { OrderItem } from "./order-types";

export function normalizePrintFinishing(value: unknown): Array<{ id: string; name: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      name: typeof entry.name === "string" ? entry.name : "",
    }))
    .filter((entry) => entry.id && entry.name);
  return normalized.length ? normalized : undefined;
}

/** Human-readable print details derived from immutable order snapshots. */
export function printSpecificationLines(item: Pick<OrderItem, "printOptions" | "printPricing" | "printFinishing" | "variantName">): string[] {
  if (!item.printOptions && !item.printPricing) return [];

  const lines: string[] = [];
  if (item.printOptions?.widthM !== undefined && item.printOptions.heightM !== undefined) {
    lines.push(`Ukuran: ${item.printOptions.widthM} × ${item.printOptions.heightM} m`);
  } else if (item.printPricing?.method === "sheet") {
    lines.push(`Format: ${item.printPricing.description || "Per lembar"}`);
  }

  const names = item.printFinishing?.length
    ? item.printFinishing.map((option) => option.name)
    : item.printOptions?.finishingIds ?? [];
  if (names.length) lines.push(`Finishing: ${names.join(", ")}`);

  if (item.variantName) lines.push(`Bahan/varian: ${item.variantName}`);
  return lines;
}
