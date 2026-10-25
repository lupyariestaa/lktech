import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("product covers and gallery images preserve the full source image", () => {
  const productCard = read("../src/components/product-card.tsx");
  const mediaGallery = read("../src/components/media-gallery.tsx");
  const lightbox = read("../src/components/media-lightbox.tsx");
  const wishlist = read("../src/components/auth/account-wishlist.tsx");
  const crossSell = read("../src/components/cart-cross-sell.tsx");

  assert.match(productCard, /className="object-contain transition-transform duration-500"/);
  assert.match(mediaGallery, /className="object-contain"/);
  assert.match(mediaGallery, /sizes="112px" className="object-contain"/);
  assert.match(lightbox, /className="object-contain"/);
  assert.match(lightbox, /sizes="80px" className="object-contain"/);
  assert.match(wishlist, /className="object-contain transition-transform duration-500"/);
  assert.match(crossSell, /h-full w-full object-contain/);
});

test("product image ratio helper accurately explains frame and optional crop", () => {
  const manager = read("../src/components/admin/products-manager.tsx");

  assert.match(manager, /mengatur bingkai cover dan galeri/);
  assert.match(manager, /ditampilkan utuh \(tanpa crop otomatis\)/);
  assert.match(manager, /ruang kosong dapat terlihat/);
  assert.match(manager, /versi crop/);
});
