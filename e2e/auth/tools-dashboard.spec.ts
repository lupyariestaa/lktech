import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { E2E_ACCOUNTS } from "../../scripts/emulator-fixtures";

const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // Playwright fixture callback named `use`; this is not a React hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(context);
    await context.close();
  },
});

test.describe.configure({ mode: "serial" });

let signedInContext: BrowserContext | null = null;

async function loginThroughGoogleEmulator(page: Page) {
  page.on("pageerror", (error) => console.error("[auth e2e pageerror]", error));
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error("[auth e2e console]", message.text());
    }
  });
  await page.goto("/masuk", { waitUntil: "domcontentloaded" });
  const popupPromise = page.waitForEvent("popup", { timeout: 8_000 }).catch(() => null);
  await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
  const popup = await popupPromise;
  if (!popup) {
    const authError = await page.getByRole("alert").innerText().catch(() => "");
    throw new Error(`Google Auth Emulator popup tidak terbuka. ${authError}`);
  }
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(/127\.0\.0\.1:9099\/emulator\/auth\/handler/);
  await expect(popup.getByText(/Sign-in with Google\.com/)).toBeVisible();
  const popupClosed = popup.waitForEvent("close");
  const existingAccount = popup
    .locator("li.js-reuse-account")
    .filter({ hasText: E2E_ACCOUNTS.tools.email });
  if (await existingAccount.count()) {
    await existingAccount.click();
  } else {
    await popup.locator("#add-account-button").click();
    await popup.locator("#email-input").fill(E2E_ACCOUNTS.tools.email);
    await popup.locator("#display-name-input").fill(E2E_ACCOUNTS.tools.displayName);
    await popup.locator("#screen-name-input").fill("e2e_tools_user");
    await popup.locator("#sign-in").click();
  }
  await popupClosed;
  await expect(page.getByRole("heading", { name: "Masuk ke Akun" })).toHaveCount(0);
}

test.beforeEach(async ({ browser, page }) => {
  signedInContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const authPage = await signedInContext.newPage();
  await loginThroughGoogleEmulator(authPage);
  await authPage.close();
  const storageState = await signedInContext.storageState({ indexedDB: true });
  const storageStatePath = "test-results/tools-dashboard-auth-state.json";
  await mkdir(dirname(storageStatePath), { recursive: true });
  await writeFile(storageStatePath, JSON.stringify(storageState));
  await page.context().setStorageState(storageState);
  await page.goto("/tools/ruang", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ruang tools" })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  await signedInContext?.close();
  signedInContext = null;
  await page.context().clearCookies();
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const registrations = await navigator.serviceWorker?.getRegistrations();
    await Promise.all(registrations?.map((registration) => registration.unregister()) ?? []);
    if (indexedDB.databases) {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases.map(
          ({ name }) =>
            new Promise<void>((resolve) => {
              if (!name) return resolve();
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = request.onerror = request.onblocked = () => resolve();
            }),
        ),
      );
    }
  }).catch(() => {});
});

test("login gate mengarahkan pengguna anonim ke login dan menjaga noindex", async ({
  page,
  request,
}) => {
  await page.context().clearCookies();
  await page.context().clearPermissions();
  await page.context().clearCookies();
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    if (indexedDB.databases) {
      await Promise.all(
        (await indexedDB.databases()).map(
          ({ name }) =>
            new Promise<void>((resolve) => {
              if (!name) {
                resolve();
                return;
              }
              const deletion = indexedDB.deleteDatabase(name);
              deletion.onsuccess = deletion.onerror = deletion.onblocked = () => resolve();
            }),
        ),
      );
    }
    const registrations = await navigator.serviceWorker?.getRegistrations();
    await Promise.all(registrations?.map((registration) => registration.unregister()) ?? []);
  });
  await page.goto("/tools/ruang", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/masuk\?next=%2Ftools%2Fruang/);

  const privatePage = await request.get("/tools/ruang");
  expect(privatePage.status()).toBeLessThan(400);
  expect(await privatePage.text()).toMatch(
    /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i,
  );
  await page.goto("/tools/ruang", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/masuk\?next=%2Ftools%2Fruang/);
});

test("favorit, filter URL, riwayat workspace dan penghapusan data lokal bekerja", async ({
  page,
}) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const favorite = page.getByRole("button", {
    name: "Tambahkan Color Picker ke favorit",
  });
  await favorite.click();
  await expect(
    page.getByRole("button", { name: "Hapus Color Picker dari favorit" }),
  ).toHaveAttribute("aria-pressed", "true");

  const search = page.getByRole("searchbox", { name: "Cari tool" });
  await search.fill("color");
  await expect(page).toHaveURL(/q=color/);
  await expect(page.getByRole("link", { name: "Buka Color Picker" })).toBeVisible();

  await page.getByRole("link", { name: "Buka Color Picker" }).click();
  await expect(page).toHaveURL(/\/tools\/color-picker$/);
  await expect(page.getByRole("heading", { name: "Color Picker" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lktech.tools.usage.v1")))
    .toContain("color-picker");

  await page.getByRole("button", { name: "Buka menu tools" }).click();
  await page.getByRole("button", { name: "Hapus data lokal" }).click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Data lokal tools dihapus.");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lktech.tools.usage.v1")))
    .toBeNull();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lktech.tools.favorites.v1")))
    .toBeNull();
});

test("drawer menjaga relasi ARIA dan ditutup oleh Escape dengan pemulihan fokus", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Buka menu tools" });
  await expect(
    page.getByRole("button", { name: "Buka menu tools" }),
  ).not.toHaveAttribute("aria-controls");
  await trigger.focus();
  await trigger.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Menu tools" });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-controls", "tools-drawer");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    dialog.getByRole("button", { name: "Tutup menu tools" }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buka menu tools" })).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Buka menu tools" }),
  ).not.toHaveAttribute("aria-controls");
});

test("logout mengakhiri sesi dan mengembalikan guard login", async ({ page }) => {
  await page.getByRole("button", { name: "Buka menu tools" }).click();
  await page.getByRole("button", { name: "Keluar dari akun" }).click();
  await expect(page).toHaveURL(/\/masuk\?next=%2Ftools%2Fruang/);
  await expect(page.getByRole("heading", { name: "Masuk ke Akun" })).toBeVisible();
});

test("storage write failure tidak merusak sesi navigasi tool", async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(window.Storage.prototype, "setItem", {
      configurable: true,
      value() {
        throw new DOMException("storage disabled", "QuotaExceededError");
      },
    });
  });

  await page.goto("/tools/image-to-webp");
  await expect(page.getByRole("heading", { name: "Gambar ke WebP" })).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await page.getByRole("link", { name: "Ruang tools", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Gambar ke WebP 1×" }),
  ).toBeVisible();
});
