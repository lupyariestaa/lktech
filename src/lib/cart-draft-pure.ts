/**
 * Tipe & logika MURNI draft keranjang server-side (FASE P5).
 * Bebas impor runtime (hanya `import type`) agar dapat diuji Node tanpa alias.
 */

/** Satu item ringkas draft keranjang (cukup untuk direhidrasi & email). */
export type CartDraftItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  variantSlug?: string;
};

/** Draft keranjang tersimpan di Firestore `carts/{uid}`. */
export type CartDraft = {
  uid: string;
  email: string;
  displayName?: string;
  items: CartDraftItem[];
  subtotal: number;
  createdAtISO: string;
  updatedAtISO: string;
  /** Kapan pengingat terakhir dikirim (ISO) — kosong bila belum. */
  remindedAtISO?: string;
  /** Draft dinyatakan pulih (checkout berhasil) pada (ISO). */
  recoveredAtISO?: string;
  /** User berhenti diingatkan (opt-out). */
  optedOut?: boolean;
};

/** Berapa jam minimal sebuah draft "terbengkalai" sebelum diingatkan (H+1). */
export const DEFAULT_REMIND_AFTER_HOURS = 24;
/** Jangan mengingatkan draft yang sudah terlalu lama (hindari spam). */
export const DEFAULT_REMIND_MAX_AGE_DAYS = 14;

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Normalisasi item draft (buang yang tak valid). */
export function normalizeCartDraftItems(v: unknown): CartDraftItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => {
      const slug = typeof x.slug === "string" ? x.slug.trim() : "";
      return {
        slug,
        name: typeof x.name === "string" ? x.name.trim() : "",
        price: num(x.price),
        qty: Math.max(1, Math.floor(num(x.qty, 1))),
        variantSlug:
          typeof x.variantSlug === "string" && x.variantSlug.trim()
            ? x.variantSlug.trim()
            : undefined,
      } satisfies CartDraftItem;
    })
    .filter((it) => it.slug && it.qty > 0);
}

/**
 * Apakah sebuah draft layak diingatkan pada waktu `now`:
 * - punya item, belum pulih, belum opt-out, sudah lewat `afterHours`,
 *   belum terlalu tua (`maxAgeDays`), dan belum diingatkan dalam 24 jam terakhir.
 *
 * Murni (tanpa I/O) — dipakai cron & teruji.
 */
export function shouldRemind(
  draft: Pick<
    CartDraft,
    "items" | "updatedAtISO" | "remindedAtISO" | "recoveredAtISO" | "optedOut"
  >,
  now: Date = new Date(),
  opts: {
    afterHours?: number;
    maxAgeDays?: number;
    remindCooldownHours?: number;
  } = {},
): boolean {
  const afterHours = opts.afterHours ?? DEFAULT_REMIND_AFTER_HOURS;
  const maxAgeDays = opts.maxAgeDays ?? DEFAULT_REMIND_MAX_AGE_DAYS;
  const cooldown = opts.remindCooldownHours ?? 24;

  if (!draft.items || draft.items.length === 0) return false;
  if (draft.recoveredAtISO || draft.optedOut) return false;

  const updated = new Date(draft.updatedAtISO).getTime();
  if (!Number.isFinite(updated)) return false;
  const ageMs = now.getTime() - updated;

  if (ageMs < afterHours * 3_600_000) return false;
  if (ageMs > maxAgeDays * 86_400_000) return false;

  if (draft.remindedAtISO) {
    const reminded = new Date(draft.remindedAtISO).getTime();
    if (Number.isFinite(reminded) && now.getTime() - reminded < cooldown * 3_600_000) {
      return false;
    }
  }
  return true;
}
