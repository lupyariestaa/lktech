import { test, expect } from "@playwright/test";

/**
 * Smoke E2E halaman publik (FASE P3, B5).
 *
 * Tujuan: jamin build produksi benar-benar menyajikan halaman kunci tanpa error
 * server (500) & HTML dasar waras. BUKAN uji fungsional ber-kredensial.
 */

const PUBLIC_PAGES: Array<{ path: string; expectText: RegExp }> = [
  { path: "/", expectText: /LKTech|Layanan|Produk/i },
  { path: "/produk", expectText: /produk/i },
  { path: "/harga", expectText: /harga|paket/i },
  { path: "/layanan", expectText: /layanan/i },
  { path: "/portofolio", expectText: /portofolio|proyek/i },
  { path: "/blog", expectText: /blog|artikel/i },
  { path: "/tentang", expectText: /tentang|LKTech/i },
  { path: "/kontak", expectText: /kontak|hubungi/i },
  { path: "/promo", expectText: /promo|kupon/i },
  { path: "/masuk", expectText: /masuk|login/i },
  { path: "/tools", expectText: /tool|browser/i },
];

test.describe("halaman publik", () => {
  for (const { path, expectText } of PUBLIC_PAGES) {
    test(`GET ${path} → 200 + konten`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `${path} harus 200`).toBeLessThan(400);

      // `lang="id"` (aksesibilitas & SEO).
      await expect(page.locator("html")).toHaveAttribute("lang", "id");
      // Punya <title> non-kosong.
      expect((await page.title()).trim().length).toBeGreaterThan(0);
      // Konten utama tampil.
      await expect(page.locator("body")).toContainText(expectText);
    });
  }

  test("halaman offline dapat dimuat", async ({ page }) => {
    const res = await page.goto("/offline");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(/koneksi/i);
  });

  test("404 tidak menabrak server", async ({ page }) => {
    const res = await page.goto("/halaman-tidak-ada-xyz");
    expect(res?.status()).toBe(404);
  });
});

test.describe("LKTech Tools: landing publik vs ruang privat", () => {
  test("/tools publik, indexable & punya canonical", async ({ page }) => {
    const res = await page.goto("/tools", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /index/i,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/tools$/,
    );
  });

  test("/tools/ruang tetap noindex (ruang login-gated)", async ({ page }) => {
    const res = await page.goto("/tools/ruang", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
  });

  test("robots.txt memblokir sub-path /tools/ tanpa memblokir landing", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("Disallow: /tools/");
    // Landing persis "/tools" TIDAK boleh diblokir.
    expect(text).not.toMatch(/Disallow: \/tools\s*$/m);
  });
});