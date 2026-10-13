import { test, expect } from "@playwright/test";

/**
 * Smoke E2E aset & endpoint kunci (P3, B5).
 *
 * Aset PWA + endpoint health publik. Tidak butuh kredensial; endpoint cron
 * fail-closed (harus menolak tanpa secret).
 */

test("manifest PWA tersaji & valid", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBeTruthy();
  expect(body.start_url).toBeTruthy();
  expect(Array.isArray(body.icons)).toBe(true);
});

test("service worker tersedia di root", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.status()).toBe(200);
  const ct = res.headers()["content-type"] ?? "";
  expect(ct).toMatch(/javascript/i);
});

test("robots.txt & sitemap.xml tersedia", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  await expect(robots.text()).resolves.toContain("Sitemap");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  await expect(sitemap.text()).resolves.toContain("<urlset");
});

test("health payment mengembalikan boolean (tanpa bocorkan rahasia)", async ({
  request,
}) => {
  const res = await request.get("/api/health/payment");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(typeof body.mayar.configured).toBe("boolean");
  expect(typeof body.download.configured).toBe("boolean");
});

test("cron fail-closed: menolak tanpa/salah secret", async ({ request }) => {
  // Endpoint cron WAJIB tertutup. Tanpa secret terkonfigurasi → 503 (fail-closed);
  // bila CRON_SECRET ada → tanpa auth 401. Keduanya = tertutup (bukan 2xx).
  const noAuth = await request.post("/api/cron/analytics-daily");
  expect([401, 503]).toContain(noAuth.status());

  const wrong = await request.post("/api/cron/analytics-daily", {
    headers: { Authorization: "Bearer salah" },
  });
  expect([401, 503]).toContain(wrong.status());

  const body = await wrong.json();
  expect(body.ok).toBe(false);
});