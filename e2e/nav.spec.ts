import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Smoke navbar bertingkat (dropdown desktop + akordeon mobile).
 *
 * Berjalan terhadap build produksi (`npm run test:e2e`) atau dev server
 * (`E2E_BASE_URL=... npx playwright test e2e/nav.spec.ts`).
 *
 * Catatan:
 * - Label "Semua Layanan" muncul dua kali (dropdown desktop & akordeon mobile)
 *   → tiap test di-scope ke kontainernya agar tak ambigu.
 * - Playwright menganggap elemen `opacity: 0` tetap "visible", jadi status
 *   buka/tutup diperiksa lewat `aria-expanded` (bukan visibilitas).
 * - **Ketangguhan (anti-flaky):** halaman di-`goto` dengan `domcontentloaded`,
 *   sedangkan handler React baru aktif SETELAH hidrasi. Interaksi yang terjadi
 *   sebelum hidrasi "hilang" (klik/hover tak berpengaruh) → test flaky. Karena
 *   itu interaksi dibungkus retry idempoten (`clickUntil`), bukan sekali klik.
 */

/** Klik `locator` sampai `isDone()` benar. Idempoten: klik dilewati bila state
 *  sudah tercapai (mencegah toggle balik saat retry). */
async function clickUntil(locator: Locator, isDone: () => Promise<boolean>) {
  await expect(async () => {
    if (!(await isDone())) {
      await locator.click({ timeout: 2000 });
    }
    expect(await isDone()).toBe(true);
  }).toPass({ timeout: 15_000 });
}

/** Buka menu mobile (klik hamburger) lalu tunggu kontainer menu benar-benar
 *  terbuka — `#menu-mobile` beranimasi tinggi `0 → auto`, jadi kita tunggu
 *  tingginya bertambah (bukan sekadar `aria-expanded`). */
async function openMobileMenu(page: Page) {
  const menu = page.locator("#menu-mobile");
  const hamburger = page.getByRole("button", { name: /menu navigasi/ });
  await clickUntil(
    hamburger,
    async () => ((await menu.boundingBox())?.height ?? 0) > 200,
  );
  return menu;
}

test.describe("navbar bertingkat (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("hover 'Layanan' memunculkan dropdown sub-menu", async ({ page }) => {
    await page.goto("/tentang", { waitUntil: "domcontentloaded" });

    const desktopNav = page.locator("header nav > ul");
    const trigger = desktopNav
      .getByRole("link", { name: "Layanan", exact: true })
      .first();

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Hover bisa jatuh sebelum hidrasi → retry idempoten sampai aria-expanded
    // true. Penting: pindahkan mouse dulu tiap percobaan, karena `mouseenter`
    // hanya menyala saat pointer MASUK — hover ulang di posisi sama tak memicu.
    await expect(async () => {
      await page.mouse.move(0, 0);
      await trigger.hover();
      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: 1500,
      });
    }).toPass({ timeout: 15_000 });

    await expect(
      desktopNav.getByRole("link", { name: "Semua Layanan" }),
    ).toBeVisible();
  });

  test("sub-menu 'Layanan' menautkan ke halaman detail", async ({ page }) => {
    await page.goto("/tentang", { waitUntil: "domcontentloaded" });
    const desktopNav = page.locator("header nav > ul");
    await desktopNav
      .getByRole("link", { name: "Layanan", exact: true })
      .first()
      .hover();

    await expect(
      desktopNav.getByRole("link", { name: "Pembuatan Website" }),
    ).toHaveAttribute("href", "/layanan/pembuatan-website");
  });

  test("tautan 'Tentang' membawa ke /tentang", async ({ page }) => {
    await page.goto("/kontak", { waitUntil: "domcontentloaded" });
    const link = page
      .locator("header nav > ul")
      .getByRole("link", { name: "Tentang", exact: true });
    // Klik bisa jatuh sebelum hidrasi → retry idempoten sampai URL berpindah.
    await clickUntil(link, async () => /\/tentang$/.test(page.url()));
    await expect(page).toHaveURL(/\/tentang$/);
  });
});

test.describe("navbar bertingkat (mobile)", () => {
  test.use({ viewport: { width: 390, height: 840 } });

  test("akordeon Layanan di menu mobile", async ({ page }) => {
    await page.goto("/tentang", { waitUntil: "domcontentloaded" });
    const menu = await openMobileMenu(page);

    const toggle = menu.getByRole("button", { name: "Layanan", exact: true });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await clickUntil(
      toggle,
      async () => (await toggle.getAttribute("aria-expanded")) === "true",
    );
    await expect(menu.getByRole("link", { name: "Semua Layanan" })).toBeVisible();
  });

  test("'Semua Layanan' tak tampil ganda di menu mobile (regresi)", async ({
    page,
  }) => {
    await page.goto("/tentang", { waitUntil: "domcontentloaded" });
    const menu = await openMobileMenu(page);
    const toggle = menu.getByRole("button", { name: "Layanan", exact: true });
    await clickUntil(
      toggle,
      async () => (await toggle.getAttribute("aria-expanded")) === "true",
    );

    // Bug lama: komponen menambah "Semua Layanan" sendiri padahal sudah ada di
    // `children` → muncul dua kali. Kini harus tepat satu.
    await expect(
      menu.getByRole("link", { name: "Semua Layanan", exact: true }),
    ).toHaveCount(1);
  });
});
