/*
 * LKTech Service Worker (PWA — Tema 3.5, B2).
 *
 * Vanilla (tanpa dependensi). Strategi:
 *  - install  : precache SHELL terbatas (halaman offline, manifest, ikon).
 *  - navigation (HTML): network-first → cache → /offline. Konten tetap segar.
 *  - aset statik      : stale-while-revalidate (cepat + diam-diam ter-update).
 *  - /api/*, /admin/* , non-GET : DILEWATI (selalu jaringan) — keamanan & kesegaran.
 *  - activate : hapus cache versi lama (naikkan CACHE saat sw.js berubah).
 *
 * PENTING: nilai CACHE harus SAMA dengan `PWA_CACHE` di `src/lib/pwa.ts`
 * (dijaga oleh `scripts/pwa.test.ts`).
 */

const CACHE = "lktech-pwa-v1";
const OFFLINE_URL = "/offline";

/* Precache minimal: hanya aset milik kita & jarang berubah. */
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {
        /* abaikan: precache boleh sebagian; SW tetap aktif */
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Boleh tidak di-cache? (API, admin, unduhan, auth, permintaan non-GET) */
function isBypassed(request, url) {
  if (request.method !== "GET") return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return true;
  if (url.pathname.startsWith("/unduhan")) return true;
  if (url.pathname.startsWith("/keranjang")) return true;
  if (url.pathname.startsWith("/akun")) return true;
  return false;
}

/** Aset statik yang aman di-cache dengan SWR. */
function isStaticAsset(url, request) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  if (url.pathname.startsWith("/layanan/")) return true;
  if (url.pathname.startsWith("/tech/")) return true;
  if (url.pathname.startsWith("/logo/")) return true;
  return ["image", "font", "style", "script"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hanya tangani origin sendiri + permintaan yang boleh di-cache.
  if (url.origin !== self.location.origin) return;
  if (isBypassed(request, url)) return;

  // Navigasi (HTML) → network-first, fallback ke cache, lalu /offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }),
    );
    return;
  }

  // Aset statik → stale-while-revalidate.
  if (isStaticAsset(url, request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});