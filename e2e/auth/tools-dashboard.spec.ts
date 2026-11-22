import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import { E2E_ACCOUNTS } from "../../scripts/emulator-fixtures";

type BrowserStorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

let authStorageState: BrowserStorageState | null = null;

const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      storageState: authStorageState ?? undefined,
    });
    // Playwright fixture callback named `use`; this is not a React hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(context);
    await context.close();
  },
});

test.describe.configure({ mode: "serial" });

const ONE_PIXEL_RED_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0nAAAAABJRU5ErkJggg==",
  "base64",
);

async function loginThroughGoogleEmulator(page: Page) {
  page.on("pageerror", (error) => console.error("[auth e2e pageerror]", error));
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error("[auth e2e console]", message.text());
    }
  });
  let lastError = "";
  // Auth Emulator kadang gagal membuka popup pertama. Reload menghapus state
  // tombol `busy`; retry terbatas tidak menyembunyikan kegagalan autentikasi
  // yang sebenarnya.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/masuk", { waitUntil: "domcontentloaded" });
    const popupPromise = page.waitForEvent("popup", { timeout: 12_000 }).catch(() => null);
    await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
    const popup = await popupPromise;
    if (!popup) {
      lastError = await page.getByRole("alert").innerText().catch(() => "");
      continue;
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
    return;
  }
  throw new Error(`Google Auth Emulator popup tidak terbuka. ${lastError}`);
}

// Login sekali per suite. Sebelumnya setiap test membuka popup emulator; pada
// suite serial popup ke-13+ sering gagal terbuka sehingga hasil test menjadi
// flaky. storageState (termasuk IndexedDB Firebase Auth) dipakai ulang oleh
// setiap context test.
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await loginThroughGoogleEmulator(page);
  authStorageState = await context.storageState({ indexedDB: true });
  await context.close();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/tools/ruang", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ruang tools" })).toBeVisible();
});

test.afterEach(async ({ page }) => {
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
    name: "Tambahkan Color Studio ke favorit",
  });
  await favorite.click();
  await expect(
    page.getByRole("button", { name: "Hapus Color Studio dari favorit" }),
  ).toHaveAttribute("aria-pressed", "true");

  const search = page.getByRole("searchbox", { name: "Cari tool" });
  await search.fill("color");
  await expect(page).toHaveURL(/q=color/);
  await expect(page.getByRole("link", { name: "Buka Color Studio" })).toBeVisible();

  await page.getByRole("link", { name: "Buka Color Studio" }).click();
  await expect(page).toHaveURL(/\/tools\/color-picker$/);
  await expect(page.getByRole("heading", { name: "Color Studio" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lktech.tools.usage.v1")))
    .toContain("color-picker");

  await page.getByRole("button", { name: "Buka menu tools" }).click();
  await page.getByRole("button", { name: "Hapus data lokal" }).click();
  await page.getByRole("button", { name: "Konfirmasi hapus data lokal" }).click();
  // Workspace aktif juga memiliki live region sendiri; targetkan pesan global
  // ini secara spesifik agar assertion tidak bergantung pada jumlah status.
  await expect(page.getByText("Data lokal tools dihapus.", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lktech.tools.usage.v1")))
    .toBeNull();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lktech.tools.favorites.v1")))
    .toBeNull();
});

test("Color Studio mengambil warna dan membangun palet dari gambar lokal", async ({ page }) => {
  await page.goto("/tools/color-picker", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Color Studio" })).toBeVisible();
  await page.getByRole("tab", { name: "Dari gambar" }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "merah.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_RED_PNG,
  });

  await expect(
    page.getByRole("img", {
      name: "Pratinjau gambar. Klik untuk mengambil warna pada titik tersebut",
    }),
  ).toBeVisible();
  const extracted = page.getByRole("button", { name: "Pilih #FF0000 dari palet" });
  await expect(extracted).toBeVisible();
  // Fixture 1×1 sengaja menguji ekstraksi deterministik. Klik warna palet
  // menguji bahwa hasil ekstraksi juga dapat dijadikan warna aktif tanpa
  // bergantung pada hit-target kanvas 1×1 yang tidak stabil di Chromium.
  await extracted.click();
  await expect(page.getByText("#FF0000").first()).toBeVisible();
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

test("workspace WebP ke Gambar mengubah WebP valid ke lima format dengan nama benar", async ({ page }) => {
  await page.goto("/tools/webp-to-image");
  await expect(page.getByRole("heading", { name: /WebP ke Gambar/i })).toBeVisible();
  await expect(page.getByText(/maks 8 megapiksel/i)).toBeVisible();

  const webpBytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#2563eb";
    context.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((output) => output ? resolve(output) : reject(new Error("WebP unavailable")), "image/webp"),
    );
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "contoh.webp",
    mimeType: "image/webp",
    buffer: Buffer.from(webpBytes),
  });

  const formats = [
    ["PNG", "contoh.png"],
    ["JPG", "contoh.jpg"],
    ["GIF", "contoh.gif"],
    ["BMP", "contoh.bmp"],
    ["AVIF", "contoh.avif"],
  ] as const;
  for (const [label, filename] of formats) {
    const option = page.getByRole("radio", { name: label });
    await expect(option).toBeVisible();
    await option.check();
    await page.getByRole("button", { name: `Ubah ke ${label}` }).click();
    await expect(page.getByText(`${label} siap diunduh`, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: new RegExp(`Unduh ${filename}`) })).toHaveAttribute("download", filename);
  }
});
