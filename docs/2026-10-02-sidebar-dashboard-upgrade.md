# UPGRADE SIDEBAR DASHBOARD ADMIN — Audit UI/UX & Task Implementation Flow

> **Status dokumen:** ✅ **Dieksekusi** (FASE 0–7 selesai — sisa: uji manual browser & deploy)
> **Disusun:** 2026-10-02 · **Dieksekusi:** 2026-10-02
> **Cakupan:** Sidebar + shell dashboard admin (`/admin/*`) — audit UI/UX khusus sidebar dan rencana upgrade menyeluruh.
> **Tujuan:** Menjadikan sidebar dashboard **lebih proper, lebih informatif, lebih aksesibel, dan jauh lebih bagus secara UI/UX** tanpa merusak fondasi yang sudah berjalan baik.
> **Prasyarat baca:** `docs/README.md`.
> **Hasil eksekusi & verifikasi:** lihat [§12 Status Eksekusi](#12-status-eksekusi).

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Saat Ini](#2-baseline--kondisi-saat-ini)
3. [AUDIT UI/UX SIDEBAR — Temuan](#3-audit-uiux-sidebar--temuan)
4. [Spesifikasi Desain Target](#4-spesifikasi-desain-target)
5. [Arsitektur Implementasi](#5-arsitektur-implementasi)
6. [TASK IMPLEMENTATION FLOW (FASE 0–7)](#6-task-implementation-flow-fase-07)
7. [Definition of Done & Checklist QA](#7-definition-of-done--checklist-qa)
8. [Risiko & Mitigasi](#8-risiko--mitigasi)
9. [Out of Scope](#9-out-of-scope)
10. [Estimasi & Urutan Pengerjaan yang Disarankan](#10-estimasi--urutan-pengerjaan-yang-disarankan)
11. [Lampiran — Referensi Pola Existing](#11-lampiran--referensi-pola-existing)
12. [Status Eksekusi](#12-status-eksekusi)

---

## 1. Ringkasan Eksekutif

Sidebar dashboard saat ini **fungsional dan rapi**, hasil upgrade FASE 2 sebelumnya (full-width, footer pinned flex, tutup drawer saat route berubah, Escape). Namun audit khusus UI/UX menemukan **16 temuan**: 4 di antaranya adalah **masalah aksesibilitas/interaksi nyata** (link drawer tersembunyi tapi masih bisa di-Tab, tanpa focus trap, Ctrl/Cmd+Click rusak, SkipLink mati di admin), dan sisanya adalah **peluang upgrade UX** (grouping menu, badge notifikasi lead, mode collapse/rail, user menu, konsistensi heading & label).

Dokumen ini berisi:

1. **Audit lengkap** dengan ID temuan (`SB-01` … `SB-16`), severity, lokasi kode, dampak, dan rekomendasi.
2. **Spesifikasi desain target** yang konkret (struktur, state visual, breakpoint, token).
3. **Task implementation flow bertahap (FASE 0–7)** — tiap fase berdiri sendiri, bisa dites, dan tidak merusak fitur existing.

**Prinsip utama:** *evolusi, bukan revolusi*. Identitas visual brand (primary `#004EDF`, putih/surface, radius `rounded-xl/2xl`) dipertahankan; yang di-upgrade adalah struktur, aksesibilitas, dan kemampuan sidebar sebagai *navigator* dashboard.

---

## 2. Baseline — Kondisi Saat Ini

### 2.1 File terkait

| File | Peran |
|---|---|
| `src/components/admin/admin-shell.tsx` | **Titik utama.** Sidebar + header + main. Semua audit mengacu ke file ini. |
| `src/app/admin/(dashboard)/layout.tsx` | Menyusun `AuthGuard → ToastProvider → UnsavedChangesProvider → AdminShell`. |
| `src/app/admin/layout.tsx` | Metadata root admin (`title: "Admin — LKTech"`, `robots: noindex`). |
| `src/app/admin/(dashboard)/*/page.tsx` | 12 halaman; tiap halaman punya `<h1>` + deskripsi sendiri. |
| `src/components/admin/unsaved-changes.tsx` | Guard navigasi (`useUnsavedNavigation`) yang diintersep sidebar. |
| `src/components/admin/toast.tsx` | Toast global, `z-[12000]`, fixed kanan-bawah. |
| `src/components/skip-link.tsx` | SkipLink global (`href="#konten"`) — dirender root layout, **ikut area admin**. |
| `src/app/api/admin/leads/route.ts` | GET daftar lead (semua) — kandidat endpoint ringan untuk badge. |

### 2.2 Struktur sidebar saat ini (ringkas)

```tsx
// admin-shell.tsx — NAV hardcoded 12 item flat
const NAV = [
  { label: "Ringkasan", href: "/admin", icon: LayoutDashboard },
  { label: "Lead", href: "/admin/leads", icon: Inbox },
  { label: "Hero", href: "/admin/hero", icon: PanelsTopLeft },
  { label: "Konten", href: "/admin/content", icon: Files },
  { label: "Layanan", href: "/admin/services", icon: LayoutGrid },
  { label: "Produk", href: "/admin/products", icon: Package },
  { label: "Harga", href: "/admin/pricing", icon: Tags },
  { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
  { label: "Portofolio", href: "/admin/projects", icon: FolderKanban },
  { label: "Blog", href: "/admin/blog", icon: Newspaper },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Pengaturan", href: "/admin/settings", icon: Settings },
];

<aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r
  border-slate-200 bg-white transition-transform lg:static lg:translate-x-0"
  open ? "translate-x-0" : "-translate-x-full">
  {/* Brand (LK + Admin Panel) + tombol tutup (mobile) */}
  {/* <nav> 12 Link flat, overflow-y-auto, footer pinned via flex */}
  {/* Footer: link "Lihat Website" */}
</aside>
```

- **Desktop (≥ lg / 1024px):** sidebar static `w-64` (256px), selalu tampil, tidak bisa disembunyikan/diciutkan.
- **Mobile (< lg):** drawer `fixed` + `translate-x`, backdrop `z-30`, tutup via tombol X, klik backdrop, Escape, atau pindah route (pattern render-phase adjust state — sudah sesuai rekomendasi React).
- **Header:** sticky, berisi hamburger (mobile), judul halaman (`<h1>` kecil via `titleForPath`), info user (nama + email + avatar), tombol "Keluar".

### 2.3 Yang SUDAH BAGUS dan wajib dipertahankan ✅

| # | Hal | Catatan |
|---|---|---|
| B1 | Integrasi **guard unsaved-changes** di klik menu | `preventDefault` + `navigate(href)` — jangan sampai rusak. |
| B2 | Tutup drawer **saat route berubah** | Pattern adjust-state-saat-render (bukan effect) — modern & benar. |
| B3 | **Escape** menutup drawer | Sudah ada listener conditional. |
| B4 | `aria-current="page"` pada item aktif | Sudah benar. |
| B5 | **Nav scrollable + footer pinned via flex** (bukan absolute) | Perbaikan ME-14 audit lama — sudah benar. |
| B6 | Layout **full-width** konten | Perbaikan UX-1 audit lama — dipertahankan. |
| B7 | Token warna brand konsisten | `primary`, `primary-50` hover, `secondary`, `surface`. |
| B8 | Toast `z-[12000]` di atas drawer | Sudah benar secara layering. |
| B9 | `titleForPath` longest-prefix match | Trick sorting by length — works, akan dipindah ke config terpusat. |

---

## 3. AUDIT UI/UX SIDEBAR — Temuan

Format: **[ID] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.
Severity: 🔴 Tinggi · 🟠 Menengah · 🔵 Rendah/Polish.

### 3.1 Aksesibilitas & Interaksi (dikerjakan paling awal)

---

**[SB-01] Link drawer tertutup tetap masuk tab order (mobile)** — 🔴 Tinggi
- **Lokasi:** `admin-shell.tsx` (aside dengan `-translate-x-full` saat tertutup).
- **Dampak:** Di viewport < 1024px dengan drawer tertutup, menekan **Tab** akan memfokuskan 13+ link yang tidak terlihat (brand, 12 menu, Lihat Website). Keyboard user "hilang" di elemen tak terlihat; screen reader membaca menu yang secara visual sudah ditutup. Ini pelanggaran WCAG 2.1 (Focus Visible / focus not obscured secara logis).
- **Rekomendasi:** Pisahkan render **mobile drawer** (conditional render saat `open`, dengan `role="dialog"`) dan **desktop sidebar** (`hidden lg:flex`, selalu tampil). Dengan conditional render, elemen tertutup tidak pernah ada di DOM → tidak tabbable. (Alternatif: `invisible` + `pointer-events-none`, tapi conditional render lebih bersih dan memungkinkan animasi enter/exit via framer-motion yang sudah terpasang.)

---

**[SB-02] Drawer mobile tanpa focus trap, fokus tidak dipindah saat dibuka & tidak dikembalikan saat ditutup** — 🔴 Tinggi
- **Lokasi:** `admin-shell.tsx` (hanya ada Escape listener; tidak ada pemindahan fokus).
- **Dampak:** Saat drawer dibuka via hamburger, fokus tetap di tombol hamburger *di belakang* backdrop — pengguna keyboard/screen reader tidak tahu panel sudah terbuka. Saat drawer ditutup (Escape), fokus tidak kembali ke hamburger. `Tab` bisa "lolos" ke konten di belakang dialog (modal untuk SR belum dinyatakan).
- **Rekomendasi:** Implementasi `useDrawerFocus(ref, open)`: (1) simpan `document.activeElement` saat buka; (2) pindahkan fokus ke elemen pertama drawer (tombol tutup); (3) trap `Tab`/`Shift+Tab` dalam drawer; (4) saat tutup → kembalikan fokus. Pola trap sudah ada di `media-picker-dialog.tsx` (baris ±252) — bisa dijadikan referensi/diekstrak.

---

**[SB-03] Ctrl/Cmd/Shift+Alt+Click pada menu dirusak guard navigasi (open-in-new-tab mati)** — 🟠 Menengah
- **Lokasi:** `admin-shell.tsx` — `onClick` item menu: `e.preventDefault(); navigate(item.href);` dijalankan untuk SEMUA klik non-aktif.
- **Dampak:** Admin yang terbiasa `Ctrl+Klik`/`Cmd+Klik` menu untuk membuka tab baru akan tetap dialihkan di tab yang sama (default behavior dicegah + `router.push`). Ini bug interaksi yang halus tapi nyata — `Link` seharusnya hormati modified click.
- **Rekomendasi:** Bypass guard untuk modified click:
  ```tsx
  onClick={(e) => {
    setOpen(false);
    if (active) return;
    // Hormati perilaku native: buka di tab/jendela baru.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(item.href);
  }}
  ```

---

**[SB-04] SkipLink mati di seluruh area admin (`#konten` tidak ada)** — 🟠 Menengah
- **Lokasi:** `src/app/layout.tsx` (render `<SkipLink />` global) vs `admin-shell.tsx` (`<main>` **tanpa** `id="konten"`). Audit lama memverifikasi `id="konten"` ada di layout publik (blog/kontak/layanan/portofolio/home), tapi **bukan di admin**.
- **Dampak:** Di semua halaman admin, link "Lewati ke konten utama" (muncul saat Tab pertama) menunjuk anchor yang tidak ada → tidak melakukan apa pun. Keyboard user harus Tab melewati ~14 link sidebar sebelum mencapai konten setiap pindah halaman.
- **Rekomendasi:** Tambah `id="konten"` + `tabIndex={-1}` pada `<main>` shell admin (atau `scroll-region` pattern). One-liner, dampak besar.

---

**[SB-05] Drawer tanpa semantik dialog** — 🔴 Tinggi (sepupu SB-02, atributnya)
- **Lokasi:** `admin-shell.tsx` (aside drawer) & backdrop.
- **Dampak:** Tanpa `role="dialog"` + `aria-modal="true"` + label, screen reader tidak mengumumkan konteks "panel menu terbuka". Backdrop tanpa `aria-hidden="true"` bisa dianggap konten.
- **Rekomendasi:** Teratasi otomatis oleh desain SB-01 (drawer = conditional render dengan `role="dialog" aria-modal="true" aria-label="Menu dashboard"`; backdrop `aria-hidden="true"`).

---

### 3.2 Informasi & Arsitektur Informasi (IA)

---

**[SB-06] 12 item menu flat tanpa pengelompokan** — 🟠 Menengah
- **Lokasi:** `NAV` di `admin-shell.tsx`.
- **Dampak:** Semua item setara secara visual → beban kognitif tinggi; mencari "Pengaturan" di antara 12 baris seragam lambat; sidebar memanjang (12 item ≈ 530px + brand + footer ≈ 660px) sehingga di laptop pendek harus scroll.
- **Rekomendasi:** Kelompokkan dengan **section label** (uppercase, ukuran kecil, warna muted):
  - **Utama** (tanpa label, langsung tampil): Ringkasan, Lead
  - **Konten Website**: Hero, Konten Beranda, Layanan, Produk, Harga, FAQ, Portofolio, Blog
  - **Aset**: Media
  - **Sistem**: Pengaturan
  Section label hilang otomatis di mode rail (SB-09) dan di mobile (hemat tinggi).

---

**[SB-07] Tidak ada badge notifikasi lead baru** — 🟠 Menengah (fitur paling diinginkan)
- **Lokasi:** Item "Lead" di NAV; data tersedia via `/api/admin/leads`.
- **Dampak:** Admin harus membuka halaman Lead (atau Ringkasan) untuk tahu ada lead masuk baru. Padahal lead = darurat bisnis (calon klien).
- **Rekomendasi:** Badge angka merah (atau primary) di item "Lead": jumlah lead berstatus `baru`. Endpoint ringan `GET /api/admin/leads?summary=1` → `{ summary: { total, baru, diproses, selesai } }` (`no-store`), polling 60 detik **hanya saat tab visible** + refresh saat `visibilitychange`/`focus`. Badge: sembunyikan saat 0; `99+` saat > 99; `aria-label="N lead baru"`.

---

**[SB-08] Judul header vs `<h1>` halaman: dobel heading & label tidak konsisten** — 🟠 Menengah
- **Lokasi:** Header shell (`<h1 className="text-sm">{title}</h1>`) + tiap `page.tsx` (punya `<h1 className="text-xl">` sendiri).
- **Dampak:** (1) **Dua `<h1>` per halaman** — struktur heading tidak bersih. (2) Label header diambil dari NAV ("Lead", "Konten") sedangkan `<h1>` halaman berbeda ("Lead & Pesan", "Konten Beranda") → tampil berbeda di layar yang sama, membingungkan. (3) `document.title` semua halaman admin statis "Admin — LKTech" → tab browser & history tidak bisa dibedakan.
- **Rekomendasi:**
  - Judul di header shell berubah menjadi **bukan heading** (`<p>` / `<span>`), karena halaman sudah punya `<h1>` yang lebih deskriptif.
  - Item NAV diberi dua properti: `label` (pendek, untuk sidebar) & `title` (lengkap, untuk header + metadata).
  - Tambah `export const metadata = { title: "..." }` per halaman → memanfaatkan template `"%s | LKTech"` yang sudah aktif.

---

### 3.3 Layout, Kapabilitas & Polish

---

**[SB-09] Sidebar tidak bisa diciutkan di desktop (tanpa mode rail)** — 🟠 Menengah
- **Lokasi:** Aside selalu `w-64` static di ≥ lg.
- **Dampak:** Di layar 1024–1366px (laptop umum), 256px tetap terpakai padahal halaman seperti Media/Lead butuh lebar maksimal. Tidak ada preferensi per-user.
- **Rekomendasi:** Mode **rail icon-only `w-20` (80px)** untuk ≥ lg, toggle via tombol di header (`PanelLeftClose`/`PanelLeftOpen`), **persist di `localStorage`** (`lktech:admin-sidebar = "collapsed" | "expanded"`), default expanded. Di rail: icon terpusat + tooltip native (`title`) + `aria-label`; badge tetap tampil (dot kecil + angka). Transisi `transition-[width] duration-300`.

---

**[SB-10] Info user & logout hanya di header; pola user menu modern tidak ada** — 🟠 Menengah
- **Lokasi:** Header (nama/email kanan + avatar + tombol Keluar).
- **Dampak:** (1) Area header penuh hanya untuk identitas; (2) logout sebagai tombol telanjang tanpa busy-state; (3) tidak ada tempat alami untuk aksi akun di masa depan. Pola umum dashboard modern (Linear, Vercel, Supabase, shadcn): **user menu di footer sidebar**.
- **Rekomendasi:** Footer sidebar: link "Lihat Website" + **UserMenu** (tombol avatar+nama+chevron → dropdown: info user, "Lihat Website", "Keluar"). Dropdown aksesibel: `aria-haspopup="menu"`, `aria-expanded`, tutup via Escape/klik-luar, fokus kembali ke tombol. Header jadi lapang (hamburger mobile / toggle rail desktop + judul konteks).

---

**[SB-11] Config NAV hardcoded di dalam `admin-shell.tsx`** — 🔵 Rendah (maintainability, tapi fondasi fitur lain)
- **Lokasi:** Konstanta `NAV` + `titleForPath` di file yang sama.
- **Dampak:** Tidak bisa dipakai ulang (command palette, breadcrumb, metadata). `titleForPath` duplikasi kebutuhan judul.
- **Rekomendasi:** Ekstrak ke **`src/lib/admin-nav.ts`**: tipe `AdminNavItem { label, title, href, icon, badge? }`, `AdminNavGroup { id, label?, items }`, konstanta `ADMIN_NAV`, helper `matchAdminItem(pathname)` (longest-prefix match yang dipindah dari `titleForPath`). Dikerjakan di **FASE 1** sebagai fondasi.

---

**[SB-12] Indikator aktif kurang scannable (tanpa rail marker)** — 🔵 Polish
- **Lokasi:** Item aktif `bg-primary text-white`.
- **Rekomendasi:** Tambah **indikator vertikal** di sisi kiri item aktif (bar 3px rounded, warna primary / putih di state aktif) — mempercepat orientasi saat scanning cepat. Opsional: icon aktif diberi bobot lebih.

---

**[SB-13] `document.title` statis per halaman admin** — 🔵 Rendah
- **Lokasi:** `src/app/admin/layout.tsx` (metadata tunggal).
- **Rekomendasi:** Teratasi bersama SB-08 (metadata per page).

---

**[SB-14] Tidak ada affordance scroll pada nav panjang** — 🔵 Polish
- **Lokasi:** `<nav className="overflow-y-auto">`.
- **Dampak:** Saat nav discroll, tidak ada sinyal visual bahwa ada item tersembunyi di atas/bawah.
- **Rekomendasi:** Fade/shadow gradient tipis di tepi atas nav saat `scrollTop > 0` (dan tepi bawah saat bisa scroll ke bawah). Kecil, tapi terasa "proper".

---

**[SB-15] Touch target hamburger 36×36 & tombol tutup 32×32** — 🔵 Polish
- **Lokasi:** Header (`h-9 w-9`) dan tombol X drawer (`h-8 w-8`).
- **Rekomendasi:** Naikkan ke minimal 40–44px (`h-10 w-10` / `h-11 w-11`) — pedoman WCAG 2.5.8 / guidelines mobile (44px). Beri `type="button"` pada semua button non-form.

---

**[SB-16] Backdrop muncul instan tanpa transisi & tanpa env indicator** — 🔵 Polish
- **Lokasi:** `{open && <div className="fixed inset-0 z-30 bg-secondary/30" />}`.
- **Rekomendasi:** (1) Animasi fade backdrop (mudah setelah SB-01 pakai conditional render + `AnimatePresence`). (2) **Opsional:** indikator environment kecil di footer sidebar saat `NODE_ENV !== "production"` (mis. chip "DEV") agar tidak tertukar local vs production.

### 3.4 Ringkasan temuan

| ID | Temuan | Severity | Fase penyelesaian |
|---|---|---|---|
| SB-01 | Drawer tertutup masih tabbable | 🔴 | F2 |
| SB-02 | Tanpa focus trap / restore fokus | 🔴 | F2 |
| SB-05 | Tanpa semantik dialog | 🔴 | F2 |
| SB-03 | Modified click rusak (new tab) | 🟠 | F2 |
| SB-04 | SkipLink mati di admin | 🟠 | F2 |
| SB-06 | 12 menu flat tanpa grouping | 🟠 | F3 |
| SB-08 | Dobel h1 + label tidak konsisten | 🟠 | F3 |
| SB-07 | Tanpa badge lead baru | 🟠 | F4 |
| SB-09 | Tanpa collapse/rail desktop | 🟠 | F4 |
| SB-10 | Tanpa user menu di sidebar | 🟠 | F4 |
| SB-11 | NAV config hardcoded | 🔵 | F1 (fondasi) |
| SB-12 | Rail marker item aktif | 🔵 | F5 |
| SB-13 | document.title statis | 🔵 | F3 |
| SB-14 | Scroll affordance nav | 🔵 | F5 |
| SB-15 | Touch target kecil | 🔵 | F2 |
| SB-16 | Backdrop instan + tanpa env chip | 🔵 | F5 |
| — | Command palette Cmd+K (fitur baru) | ✨ nice | F6 (opsional) |

---

## 4. Spesifikasi Desain Target

### 4.1 Struktur sidebar target (desktop, expanded)

```
┌──────────────────────────────────────┐
│  [LK]  Admin Panel                   │  ← brand (link ke /admin)
│──────────────────────────────────────│
│  ▣  Ringkasan                        │  ← grup "Utama" (tanpa label)
│  ▤  Lead                     ③       │  ← badge lead baru (SB-07)
│                                      │
│  KONTEN WEBSITE                      │  ← section label (SB-06)
│  ▣  Hero                             │
│  ▣  Konten Beranda                   │
│  ▣  Layanan                          │
│  ▣  Produk                           │
│  ▣  Harga                            │
│  ▣  FAQ                              │
│  ▣  Portofolio                       │
│  ▣  Blog                             │
│                                      │
│  ASET                                │
│  ▣  Media                            │
│                                      │
│  SISTEM                              │
│  ▣  Pengaturan                       │
│──────────────────────────────────────│
│  ↗  Lihat Website                    │
│  ┌────────────────────────────────┐  │
│  │ (A)  Nama Admin           ⌄    │  │  ← UserMenu (SB-10)
│  └────────────────────────────────┘  │
│      ▁▁▁ (scroll fade)               │  ← SB-14
└──────────────────────────────────────┘
```

### 4.2 Struktur sidebar target (desktop, rail/collapsed — SB-09)

```
┌──────────┐
│   [LK]   │
│──────────│
│    ▣     │  Ringkasan  (tooltip: title + aria-label)
│    ▤ ③   │  Lead       (badge dot + angka)
│          │
│    ·     │  (pemisah grup, tanpa label)
│    ▣     │  Hero
│    ▣     │  Konten Beranda
│    ⋮     │
│    ▣     │  Pengaturan
│──────────│
│    ↗     │  Lihat Website
│   (A)    │  Avatar → UserMenu
└──────────┘
   w-20
```

### 4.3 Mobile drawer target

- Conditional render saat `open` (SB-01), dibungkus `role="dialog" aria-modal="true" aria-label="Menu dashboard"` (SB-05).
- Backdrop fade-in (`AnimatePresence`, `prefers-reduced-motion` dihormati otomatis oleh CSS global).
- Fokus pindah ke tombol tutup saat buka; trap Tab; kembali ke hamburger saat tutup (SB-02).
- Konten sama dengan expanded desktop (grup + badge + user menu) dalam wrapper scrollable.
- Tutup: tombol X (≥44px), klik backdrop, Escape, pindah route, **pilih menu**.

### 4.4 Header target

```
┌────────────────────────────────────────────────────────────┐
│ [≡]  Lead & Pesan                          (lapang/kosong) │
└────────────────────────────────────────────────────────────┘
  ↑ mobile: hamburger (h-11)
  ↑ desktop: toggle rail (PanelLeftClose/Open)
  judul = <p> (BUKAN h1) — dari config `title` (SB-08)
```

### 4.5 Spesifikasi state visual item menu

| State | Spesifikasi |
|---|---|
| Default | `text-slate-600`, icon `text-slate-400`→sinkron, `hover:bg-primary-50 hover:text-primary` (pertahankan). |
| Active | `bg-primary text-white shadow-sm shadow-primary/25` + **rail marker kiri** (bar `absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-white/90` di dalam item, atau primary saat hover item lain) — SB-12. `aria-current="page"`. |
| Focus | Ring global `:focus-visible` sudah ada (primary outline) — pertahankan. |
| Badge | Pill `min-w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold px-1.5 grid place-items-center`; `99+` cap; hidden saat 0; `aria-label="N lead baru"`. Di rail: dot + angka mini di pojok icon. |
| Section label | `px-3.5 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400`; `sr-only` di rail. |
| Rail item | `justify-center px-0 py-2.5`, icon `h-5 w-5`, tooltip via `title` + `aria-label`. |

### 4.6 Breakpoint & dimensi

| Breakpoint | Perilaku |
|---|---|
| `< 1024px` (mobile/tablet) | Drawer overlay; rail toggle tersembunyi; state collapse TIDAK berlaku. |
| `≥ 1024px` (lg) | Sidebar inline `w-64` ↔ `w-20` (persist localStorage); konten menyesuaikan otomatis (flex). |
| Lebar konten | Tetap full-width (B6) — padding `px-4 sm:px-6 lg:px-8` dipertahankan. |
| Tinggi pendek | Nav `overflow-y-auto` + scroll fade; brand & footer selalu terlihat (flex, sudah benar). |

### 4.7 Motion

- Drawer mobile: slide-in `x: -100% → 0` (framer-motion, `duration-0.25s ease-out`), backdrop fade `opacity 0 → 1`.
- Rail toggle desktop: `transition-[width] duration-300 ease-in-out` pada aside.
- Semua otomatis dinonaktifkan oleh `prefers-reduced-motion` (CSS global sudah menangani).

---

## 5. Arsitektur Implementasi

### 5.1 Struktur file (baru & diubah)

```
src/
├─ lib/
│  └─ admin-nav.ts                        ★ BARU — config terpusat (SB-11)
├─ components/admin/
│  ├─ admin-shell.tsx                     ✎ UBAH — pakai komponen baru; header dipangkas
│  ├─ sidebar/                            ★ BARU — folder komponen sidebar
│  │  ├─ sidebar-content.tsx              ★ BARU — isi bersama (brand+nav+footer) utk desktop & drawer
│  │  ├─ sidebar-nav.tsx                  ★ BARU — render grup & item
│  │  ├─ sidebar-item.tsx                 ★ BARU — 1 item menu (state, badge, marker)
│  │  ├─ mobile-drawer.tsx                ★ BARU — dialog mobile (SB-01/02/05)
│  │  └─ user-menu.tsx                    ★ BARU — dropdown akun (SB-10)
│  ├─ use-sidebar-state.ts                ★ BARU — collapse + persist (SB-09)
│  ├─ use-drawer-focus.ts                 ★ BARU — trap & restore fokus (SB-02)
│  └─ use-lead-badge.ts                   ★ BARU — polling summary lead (SB-07)
├─ app/api/admin/leads/route.ts           ✎ UBAH — param ?summary=1 (SB-07)
├─ app/admin/(dashboard)/*/page.tsx       ✎ UBAH ringan — metadata title (SB-08/13)
└─ app/globals.css                        ✎ UBAH ringan — (opsional) utility scroll-fade
```

### 5.2 Kontrak config — `src/lib/admin-nav.ts`

```ts
import type { LucideIcon } from "lucide-react";
import {
  Inbox, LayoutDashboard, PanelsTopLeft, Files, LayoutGrid, Package, Tags,
  HelpCircle, FolderKanban, Newspaper, Image as ImageIcon, Settings,
} from "lucide-react";

export type LeadBadgeKind = "newLeads";

export type AdminNavItem = {
  /** Label pendek untuk sidebar & rail tooltip. */
  label: string;
  /** Judul lengkap untuk header shell & metadata halaman. */
  title: string;
  href: string;
  icon: LucideIcon;
  /** Badge dinamis yang dirender di item ini. */
  badge?: LeadBadgeKind;
};

export type AdminNavGroup = {
  id: string;
  /** Kosong = grup utama tanpa section label. */
  label?: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: "utama",
    items: [
      { label: "Ringkasan", title: "Ringkasan", href: "/admin", icon: LayoutDashboard },
      { label: "Lead", title: "Lead & Pesan", href: "/admin/leads", icon: Inbox, badge: "newLeads" },
    ],
  },
  {
    id: "konten",
    label: "Konten Website",
    items: [
      { label: "Hero", title: "Hero", href: "/admin/hero", icon: PanelsTopLeft },
      { label: "Konten Beranda", title: "Konten Beranda", href: "/admin/content", icon: Files },
      { label: "Layanan", title: "Layanan", href: "/admin/services", icon: LayoutGrid },
      { label: "Produk", title: "Produk", href: "/admin/products", icon: Package },
      { label: "Harga", title: "Harga", href: "/admin/pricing", icon: Tags },
      { label: "FAQ", title: "FAQ", href: "/admin/faq", icon: HelpCircle },
      { label: "Portofolio", title: "Portofolio", href: "/admin/projects", icon: FolderKanban },
      { label: "Blog", title: "Blog", href: "/admin/blog", icon: Newspaper },
    ],
  },
  { id: "aset", label: "Aset", items: [
    { label: "Media", title: "Media", href: "/admin/media", icon: ImageIcon },
  ]},
  { id: "sistem", label: "Sistem", items: [
    { label: "Pengaturan", title: "Pengaturan", href: "/admin/settings", icon: Settings },
  ]},
];

/** Item aktif = match persis / prefix terpanjang (pindahan `titleForPath`). */
export function matchAdminItem(pathname: string): AdminNavItem | null {
  const items = ADMIN_NAV.flatMap((g) => g.items);
  return [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)) ?? null;
}
```

### 5.3 Kontrak API badge — `GET /api/admin/leads?summary=1`

```
GET /api/admin/leads?summary=1
Auth    : requireAdmin (Bearer token / session) — sama seperti GET biasa
Response: 200 { "summary": { "total": 42, "baru": 3, "diproses": 5, "selesai": 34 } }
Headers : Cache-Control: no-store
Catatan : Branch di awal handler GET yang sudah ada (hindari fetch semua dokumen:
          gunakan aggregation per-field count atau 4 query count() Firestore).
```

### 5.4 Hook — `use-lead-badge.ts` (spesifikasi)

```ts
// Kontrak:
// const { newCount, refresh } = useLeadBadge();
// - fetch /api/admin/leads?summary=1 setiap 60s HANYA saat document.visible
// - refresh() saat visibilitychange → visible & window focus
// - AbortController saat unmount / overlap request
// - return { newCount: number } (0 saat gagal — silent, tanpa error UI)
// - TANPA library tambahan (tanpa SWR/react-query — konsisten codebase)
```

### 5.5 Hook — `use-sidebar-state.ts` (spesifikasi)

```ts
// Kontrak:
// const { collapsed, toggle } = useSidebarState();
// - localStorage key: "lktech:admin-sidebar" ("collapsed" | "expanded")
// - default: expanded; baca di useEffect (SSR-safe), tulis saat toggle
// - hanya berlaku ≥ lg; mobile drawer pakai state `open` terpisah (existing)
// - flicker awal render (default → collapsed) DIIZINKAN (dilakukan mount),
//   catat di Risiko §8
```

### 5.6 Hook — `use-drawer-focus.ts` (spesifikasi)

```ts
// Kontrak:
// const { ref } = useDrawerFocus(open);
// - open=true : simpan activeElement → fokus elemen focusable pertama drawer
// - trap Tab / Shift+Tab dalam drawer
// - open=false: kembalikan fokus ke elemen tersimpan
// - referensi implementasi: media-picker-dialog.tsx (keydown Tab handling)
```

### 5.7 Diagram komponen target

```
AdminShell (admin-shell.tsx)
├─ MobileDrawer (lg:hidden, conditional saat open)          ★ SB-01/02/05
│  └─ SidebarContent variant="drawer" onNavigate={close}
├─ DesktopSidebar (hidden lg:flex, w-64 ↔ w-20)             ★ SB-09
│  └─ SidebarContent variant={collapsed ? "rail" : "expanded"}
├─ Header
│  ├─ Hamburger (lg:hidden, h-11)                           ★ SB-15
│  ├─ RailToggle (hidden lg:flex, PanelLeft*)               ★ SB-09
│  └─ <p> title (dari matchAdminItem(pathname)?.title)      ★ SB-08
└─ <main id="konten" tabIndex={-1}> {children}              ★ SB-04

SidebarContent
├─ Brand (link /admin, ikut onNavigate)
├─ SidebarNav
│  ├─ SidebarGroup × 4 (label / sr-only saat rail)          ★ SB-06
│  └─ SidebarItem × 12 (active, badge, marker, tooltip)     ★ SB-03/07/12
└─ SidebarFooter
   ├─ Link "Lihat Website" (target _blank, rel noreferrer)
   └─ UserMenu (avatar, nama, chevron → dropdown)           ★ SB-10
```

---

## 6. TASK IMPLEMENTATION FLOW (FASE 0–7)

> Tiap fase **berdiri sendiri, bisa dites, dan commit terpisah** (mengikuti gaya commit repo: `feat(dashboard): ...`). Jangan lanjut fase berikut sebelum DoD fase berjalan lolos.

---

### FASE 0 — Persiapan & Baseline (±15 menit)

**Tujuan:** amankan titik mulai & dokumentasikan kondisi awal.

- [ ] 0.1. Baca dokumen ini + `TASK-SELANJUTNYA.md` (quick start).
- [ ] 0.2. Pastikan baseline sehat: `npm run dev` jalan, login admin sukses, 12 halaman bisa diakses.
- [ ] 0.3. `npx tsc --noEmit` bersih; `npm run lint` = baseline (0 error baru).
- [ ] 0.4. (Opsional, disarankan) Branch: `git checkout -b upgrade/sidebar-dashboard`.
- [ ] 0.5. Screenshot "before" sidebar: mobile (375px, drawer terbuka), desktop 1280px, desktop 1920px → simpan untuk perbandingan akhir.

**Verifikasi:** dev server jalan tanpa error console.

---

### FASE 1 — Fondasi: Ekstrak Config & Pecah Komponen (SB-11) — *zero visual diff*

**Tujuan:** refactor struktur murni — tidak ada perubahan visual sama sekali — supaya fase berikut tinggal mengisi.

**Langkah:**
- [ ] 1.1. Buat `src/lib/admin-nav.ts` (kontrak §5.2): tipe + `ADMIN_NAV` (label & title) + `matchAdminItem()`.
- [ ] 1.2. Buat folder `src/components/admin/sidebar/`:
  - `sidebar-content.tsx` — brand + nav + footer (pindahkan markup lama apa adanya).
  - `sidebar-nav.tsx` — loop `ADMIN_NAV` → render item (masih flat, belum grup).
  - `sidebar-item.tsx` — 1 item (markup lama dipindah; **sertakan fix modified-click SB-03 di sini** karena murah: bypass guard saat `metaKey/ctrlKey/shiftKey/altKey/button!==0`).
- [ ] 1.3. Ubah `admin-shell.tsx`:
  - Hapus `NAV` & `titleForPath` → pakai `ADMIN_NAV` + `matchAdminItem`.
  - Render `<SidebarContent />` di posisi aside lama.
  - Pertahankan: state `open`, close-on-route-change (pattern render-phase), Escape listener, guard `useUnsavedNavigation` (dialihkan lewat prop `onNavigate` ke item).
- [ ] 1.4. (Opsional) `use-drawer-focus.ts` — tulis hook terpisah tapi **belum dipasang** (dipasang F2).

**File:** `+ admin-nav.ts, sidebar/*` · `✎ admin-shell.tsx`
**Verifikasi (DoD F1):**
- [ ] Visual **identik** dengan baseline (screenshot diff).
- [ ] Semua 12 halaman aktif & `aria-current` benar.
- [ ] Guard unsaved tetap muncul konfirmasi (uji: buka Layanan → ubah → klik menu lain).
- [ ] `npx tsc --noEmit` bersih.

---

### FASE 2 — Aksesibilitas & Bug Interaksi (SB-01, SB-02, SB-03, SB-04, SB-05, SB-15)

**Tujuan:** semua interaksi keyboard/screen-reader benar. Fase paling penting secara kualitas.

**Langkah:**
- [ ] 2.1. **Pisahkan drawer & desktop sidebar** (SB-01):
  - Buat `mobile-drawer.tsx`: conditional render `{open && (...)}` hanya `<lg`, wrapper `role="dialog" aria-modal="true" aria-label="Menu dashboard"`; backdrop `aria-hidden="true"` + animasi fade (`AnimatePresence` — framer-motion sudah ada).
  - `admin-shell.tsx`: aside desktop `hidden lg:flex ...` (tanpa `fixed`/`translate` lagi), drawer mobile terpisah. Keduanya memakai `SidebarContent`.
- [ ] 2.2. **Pasang `use-drawer-focus`** (SB-02): fokus → tombol tutup saat buka; trap Tab/Shift+Tab; restore fokus ke hamburger saat tutup. Escape tetap menutup (pindah listener ke dalam hook agar tidak dobel).
- [ ] 2.3. **`id="konten"` + `tabIndex={-1}`** pada `<main>` shell (SB-04) → SkipLink global langsung hidup di admin.
- [ ] 2.4. Perbesar touch target: hamburger & tombol tutup → `h-11 w-11`; tambah `type="button"` (SB-15).
- [ ] 2.5. Verifikasi modified-click fix dari F1 (Ctrl/Cmd/Shift+Alt+Click → tab baru, guard tidak jalan; klik biasa → guard jalan).

**File:** `+ mobile-drawer.tsx, use-drawer-focus.ts` · `✎ admin-shell.tsx, sidebar-item.tsx`
**Verifikasi (DoD F2):**
- [ ] Mobile (<lg), drawer tertutup: **Tab tidak pernah** menyentuh link sidebar.
- [ ] Buka drawer → fokus otomatis di tombol tutup; Tab ter-loop dalam drawer; Escape → drawer tutup & fokus kembali ke hamburger.
- [ ] Ctrl+Click menu → membuka tab baru (guard unsaved TIDAK memblokir).
- [ ] Tab pertama di halaman admin menampilkan SkipLink → Enter → fokus lompat ke konten utama.
- [ ] Screen reader (spot check NVDA/VoiceOver): buka drawer terumumkan sebagai dialog.
- [ ] `npx tsc --noEmit` & `npm run lint` bersih dari error baru.

---

### FASE 3 — IA: Grouping, Heading & Judul (SB-06, SB-08, SB-13)

**Tujuan:** menu mudah discan, struktur heading bersih, judul konsisten.

**Langkah:**
- [ ] 3.1. **Grouping nav** (SB-06): render per `AdminNavGroup` — section label kecil uppercase (`§4.5`), grup "Utama" tanpa label. Tambah pemisah visual halus antar grup (`mt-4` + label, tanpa border keras).
- [ ] 3.2. **Header judul jadi non-heading** (SB-08): `<h1>` → `<p>`; sumber dari `matchAdminItem(pathname)?.title ?? "Dashboard"`.
- [ ] 3.3. **Metadata per halaman** (SB-13): di tiap `page.tsx` admin tambah:
  ```ts
  import type { Metadata } from "next";
  export const metadata: Metadata = { title: "Lead & Pesan" }; // sesuai config title
  ```
  → `document.title` = "Lead & Pesan | LKTech".
- [ ] 3.4. Rapikan `<h1>` halaman bila perlu agar selaras dengan `title` config (mis. "Konten Beranda", "Lead & Pesan").

**File:** `✎ sidebar-nav.tsx, admin-shell.tsx, app/admin/(dashboard)/*/page.tsx (12 file, edit kecil)`
**Verifikasi (DoD F3):**
- [ ] Sidebar menampilkan 4 grup dengan label; "Utama" tanpa label.
- [ ] Satu halaman = satu `<h1>` (inspek DOM).
- [ ] Header menampilkan judul lengkap ("Lead & Pesan") yang SAMA dengan `<h1>` halaman & `document.title`.
- [ ] Navigasi antar halaman: judul header & tab browser berubah benar.

---

### FASE 4 — Fitur UX Inti: Badge, Rail, User Menu (SB-07, SB-09, SB-10)

**Tujuan:** sidebar jadi navigator yang "hidup" & personal. Fase terbesar — kerjakan bertahap (4a → 4b → 4c).

**Langkah 4a — Badge lead baru (SB-07):**
- [ ] 4a.1. Ubah `src/app/api/admin/leads/route.ts`: branch awal GET untuk `?summary=1` → hitung count per status (query count Firestore per status, jangan pull semua dokumen) → `{ summary: {...} }`, `Cache-Control: no-store`.
- [ ] 4a.2. Buat `use-lead-badge.ts` (spesifikasi §5.4): polling 60s visibility-aware + refresh on focus.
- [ ] 4a.3. `sidebar-item.tsx`: render badge `newLeads` (spesifikasi §4.5: pill rose, `99+`, hidden saat 0, `aria-label`).
- [ ] 4a.4. Uji: kirim lead via form kontak publik → dalam ≤60s badge muncul tanpa refresh.

**Langkah 4b — Collapse/rail desktop (SB-09):**
- [ ] 4b.1. Buat `use-sidebar-state.ts` (spesifikasi §5.5): `collapsed` + `toggle` + persist `localStorage["lktech:admin-sidebar"]`.
- [ ] 4b.2. `admin-shell.tsx`: aside desktop `w-64 ↔ w-20` + `transition-[width] duration-300`; tombol toggle di header (`PanelLeftClose`/`PanelLeftOpen`, `aria-label`, `aria-pressed`, `hidden lg:grid`).
- [ ] 4b.3. `SidebarContent variant="rail"`: item icon-only (`justify-center`, `title` tooltip + `aria-label`), section label `sr-only`, badge jadi dot mini + angka di pojok icon, brand hanya kotak "LK", footer hanya avatar + icon link.
- [ ] 4b.4. Uji persist: collapse → reload → tetap collapsed; hapus localStorage → kembali expanded.

**Langkah 4c — User menu (SB-10):**
- [ ] 4c.1. Buat `user-menu.tsx`: tombol (avatar inisial + nama + `ChevronDown`, `aria-haspopup="menu"` `aria-expanded`) → dropdown (`role="menu"`): blok info (nama, email), item "Lihat Website" (`role="menuitem"`), item "Keluar" (warna rose, `role="menuitem"`).
- [ ] 4c.2. Perilaku: tutup via Escape / klik luar (`mousedown` listener) / pilih item; fokus kembali ke tombol; navigasi item tetap lewat guard `useUnsavedNavigation`? — *Keluar* tidak lewat guard (langsung logout — sesuai behavior existing; beforeunload tetap jalan via provider).
- [ ] 4c.3. Logout: reuse `clearAdminSession() → signOutUser() → router.replace("/admin/login")` + busy state (`Loader2` pada item Keluar, tombol disabled).
- [ ] 4c.4. Bersihkan header: hapus blok nama/email/avatar/tombol Keluar dari header (pindah ke user menu).

**File:** `+ use-lead-badge.ts, use-sidebar-state.ts, user-menu.tsx` · `✎ leads/route.ts, sidebar-item.tsx, sidebar-content.tsx, admin-shell.tsx`
**Verifikasi (DoD F4):**
- [ ] Badge akurat (bandingkan dengan halaman Lead), hilang saat status diubah jadi non-"baru".
- [ ] Polling berhenti saat tab hidden (cek Network tab), lanjut saat kembali.
- [ ] Rail: semua menu tetap bisa diklik & aktif terlihat; tooltip muncul; badge terbaca.
- [ ] Reload mempertahankan state collapse; mobile tidak terpengaruh state collapse.
- [ ] User menu: buka/tutup keyboard penuh; logout sukses → redirect login; "Lihat Website" buka tab baru.
- [ ] Header kini hanya: hamburger/toggle + judul.
- [ ] `npx tsc --noEmit` bersih; `npm run build` sukses.

---

### FASE 5 — Polish Visual & Motion (SB-12, SB-14, SB-16)

**Tujuan:** detail kecil yang membuat terasa "proper & mahal".

- [ ] 5.1. **Rail marker item aktif** (SB-12): bar vertikal kiri pada item aktif (spesifikasi §4.5).
- [ ] 5.2. **Scroll affordance** (SB-14): gradient fade atas/bawah nav saat bisa scroll ke arah tsb (state `scrollTop`/`scrollHeight` via `onScroll`, render `<div>` gradient pointer-events-none).
- [ ] 5.3. **Backdrop fade** (SB-16): pastikan `AnimatePresence` exit animation backdrop & drawer bekerja (enter + exit).
- [ ] 5.4. (Opsional) **Env chip** (SB-16): saat `process.env.NODE_ENV !== "production"` → chip "DEV" kecil di footer sidebar.
- [ ] 5.5. Audit visual menyeluruh: spacing konsisten (skala 1/1.5/2/3/4), ukuran icon konsisten (`h-4 w-4` list, `h-5 w-5` rail), kontras teks ≥ 4.5:1 (section label slate-400 pada putih = 3.0:1 — **gunakan slate-500** agar ≥4.5 untuk teks fungsional; slate-400 hanya bila dianggap dekoratif).

**File:** `✎ sidebar-item.tsx, sidebar-nav.tsx, sidebar-content.tsx, mobile-drawer.tsx, (globals.css bila perlu utility)`
**Verifikasi (DoD F5):** screenshot after vs before di 375/1280/1920; `prefers-reduced-motion` (simulate) → tanpa animasi; kontras lolos (axe DevTools spot check).

---

### FASE 6 — Pengayaan OPSIONAL (nice to have — hanya bila waktu ada)

- [ ] 6.1. **Command palette `Ctrl/Cmd+K`**: dialog pencarian menu (sumber `ADMIN_NAV` + aksi "Lihat Website", "Keluar"), filter substring case-insensitive, navigasi arrow + Enter, Escape tutup, fokus trap (reuse pola `use-drawer-focus`/media-picker). Komponen `command-palette.tsx`, dipasang di `admin-shell.tsx`. **Tanpa library baru.**
- [ ] 6.2. **Shortcut `[`** toggle rail (desktop), didaftarkan bersama palette; jangan intercept saat fokus di input/textarea/contenteditable.
- [ ] 6.3. (Jauh lebih besar — pertimbangkan dokumen terpisah) Dark mode dashboard.

> ⚠️ Fase ini **opsional**. Jangan sampai memperlambat QA. Command palette punya nilai produktivitas tinggi untuk admin power-user; sisanya bisa dilewati.

---

### FASE 7 — QA Menyeluruh, Dokumentasi & Deploy

- [ ] 7.1. `npm run lint` (0 error baru) · `npx tsc --noEmit` bersih · `npm run build` sukses.
- [ ] 7.2. Jalankan **seluruh checklist QA §7** (manual, semua breakpoint & skenario).
- [ ] 7.3. Uji regresi fitur tetangga: guard unsaved (form Layanan/Konten), toast di atas semua layer, auth guard & pesan "tidak punya akses", proxy redirect `?next=`, logout, ekspor CSV lead.
- [ ] 7.4. Screenshot "after" final; bandingkan dengan baseline F0.
- [ ] 7.5. Update dokumen: status dokumen ini → ✅ Dieksekusi; `docs/README.md` (tabel daftar dokumen); `TASK-SELANJUTNYA.md` (ringkasan sesi + sisa manual).
- [ ] 7.6. Commit per fase (sudah terbiasa) → `git push` → verifikasi deploy Vercel → uji produksi (login, badge, rail persist).
- [ ] 7.7. (Jika ada perubahan Firestore query baru — tidak ada di rencana ini, hanya count pada koleksi `leads` yang sudah ada → **tidak perlu** publish ulang `firestore.rules`.)

---

## 7. Definition of Done & Checklist QA

### 7.1 Definition of Done (global)

1. `npx tsc --noEmit` bersih, `npm run build` sukses, `npm run lint` tanpa error baru (baseline repo = bersih sejak commit `f09a220`).
2. **Semua** item checklist QA §7.2–§7.6 lolos.
3. Tidak ada regresi pada: guard unsaved-changes, toast, auth flow, proxy gate, semua CRUD manager.
4. Semua temuan SB-01 … SB-16 berstatus solved (atau explicitly deferred dengan alasan).
5. Dokumentasi diperbarui (dokumen ini, `docs/README.md`, `TASK-SELANJUTNYA.md`).

### 7.2 Responsif

- [ ] 320px & 375px: drawer penuh fungsi; konten tidak overflow horizontal.
- [ ] 768px (tablet): drawer (bukan rail); hamburger terlihat.
- [ ] 1024px / 1280px / 1440px / 1920px: sidebar inline; toggle rail bekerja; konten full-width.
- [ ] Tinggi viewport 600–700px: nav scroll + fade bekerja; brand & footer tetap terlihat.

### 7.3 Keyboard & screen reader

- [ ] Tab pertama → SkipLink terlihat & bekerja (fokus ke `#konten`).
- [ ] Drawer tertutup = nol elemen sidebar di tab order (mobile).
- [ ] Buka drawer → fokus masuk; Tab/Shift+Tab ter-trap; Escape → tutup + fokus kembali.
- [ ] Semua item menu punya nama terbaca (label / `aria-label` di rail) & `aria-current` benar.
- [ ] User menu: `aria-expanded` benar; Escape tutup; fokus kembali.
- [ ] Badge punya `aria-label` ("3 lead baru").
- [ ] NVDA/VoiceOver spot check: dialog drawer terumumkan; menu terbaca; item aktif terumumkan.

### 7.4 Fungsional

- [ ] 12 halaman navigasi benar; item aktif akurat (termasuk `/admin` exact vs prefix).
- [ ] Guard unsaved: pindah menu dengan form kotor → konfirmasi; "Buang & pindah" & "Tetap di sini" bekerja.
- [ ] Ctrl/Cmd/Shift+Alt+Click menu → tab baru (tanpa guard).
- [ ] Badge lead baru: muncul ≤60s setelah submit form kontak; hilang setelah status diubah; `99+` benar; polling pause saat hidden.
- [ ] Rail: persist lintas reload; mobile tidak terdampak.
- [ ] Logout dari user menu: busy state → redirect `/admin/login`; session cookie & Firebase signOut terjadi (tidak bisa back-button masuk dashboard).
- [ ] "Lihat Website" membuka tab baru (`target="_blank" rel="noopener noreferrer"`).

### 7.5 Visual & motion

- [ ] Rail marker aktif terlihat; state hover/active/focus konsisten.
- [ ] Transisi width & backdrop halus; `prefers-reduced-motion` → instan.
- [ ] Kontras teks fungsional ≥ 4.5:1 (section label pakai slate-500).
- [ ] Tidak ada layout shift aneh saat toggle rail (konten menyesuaikan mulus).

### 7.6 Regresi tetangga

- [ ] Toast tetap tampil di atas drawer/user menu (z-index aman).
- [ ] Halaman login admin tidak terdampak (di luar `(dashboard)`).
- [ ] Prod build: cek hydration warning di console (khususnya localStorage rail state).

---

## 8. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Refactor F1 memecah shell → regresi layout | Tinggi | F1 = zero-visual-diff; screenshot diff; jangan campur perubahan visual ke F1. |
| R2 | LocalStorage rail state → hydration mismatch (SSR) | Sedang | Baca hanya di `useEffect`; render default expanded; flicker 1 frame diizinkan; jika bermasalah → pindah ke cookie yang dibaca server (upgrade later). |
| R3 | Focus trap baru bentrok dengan trap existing (media-picker) | Sedang | Hook baru terpisah; JANGAN refactor media-picker di sesi ini (out of scope). |
| R4 | Polling badge menambah beban API | Rendah | 60s + visibility-aware + `no-store` kecil (4 count query); abort saat unmount. |
| R5 | Endpoint summary menambah kompleksitas ke route leads | Rendah | Branch kecil di awal GET; tetap satu file; uji manual via curl dengan token admin. |
| R6 | Perubahan label menu membingungkan admin yang terbiasa | Rendah | Label sidebar dipertahankan pendek & sama semaksimal mungkin; hanya "Konten" → "Konten Beranda" yang berubah (lebih jelas). |
| R7 | Command palette (F6) scope creep | Sedang | Ditandai opsional; timebox; tanpa library baru. |
| R8 | Temuan baru muncul saat eksekusi | — | Catat sebagai `SB-17+` di dokumen ini; jangan silently fix. |

---

## 9. Out of Scope

- **Dark mode dashboard** (butuh audit token warna global — buat dokumen terpisah bila diinginkan).
- **Multi-level / nested submenu** (belum ada kebutuhan rute nested).
- **Role-based menu** (admin tunggal via `ADMIN_EMAILS`; tidak ada multi-role).
- **Refactor focus-trap media-picker-dialog** ke hook bersama (dicatat sebagai utang teknis terpisah).
- **Swipe gesture** drawer mobile (nilai rendah).
- **i18n / bilingual**.
- Perubahan pada area publik & user (di luar shell admin).

---

## 10. Estimasi & Urutan Pengerjaan yang Disarankan

| Fase | Isi | Estimasi | Nilai |
|---|---|---|---|
| F0 | Persiapan & baseline | 15 mnt | — |
| F1 | Ekstrak config + pecah komponen (zero diff) | ±1 jam | Fondasi wajib |
| F2 | A11y & bug interaksi (drawer, fokus, skip link, modified click) | ±2 jam | 🔴 Tertinggi |
| F3 | Grouping + heading + metadata | ±1 jam | 🟠 Tinggi |
| F4 | Badge + rail + user menu | ±3–4 jam | 🟠 Tinggi (paling "terasa") |
| F5 | Polish visual & motion | ±1–2 jam | 🔵 Medium |
| F6 | Command palette + shortcut (opsional) | ±2 jam | ✨ Nice |
| F7 | QA menyeluruh + docs + deploy | ±1–2 jam | Wajib |

**Urutan disarankan:** F0 → F1 → F2 → F3 → **(commit & deploy aman di titik ini)** → F4 → F5 → F7. F6 hanya bila waktu sisa.
**Bila waktu hanya 1 sesi:** F0–F3 + F4a (badge saja) sudah memberikan lompatan kualitas terbesar dengan risiko terkecil.

---

## 11. Lampiran — Referensi Pola Existing

Pola yang **sudah ada di codebase** dan dipakai ulang (jangan tulis dari nol):

| Kebutuhan | Referensi existing |
|---|---|
| Focus trap keyboard (dialog) | `media-picker-dialog.tsx` (keydown Tab handling ±L252) · `confirm-dialog.tsx` (pola fokus ke tombol utama) |
| Escape-to-close | `admin-shell.tsx` (drawer) · `media-card.tsx` · `media-detail-panel.tsx` |
| Conditional dialog + backdrop + `aria-modal` | `confirm-dialog.tsx` |
| Animasi enter/exit | `framer-motion` `AnimatePresence` di `toast.tsx` |
| Longest-prefix match judul | `titleForPath` di `admin-shell.tsx` (dipindah ke `matchAdminItem`) |
| Guard navigasi | `unsaved-changes.tsx` → `useUnsavedNavigation()` |
| Logout flow | `admin-shell.tsx` `onLogout` (clearAdminSession → signOutUser → replace) |
| Skip link | `skip-link.tsx` + utility `sr-only-focusable` di `globals.css` |
| Toast layering | `toast.tsx` `z-[12000]` (aman di atas drawer `z-40`) |
| Pattern adjust-state-saat-render | `admin-shell.tsx` `lastPath` (pertahankan!) |
| RequireAdmin API | `api/admin/leads/route.ts` (struktur guard + error handling) |

---

## CATATAN PENUTUP

Dokumen ini disusun agar bisa dieksekusi **lintas sesi** tanpa kehilangan konteks: mulai dari F0, ikuti fase berurutan, centang checklist, dan catat setiap penyimpangan/temuan baru sebagai `SB-17+`. Fase 1–2 memberikan perbaikan kualitas paling fundamental (aksesibilitas & interaksi), fase 3–5 memberikan lompatan visual/UX yang paling terasa oleh pengguna akhir.

> Setelah eksekusi dimulai, update status di header dokumen ini dan tabel di `docs/README.md`.

---

## 12. STATUS EKSEKUSI

> **Dieksekusi:** 2026-10-02 · **Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih (0 error/0 warning) ✅ · `npm run build` sukses ✅ · smoke test dev server ✅

### 12.1 Ringkasan per fase

| Fase | Isi | Status | Catatan |
|---|---|---|---|
| **F0** | Persiapan & baseline | ✅ | tsc & lint baseline bersih sebelum mulai. |
| **F1** | Ekstrak config + pecah komponen | ✅ | `admin-nav.ts` + folder `sidebar/` (`sidebar-item`, `sidebar-nav`, `sidebar-content`); shell direwrite. |
| **F2** | Aksesibilitas & bug interaksi | ✅ | Drawer conditional-render + `role="dialog"`; focus trap/restore; `inert` pada konten saat drawer buka; `id="konten"`; touch target ≥44px; modified-click fix. |
| **F3** | IA: grouping, heading, judul | ✅ | 4 grup + section label (slate-500, kontras aman); header judul jadi `<p>`; metadata `title` di 12 halaman + `title.absolute` di `admin/layout`. |
| **F4** | Badge + rail + user menu | ✅ | Endpoint `?summary=1` (count aggregation); badge lead baru (polling 60s visibility-aware); rail `w-20` persist localStorage; `UserMenu` di footer (dropdown aksesibel) + logout. |
| **F5** | Polish visual & motion | ✅ | Rail marker item aktif; scroll-fade nav (ResizeObserver + onScroll); backdrop/drawer animasi `AnimatePresence`; touch target 44px. |
| **F6** | Pengayaan (opsional) | ✅ | Command palette `Ctrl/Cmd+K` (+ tombol cari di header); shortcut `[` toggle rail; tanpa dependency baru. |
| **F7** | QA, dokumentasi & deploy | ⚠️ Sebagian | QA statis + smoke test runtime **selesai**; uji manual di browser (visual/keyboard/SR) & deploy = **manual oleh pemilik**. |

### 12.2 Temuan audit → status penyelesaian

| ID | Temuan | Status |
|---|---|---|
| SB-01 | Drawer tertutup masih tabbable | ✅ Conditional render → tidak ada di DOM saat tutup. |
| SB-02 | Tanpa focus trap / restore | ✅ `use-drawer-focus.ts` (trap Tab/Shift+Tab, fokus ke tombol tutup via `data-autofocus`, restore ke hamburger). |
| SB-03 | Modified click rusak | ✅ Bypass guard saat `metaKey/ctrlKey/shiftKey/altKey/button!==0`. |
| SB-04 | SkipLink mati di admin | ✅ `id="konten"` + `tabIndex={-1}` pada `<main>`. |
| SB-05 | Tanpa semantik dialog | ✅ `role="dialog"` + `aria-modal` + `aria-label`; `inert` pada konten utama. |
| SB-06 | 12 menu flat | ✅ 4 grup: Utama / Konten Website / Aset / Sistem. |
| SB-07 | Tanpa badge lead baru | ✅ Badge `newLeads` (polling, `99+`, hilang saat 0, `aria-label`). |
| SB-08 | Dobel h1 + label tidak konsisten | ✅ Header `<p>`; label NAV pendek, `title` lengkap untuk header/metadata. |
| SB-09 | Tanpa collapse/rail desktop | ✅ Rail `w-20` + toggle header + persist `localStorage["lktech:admin-sidebar"]`. |
| SB-10 | Tanpa user menu | ✅ `user-menu.tsx` di footer (dropdown full keyboard, logout + busy state). |
| SB-11 | Config NAV hardcoded | ✅ `src/lib/admin-nav.ts` (single source of truth). |
| SB-12 | Rail marker item aktif | ✅ Bar vertikal pada item aktif. |
| SB-13 | document.title statis | ✅ Metadata per halaman. |
| SB-14 | Scroll affordance nav | ✅ Fade atas/bawah dinamis. |
| SB-15 | Touch target kecil | ✅ Hamburger/tutup/toggle `h-11 w-11`. |
| SB-16 | Backdrop instan + env chip | ✅ Animasi fade backdrop; env chip **dilewati** (tidak esensial). |

### 12.3 File baru & diubah

**Baru:**
- `src/lib/admin-nav.ts` — config nav terpusat (grup, `label`/`title`, badge, `matchAdminItem`, `isAdminItemActive`).
- `src/components/admin/sidebar/sidebar-item.tsx` — item menu (state, badge, marker, modified-click).
- `src/components/admin/sidebar/sidebar-nav.tsx` — render grup + scroll-fade.
- `src/components/admin/sidebar/sidebar-content.tsx` — isi bersama (brand + nav + footer).
- `src/components/admin/sidebar/mobile-drawer.tsx` — drawer mobile (dialog semantics + animasi).
- `src/components/admin/sidebar/user-menu.tsx` — menu akun dropdown.
- `src/components/admin/sidebar/use-escape.ts` — listener Escape conditional.
- `src/components/admin/use-drawer-focus.ts` — focus trap & restore.
- `src/components/admin/use-sidebar-state.ts` — collapse + persist (via `useSyncExternalStore`).
- `src/components/admin/use-lead-badge.ts` — polling badge lead.
- `src/components/admin/command-palette.tsx` — command palette `Ctrl/Cmd+K`.

**Diubah:**
- `src/components/admin/admin-shell.tsx` — rewrite: aside desktop rail/expanded + `MobileDrawer` + header baru (toggle rail, judul konteks `<p>`, tombol cari) + `id="konten"` + `inert` + shortcut global.
- `src/app/api/admin/leads/route.ts` — branch `?summary=1` (count per status, `no-store`).
- `src/app/admin/layout.tsx` — `title.absolute`.
- 12 × `src/app/admin/(dashboard)/*/page.tsx` — `export const metadata` (judul per halaman).

### 12.4 Keputusan teknis (deviasi kecil dari rencana — lebih baik)

1. **`useSidebarState` memakai `useSyncExternalStore`** (bukan baca `localStorage` di `useEffect`). Alasan: menghindari pelanggaran aturan React 19 `react-hooks/set-state-in-effect` (konvensi repo sejak commit `f09a220`) sekaligus **bebas hydration mismatch** (server snapshot stabil). Efek samping positif: sinkron antar-tab.
2. **Command palette & shortcut** dikerjakan (F6 ditandai opsional) — tanpa dependency baru.
3. **Env chip (SB-16)** dilewati — nilai rendah, tidak esensial.
4. Reset/clamp state pada `CommandPalette` memakai pola **render-phase** (`prevOpen`, clamp `safeActive`) — konsisten dengan konvensi repo, menghindari `set-state-in-effect`.
5. **`inert`** pada kolom konten saat drawer terbuka — melengkapi `aria-modal` agar fokus benar-benar tidak bisa "lolos" ke belakang.

### 12.5 Verifikasi (QA statis & runtime)

```
npx tsc --noEmit          → bersih (0 error)
npx eslint .              → bersih (0 error, 0 warning)
npm run build             → ✓ Compiled successfully
```

Smoke test dev server (`npm run dev`):
- `GET /admin/login` → **200** (render OK)
- `GET /admin/leads` (terlindungi) → **307** → `/admin/login?next=%2Fadmin%2Fleads` (proxy gate OK)
- `GET /` (publik) → **200** (tidak ada regresi)
- `GET /api/admin/leads?summary=1` (tanpa auth) → **401** `{"error":"Tidak terautentikasi."}` (guard OK)

### 12.6 Sisa manual (belum otomatis) — untuk pemilik

- [ ] **Uji manual di browser**: responsif (320/375/768/1024/1280/1920), keyboard (Tab/SkipLink/Escape/trap/`[`/`Ctrl+K`), screen reader (dialog drawer, badge, user menu).
- [ ] **Uji fungsional**: badge lead baru muncul ≤60s setelah submit form kontak; rail persist setelah reload; guard unsaved saat form kotor; logout dari user menu.
- [ ] **Deploy**: `git push` ke `main` → Vercel build otomatis → uji produksi.
- [ ] (Jika perlu) sesuaikan preferensi default rail/expanded sesuai kebiasaan admin.

### 12.7 Catatan operasional

- Tidak ada koleksi Firestore baru → **tidak perlu** publish ulang `firestore.rules`. Query `count()` pada `leads` menggunakan index otomatis (single-field equality) — tanpa composite index.
- Endpoint baru hanya branch di route lama (`GET /api/admin/leads?summary=1`) — tidak menambah route.
- Preferensi collapse disimpan di `localStorage` key `lktech:admin-sidebar` (per-browser, per-device).

> Dibuat oleh sesi eksekusi 2026-10-02. Jika ada temuan baru, catat sebagai `SB-17+` di bagian audit (§3).
