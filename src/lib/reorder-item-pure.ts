import type { CartItem } from "./cart";
import type { OrderItem } from "./order-types";
import type { CurrentProduct } from "./order-api";

export type ReorderItemResult =
  | { ok: true; item: CartItem }
  | { ok: false; reason: "unavailable" | "variant_required" | "variant_unavailable" | "print_config_changed" | "invalid_print_options" | "insufficient_stock" };

/**
 * Resolve one historical order item against current product data.
 * Never silently replaces a print variant or drops print specifications.
 */
export function resolveReorderItem(
  orderItem: OrderItem,
  current: CurrentProduct | undefined,
  calculatePrice: (
    pricing: NonNullable<NonNullable<CurrentProduct["variants"]>[number]["printPricing"]>,
    config: NonNullable<CurrentProduct["printConfig"]>,
    dimensions: { widthM?: number; heightM?: number },
  ) => number | null,
): ReorderItemResult {
  if (!current?.exists || current.active === false || current.soldOut) {
    return { ok: false, reason: "unavailable" };
  }
  if (!orderItem.qty || !Number.isSafeInteger(orderItem.qty) || orderItem.qty < 1) {
    return { ok: false, reason: "unavailable" };
  }
  if (current.variants?.length && !orderItem.variantSlug) {
    return { ok: false, reason: "variant_required" };
  }

  const variant = orderItem.variantSlug
    ? current.variants?.find((item) => item.slug === orderItem.variantSlug) ??
      (current.variant?.slug === orderItem.variantSlug ? current.variant : undefined)
    : undefined;

  if (orderItem.variantSlug && !variant) {
    return { ok: false, reason: "variant_unavailable" };
  }
  if (variant?.soldOut) return { ok: false, reason: "unavailable" };

  const stock = variant?.stock ?? (orderItem.variantSlug ? null : current.stock);
  if (typeof stock === "number" && stock < orderItem.qty) {
    return { ok: false, reason: "insufficient_stock" };
  }

  const isPrintOrder = Boolean(orderItem.printOptions || orderItem.printPricing);
  if (isPrintOrder) {
    if (current.category !== "percetakan" || !orderItem.printOptions) {
      return { ok: false, reason: "invalid_print_options" };
    }
    if (!current.printConfig || !variant?.printPricing) {
      return { ok: false, reason: "print_config_changed" };
    }

    const { finishingIds, widthM, heightM } = orderItem.printOptions;
    if (
      new Set(finishingIds).size !== finishingIds.length ||
      finishingIds.some((id) => !current.printConfig!.finishingOptions.some((option) => option.id === id))
    ) {
      return { ok: false, reason: "print_config_changed" };
    }

    const price = calculatePrice(variant.printPricing, current.printConfig, {
      ...(widthM !== undefined ? { widthM } : {}),
      ...(heightM !== undefined ? { heightM } : {}),
    });
    if (price === null || !Number.isSafeInteger(price * orderItem.qty)) {
      return { ok: false, reason: "invalid_print_options" };
    }

    return {
      ok: true,
      item: {
        slug: orderItem.slug,
        name: `${current.name ?? orderItem.name.split(" — ")[0]} — ${variant.name}`,
        price,
        cover: "default",
        qty: orderItem.qty,
        variantSlug: variant.slug,
        variantName: variant.name,
        printOptions: orderItem.printOptions,
        printPricing: variant.printPricing,
      },
    };
  }

  const price = variant?.price ?? current.price;
  if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(price * orderItem.qty)) {
    return { ok: false, reason: "unavailable" };
  }

  return {
    ok: true,
    item: {
      slug: orderItem.slug,
      name: variant ? `${current.name ?? orderItem.name.split(" — ")[0]} — ${variant.name}` : current.name ?? orderItem.name,
      price,
      cover: "default",
      qty: orderItem.qty,
      ...(variant ? { variantSlug: variant.slug, variantName: variant.name } : {}),
    },
  };
}
