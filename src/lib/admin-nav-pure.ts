/**
 * Logika MURNI navigasi admin (bebas impor React/lucide) — dapat diuji Node.
 *
 * `admin-nav.ts` (yang membawa ikon) memakai fungsi-fungsi ini. Dipisah agar
 * logika pencocokan rute & anak dapat diuji tanpa merender komponen.
 */

export type NavChildLike = { label: string; title: string; href: string };
export type NavItemLike = { label: string; title: string; href: string; children?: NavChildLike[] };

/** Filter item yang ditandai `ownerOnly` berdasarkan role 2 tingkat. */
export function canViewOwnerOnly(
  item: { ownerOnly?: boolean },
  isOwner: boolean,
): boolean {
  return !item.ownerOnly || isOwner;
}

/** Item aktif bila pathname sama persis ATAU prefix path anaknya. */
export function isNavActive(href: string, pathname: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Anak yang cocok dengan pathname (prefix terpanjang menang). */
export function matchNavChild<T extends NavChildLike>(
  items: readonly NavItemLike[],
  pathname: string,
): T | null {
  const children = items.flatMap((i) => i.children ?? []);
  const found = [...children]
    .sort((a, b) => b.href.length - a.href.length)
    .find((c) => isNavActive(c.href, pathname));
  return (found as T | undefined) ?? null;
}

/** Item induk yang cocok (anak → induk; atau prefix terpanjang). */
export function matchNavItem<T extends NavItemLike>(
  items: readonly T[],
  pathname: string,
): T | null {
  const child = matchNavChild(items, pathname);
  if (child) {
    const parent = items.find((i) => (i.children ?? []).some((c) => c.href === child.href));
    if (parent) return parent;
  }
  return (
    [...items].sort((a, b) => b.href.length - a.href.length).find((n) => isNavActive(n.href, pathname)) ??
    null
  );
}

/** Judul (title) untuk pathname — pakai child bila ada. */
export function titleForNavPath(items: readonly NavItemLike[], pathname: string): string | null {
  const child = matchNavChild(items, pathname);
  if (child) return child.title;
  return matchNavItem(items, pathname)?.title ?? null;
}

/** Seluruh id induk yang punya anak aktif (untuk auto-buka accordion). */
export function parentsToExpand(items: readonly NavItemLike[], pathname: string): string[] {
  return items
    .filter((i) => (i.children ?? []).some((c) => isNavActive(c.href, pathname)))
    .map((i) => i.href);
}
