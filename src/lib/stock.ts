import "server-only";
import { revalidateTag } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import type {
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import {
  aggregateReservationLines,
  planStockDecrement,
  planStockIncrement,
  type StockReservationLine,
} from "@/lib/stock-pure";

/**
 * Reservasi & pelepasan STOK NYATA (Sprint 2 / O-01) — server-only.
 *
 * **Kenapa:** `evaluatePurchase` hanya MEMERIKSA stok saat checkout; tanpa
 * pengurangan atomik, dua pembeli bisa membeli unit terakhir bersamaan
 * (overselling). Di sini stok `product.stock` / `variant.stock` DIKURANGI di
 * dalam transaksi Firestore saat order dibuat, lalu DIKEMBALIKAN saat order
 * dibatalkan/kedaluwarsa/dihapus.
 *
 * **Idempotensi:** daftar persis yang dikurangi (`StockReservationLine[]`)
 * disimpan pada order. Pelepasan memakai daftar itu + penanda
 * `stockReleasedAtISO`, sehingga tidak pernah mengembalikan stok yang tak
 * pernah dikurangi atau mengembalikannya dua kali.
 */

const PRODUCTS = "products";

/** Kegagalan reservasi yang harus disampaikan ke pembeli. */
export type ReserveStockFailure = {
  ok: false;
  code: "product_not_found" | "insufficient_stock" | "out_of_stock";
  message: string;
  slug: string;
  variantSlug?: string;
};

export type ReserveStockResult =
  | { ok: true; reservation: StockReservationLine[] }
  | ReserveStockFailure;

/** Sinyal internal untuk membatalkan transaksi dengan hasil terstruktur. */
class StockReserveError extends Error {
  constructor(readonly failure: ReserveStockFailure) {
    super(failure.message);
    this.name = "StockReserveError";
  }
}

/** Perubahan stok yang akan ditulis untuk SATU dokumen produk. */
type StockWrite = {
  ref: DocumentReference;
  hasVariants: boolean;
  nextVariants?: unknown[];
  nextStock?: number;
};

/** Ambil dokumen produk sekali (id dokumen = slug, fallback field `slug`). */
async function readProductSnapshot(
  tx: Transaction,
  slug: string,
): Promise<DocumentSnapshot | null> {
  const db = getAdminDb();
  if (!db) return null;
  const col = db.collection(PRODUCTS);
  const byId = await tx.get(col.doc(slug));
  if (byId.exists) return byId;
  const bySlug = await tx.get(col.where("slug", "==", slug));
  return bySlug.empty ? null : bySlug.docs[0];
}

function variantObjects(raw: unknown): unknown[] {
  return Array.isArray(raw)
    ? raw.map((v) => (v && typeof v === "object" ? { ...(v as Record<string, unknown>) } : v))
    : [];
}

function variantSlugOf(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const slug = (value as Record<string, unknown>).slug;
  return typeof slug === "string" ? slug : undefined;
}

function stockOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const stock = (value as Record<string, unknown>).stock;
  return typeof stock === "number" && Number.isFinite(stock) ? stock : undefined;
}

/**
 * Rencanakan pengurangan stok untuk satu produk (semua baris yang menunjuk
 * produk itu). Melempar `StockReserveError` bila stok tidak cukup.
 */
function planReserveForProduct(
  doc: DocumentSnapshot,
  lines: readonly StockReservationLine[],
): { write: StockWrite | null; applied: StockReservationLine[] } {
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  const productName = typeof data.name === "string" && data.name ? data.name : lines[0].slug;
  const rawVariants = Array.isArray(data.variants) ? data.variants : [];

  const applied: StockReservationLine[] = [];

  if (rawVariants.length > 0) {
    const nextVariants = variantObjects(data.variants);
    for (const line of lines) {
      if (!line.variantSlug) continue;
      const idx = nextVariants.findIndex(
        (v) => variantSlugOf(v) === line.variantSlug,
      );
      if (idx < 0) continue; // varian tak ditemukan → biarkan (dicek lapisan lain)
      const current = nextVariants[idx];
      const plan = planStockDecrement(stockOf(current), line.qty);
      if (plan.kind === "insufficient") {
        const variantName =
          current && typeof current === "object"
            ? String((current as Record<string, unknown>).name ?? line.variantSlug)
            : line.variantSlug;
        throw new StockReserveError(failureFor(line, plan.left, `${productName} — ${variantName}`));
      }
      if (plan.kind === "unlimited") continue;
      nextVariants[idx] = { ...(current as Record<string, unknown>), stock: plan.next };
      applied.push(line);
    }
    if (applied.length === 0) return { write: null, applied };
    return {
      write: { ref: doc.ref, hasVariants: true, nextVariants },
      applied,
    };
  }

  // Produk tunggal — agregasi menjamin paling banyak satu baris per slug.
  for (const line of lines) {
    if (line.variantSlug) continue;
    const plan = planStockDecrement(stockOf(data), line.qty);
    if (plan.kind === "insufficient") {
      throw new StockReserveError(failureFor(line, plan.left, productName));
    }
    if (plan.kind === "unlimited") continue;
    applied.push(line);
    return {
      write: { ref: doc.ref, hasVariants: false, nextStock: plan.next },
      applied,
    };
  }
  return { write: null, applied };
}

function failureFor(
  line: StockReservationLine,
  left: number,
  label: string,
): ReserveStockFailure {
  if (left <= 0) {
    return {
      ok: false,
      code: "out_of_stock",
      message: `Stok "${label}" sudah habis.`,
      slug: line.slug,
      variantSlug: line.variantSlug,
    };
  }
  return {
    ok: false,
    code: "insufficient_stock",
    message: `Stok "${label}" tersisa ${left}. Silakan kurangi jumlah.`,
    slug: line.slug,
    variantSlug: line.variantSlug,
  };
}

function applyStockWrites(tx: Transaction, writes: readonly StockWrite[]): void {
  for (const write of writes) {
    if (write.hasVariants && write.nextVariants) {
      tx.update(write.ref, { variants: write.nextVariants });
    } else if (!write.hasVariants && write.nextStock !== undefined) {
      tx.update(write.ref, { stock: write.nextStock });
    }
  }
}

/** Invalidasi cache katalog (best-effort; jangan menggagalkan alur stok). */
export function invalidateProductStockCache(): void {
  try {
    revalidateTag(CACHE_TAGS.products, REVALIDATE_NOW);
  } catch (err) {
    console.warn("[stock] gagal invalidasi cache produk:", err);
  }
}

/**
 * MENGURANGI stok secara ATOMIK untuk sekumpulan baris keranjang.
 *
 * - Agregasi baris (produk + varian) lalu baca semua produk dalam SATU transaksi
 *   (semua baca sebelum tulis) → bebas balapan.
 * - Stok tak diisi (`undefined`) → tak dibatasi, tidak direservasi.
 * - Bila ada yang tidak cukup → transaksi dibatalkan, `{ ok: false, code }`.
 * - Mengembalikan daftar PERSIS yang dikurangi untuk disimpan di order.
 */
export async function reserveStock(
  lines: readonly { slug: string; variantSlug?: string; qty: number }[],
): Promise<ReserveStockResult> {
  const aggregated = aggregateReservationLines(lines);
  if (aggregated.length === 0) return { ok: true, reservation: [] };

  const db = getAdminDb();
  if (!db) return { ok: true, reservation: [] }; // tanpa DB: jangan blokir checkout

  try {
    const reservation = await db.runTransaction(async (tx) => {
      // Kelompokkan baris per produk agar satu dokumen dibaca & ditulis sekali.
      const bySlug = new Map<string, StockReservationLine[]>();
      for (const line of aggregated) {
        const bucket = bySlug.get(line.slug);
        if (bucket) bucket.push(line);
        else bySlug.set(line.slug, [line]);
      }

      // FASE BACA.
      const snapshots = new Map<string, DocumentSnapshot | null>();
      for (const slug of bySlug.keys()) {
        snapshots.set(slug, await readProductSnapshot(tx, slug));
      }

      // FASE HITUNG (tanpa I/O).
      const writes: StockWrite[] = [];
      const applied: StockReservationLine[] = [];
      for (const [slug, slugLines] of bySlug) {
        const doc = snapshots.get(slug);
        if (!doc) continue; // produk terhapus → tak ada batas yang bisa direservasi
        const { write, applied: rows } = planReserveForProduct(doc, slugLines);
        if (write) writes.push(write);
        applied.push(...rows);
      }

      // FASE TULIS.
      applyStockWrites(tx, writes);
      return applied;
    });

    invalidateProductStockCache();
    return { ok: true, reservation };
  } catch (err) {
    if (err instanceof StockReserveError) return err.failure;
    throw err;
  }
}

/** Bangun perubahan penambahan stok (dipakai oleh pelepasan). */
function planReleaseForProducts(
  snapshots: Map<string, DocumentSnapshot | null>,
  bySlug: Map<string, StockReservationLine[]>,
): StockWrite[] {
  const writes: StockWrite[] = [];
  for (const [slug, lines] of bySlug) {
    const doc = snapshots.get(slug);
    if (!doc) continue;
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const rawVariants = Array.isArray(data.variants) ? data.variants : [];

    if (rawVariants.length > 0) {
      const nextVariants = variantObjects(data.variants);
      let touched = false;
      for (const line of lines) {
        if (!line.variantSlug) continue;
        const idx = nextVariants.findIndex(
          (v) => variantSlugOf(v) === line.variantSlug,
        );
        if (idx < 0) continue;
        const current = nextVariants[idx];
        const next = planStockIncrement(stockOf(current), line.qty);
        if (next === undefined) continue;
        nextVariants[idx] = { ...(current as Record<string, unknown>), stock: next };
        touched = true;
      }
      if (touched) writes.push({ ref: doc.ref, hasVariants: true, nextVariants });
      continue;
    }

    const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
    const next = planStockIncrement(stockOf(data), totalQty);
    if (next !== undefined) {
      writes.push({ ref: doc.ref, hasVariants: false, nextStock: next });
    }
  }
  return writes;
}

function groupBySlug(
  lines: readonly StockReservationLine[],
): Map<string, StockReservationLine[]> {
  const bySlug = new Map<string, StockReservationLine[]>();
  for (const line of lines) {
    const bucket = bySlug.get(line.slug);
    if (bucket) bucket.push(line);
    else bySlug.set(line.slug, [line]);
  }
  return bySlug;
}

/**
 * FASE BACA pelepasan stok untuk dipakai di dalam transaksi pemanggil.
 *
 * Dipisah dari penulisan karena transaksi Firestore mewajibkan SEMUA baca
 * sebelum tulis — pemanggil (mis. `deleteOrder`) perlu membaca kupon lebih dulu.
 * Pakai `applyStockRelease(tx, targets)` untuk menulis di akhir.
 */
export async function readStockRelease(
  tx: Transaction,
  reservation: readonly StockReservationLine[],
): Promise<StockWrite[]> {
  const lines = aggregateReservationLines(reservation);
  if (lines.length === 0) return [];
  const bySlug = groupBySlug(lines);
  const snapshots = new Map<string, DocumentSnapshot | null>();
  for (const slug of bySlug.keys()) {
    snapshots.set(slug, await readProductSnapshot(tx, slug));
  }
  return planReleaseForProducts(snapshots, bySlug);
}

/** FASE TULIS pelepasan stok (lihat `readStockRelease`). */
export function applyStockRelease(
  tx: Transaction,
  writes: readonly StockWrite[],
): void {
  applyStockWrites(tx, writes);
}

/**
 * Melepas reservasi stok di dalam transaksi PEMANGGIL yang sudah memiliki
 * urutan baca→tulis bersih (mis. `updateOrderStatus`, `markOrderExpired`).
 */
export async function releaseStockInTransaction(
  tx: Transaction,
  reservation: readonly StockReservationLine[],
): Promise<void> {
  const writes = await readStockRelease(tx, reservation);
  applyStockRelease(tx, writes);
}

/**
 * Melepas reservasi stok dalam transaksi SENDIRI (best-effort).
 *
 * Dipakai saat order GAGAL dibuat (rollback checkout): daftar reservasi hanya
 * ada di memori. Kegagalan dicatat, tidak melempar (agar tidak menutupi error
 * asli checkout).
 */
export async function releaseStock(
  reservation: readonly StockReservationLine[],
): Promise<void> {
  const lines = aggregateReservationLines(reservation);
  if (lines.length === 0) return;
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.runTransaction(async (tx) => {
      await releaseStockInTransaction(tx, lines);
    });
    invalidateProductStockCache();
  } catch (err) {
    console.error("[stock] gagal melepas reservasi stok:", err);
  }
}
