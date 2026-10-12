import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isNavActive,
  matchNavItem,
  matchNavChild,
  titleForNavPath,
  parentsToExpand,
  type NavItemLike,
} from "../src/lib/admin-nav-pure.ts";

/**
 * Uji logika murni navigasi admin (submenu/accordion — fase S1).
 * Jalankan: `npm run test:nav`
 */

const ITEMS: NavItemLike[] = [
  { label: "Ringkasan", title: "Ringkasan", href: "/admin" },
  { label: "Pesanan", title: "Pesanan", href: "/admin/orders" },
  {
    label: "Pengaturan",
    title: "Pengaturan",
    href: "/admin/settings",
    children: [
      { label: "Ringkasan", title: "Ringkasan Pengaturan", href: "/admin/settings" },
      { label: "Kontak & Identitas", title: "Kontak & Identitas", href: "/admin/settings/kontak" },
      { label: "Keamanan & Akses", title: "Keamanan & Akses", href: "/admin/settings/keamanan" },
    ],
  },
];

test("isNavActive: /admin hanya cocok persis", () => {
  assert.equal(isNavActive("/admin", "/admin"), true);
  assert.equal(isNavActive("/admin", "/admin/orders"), false);
});

test("isNavActive: prefix anak cocok", () => {
  assert.equal(isNavActive("/admin/settings", "/admin/settings/kontak"), true);
  assert.equal(isNavActive("/admin/orders", "/admin/orders/abc"), true);
  assert.equal(isNavActive("/admin/orders", "/admin/order"), false);
});

test("matchNavItem: cocokkan induk dari anak", () => {
  assert.equal(matchNavItem(ITEMS, "/admin/settings/kontak")?.href, "/admin/settings");
  assert.equal(matchNavItem(ITEMS, "/admin/settings/keamanan")?.href, "/admin/settings");
});

test("matchNavChild: prefix terpanjang menang (anak, bukan induk)", () => {
  const child = matchNavChild(ITEMS, "/admin/settings/kontak");
  assert.equal(child?.href, "/admin/settings/kontak");
});

test("titleForNavPath: pakai title anak bila ada", () => {
  assert.equal(titleForNavPath(ITEMS, "/admin/settings/kontak"), "Kontak & Identitas");
  assert.equal(titleForNavPath(ITEMS, "/admin/settings"), "Ringkasan Pengaturan");
  assert.equal(titleForNavPath(ITEMS, "/admin/orders"), "Pesanan");
  assert.equal(titleForNavPath(ITEMS, "/admin"), "Ringkasan");
});

test("titleForNavPath: tak dikenal → null", () => {
  assert.equal(titleForNavPath(ITEMS, "/admin/ngawur"), null);
});

test("parentsToExpand: induk yang punya anak aktif", () => {
  assert.deepEqual(parentsToExpand(ITEMS, "/admin/settings/kontak"), ["/admin/settings"]);
  assert.deepEqual(parentsToExpand(ITEMS, "/admin/orders"), []);
});

test("matchNavItem: item tanpa children tetap cocok", () => {
  assert.equal(matchNavItem(ITEMS, "/admin/orders/abc")?.href, "/admin/orders");
});
