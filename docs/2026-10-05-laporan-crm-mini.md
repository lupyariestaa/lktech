# FASE DETAIL — Laporan Otomatis & CRM Mini (Tema 3 lanjutan)

> **Status:** 🚧 Sedang dikerjakan — **L1–L4 selesai**; L5–L6 belum.
> **Disusun:** sesi pasca-Operasional (Tema 4) — rekomendasi roadmap.
> **Tema roadmap:** **Tema 3 — Kepercayaan & Skala → 3.2 Lead Scoring & Pipeline CRM mini** + **3.3 Laporan & Ekspor Otomatis** (`docs/2026-10-06-roadmap-pengembangan.md`).
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-02-orders-admin-module.md`, `docs/2026-10-05-analitik-penjualan.md`, `TASK-SELANJUTNYA.md`.
> **Prinsip:** server-authoritative, observability, a11y, mobile-first, **backward-compatible**, dokumentasi fase.

---

## 1. Ringkasan & Tujuan

Memanfaatkan infrastruktur yang **sudah ada** (lead + status, analitik penjualan, email Resend, cron eksternal) untuk:

1. **CRM mini**: lead punya **skor** otomatis + **pipeline** (Kanban) + **timeline aktivitas**.
2. **Laporan otomatis**: ringkasan bisnis mingguan dikirim ke email admin (cron eksternal) + ringkasan "kesehatan bisnis" (KPI vs periode lalu) di dashboard.

**Hasil yang diharapkan:**
- Admin bisa menilai prioritas lead (skor) & mengelola tahapan (pipeline) tanpa spreadsheet.
- Admin menerima laporan mingguan otomatis (omzet, order, lead, kupon, produk terlaris).
- Dashboard menampilkan ringkasan KPI vs periode sebelumnya (`deltas` sudah ada).

---

## 2. Keputusan Desain Kunci

### 2.1 Model data lead (diperluas, backward-compatible)
```ts
type LeadPipelineStage = "baru" | "dihubungi" | "proposal" | "menang" | "kalah";

type LeadActivity = {
  id: string;
  type: "catatan" | "status" | "panggilan" | "email" | "wa" | "sistem";
  note: string;
  actor: string;
  atISO: string;
};

// Field BARU pada leads/{id} (opsional — lead lama tetap valid):
{
  score?: number;              // 0..100, dihitung otomatis (bisa di-override manual nanti)
  stage?: LeadPipelineStage;   // default "baru"; terpisah dari `status` (status tetap ada utk kompat)
  activities?: LeadActivity[]; // timeline (dibatasi jumlah)
  lastActivityAtISO?: string;
}
```
> **Catatan kompatibilitas:** `status` (baru/diproses/selesai/arsip) **tetap** ada & dipakai (jangan dihapus). `stage` adalah lapisan pipeline baru yang lebih kaya. Pemetaan otomatis: `status=baru`↔`stage=baru`, `diproses`↔`dihubungi`, `selesai`↔`menang`, `arsip`↔`kalah` (dijaga sinkron saat salah satu diubah).

### 2.2 Lead scoring (murni & teruji)
Skor 0..100 dari **data nyata** (tanpa ML):
- **Sumber**: form website vs WhatsApp vs referensi.
- **Kelengkapan**: panjang pesan, ada telepon/email.
- **Layanan** yang diminta (bobot per kategori bila perlu).
- **Kecepatan/kualitas**: (opsional) kesesuaian.
> Fungsi murni `computeLeadScore(lead)` di `lead-scoring-pure.ts` (teruji).

### 2.3 Pipeline (Kanban)
- Kolom: Baru → Dihubungi → Proposal → Menang → Kalah.
- Drag/tombol ubah stage via `PATCH /api/admin/leads {id, stage}`.
- Menyinkronkan `status` pendamping agar badge/laporan lama tetap konsisten.

### 2.4 Laporan otomatis
- `GET /api/cron/weekly-report?token=<CRON_SECRET>` (fail-closed): susun ringkasan 7 hari
  (omzet, jumlah order, order dibayar, lead baru, kupon terpakai, produk terlaris, konversi),
  kirim email ke `LEAD_NOTIFY_EMAILS` via Resend.
- Ringkasan **"Kesehatan Bisnis"** di `/admin` (dashboard): KPI periode ini vs sebelumnya (deltas).

---

## 3. Arsitektur Teknis

### 3.1 File/modul baru (rencana)
| File | Peran |
| --- | --- |
| `src/lib/lead-scoring-pure.ts` | Skor & konstanta pipeline (murni, teruji). |
| `src/lib/lead-crm.ts` | Data layer: update stage, tambah/hapus aktivitas, recompute score (server-only). |
| `src/lib/weekly-report.ts` | Susun data laporan mingguan (server-only). |
| `src/lib/email-report.ts` | Template & kirim email laporan (server-only). |
| `src/app/api/admin/leads/[id]/activities/route.ts` | CRUD aktivitas lead. |
| `src/app/api/cron/weekly-report/route.ts` | Cron kirim laporan (fail-closed). |
| `src/components/admin/lead-pipeline-board.tsx` | Kanban pipeline. |
| `src/components/admin/lead-timeline.tsx` | Timeline aktivitas + form catatan. |
| `src/components/admin/business-health.tsx` | Ringkasan KPI vs periode lalu (dashboard). |

### 3.2 Perubahan file
- `src/lib/lead-types.ts` — tambah `score`/`stage`/`activities` (opsional).
- `src/lib/api-schemas.ts` — schema stage & aktivitas.
- `src/app/api/admin/leads/route.ts` — dukung `stage` + `activities` + scoring.
- `src/components/admin/leads-manager.tsx` — kolom skor, board pipeline, timeline.
- `src/lib/admin-nav.ts` — (opsional) menu Laporan.
- `firestore.rules` — catat (catch-all sudah menolak klien).

---

## 4. A11y & UX
- Kanban: tiap kolom `role="list"`, kartu fokusabel; ubah stage via tombol/select (drag opsional).
- Skor: badge + `title`/tooltip penjelasan.
- Timeline: `<ol>` semantik; form catatan berlabel.
- Mobile-first: Kanban scroll horizontal mulus.

---

## 5. Fase Eksekusi

### FASE L1 — Model & scoring (murni) + data layer
- `lead-scoring-pure.ts` (computeLeadScore + konstanta stage + pemetaan status↔stage) + test.
- `lead-types.ts` diperluas (backward-compat).
- `lead-crm.ts` data layer; `api/admin/leads` recompute score saat create/status.

> **Status L1:** ✅ `lead-scoring-pure.ts` (skor + tier + pemetaan status↔stage, teruji 10),
> `lead-types.ts` diperluas (`score`/`stage`/`activities`), `lead-crm.ts` (recompute skor, ubah stage + aktivitas),
> `POST /api/lead` menghitung skor saat create, `PATCH /api/admin/leads` mendukung `status`/`stage`/`activity`,
> klien `updateLeadStage`/`addLeadActivity`. Verifikasi: tsc/eslint/build bersih; `test:leads` (10) lolos.

### FASE L2 — Pipeline Kanban
- Board + API patch stage; sinkron `status` pendamping.

> **Status L2:** ✅ `lead-pipeline-board.tsx` (5 kolom, drag&drop + tombol ‹ ›, a11y `role="list"`),
> toggle tampilan **Daftar ⇄ Pipeline** di `leads-manager`, `lead-score-badge.tsx`, dialog detail lead.

### FASE L3 — Timeline aktivitas
- API aktivitas + UI timeline + form catatan.

> **Status L3:** ✅ `GET /api/admin/leads/[id]/activities` + `lead-timeline.tsx` (muat + tambah catatan/panggilan/email/wa),
> terpasang di dialog detail lead. Perubahan tahap otomatis tercatat aktivitas (`updateLeadStage`).

### FASE L4 — Laporan mingguan otomatis
- `weekly-report.ts` + `email-report.ts` + `/api/cron/weekly-report` (fail-closed CRON_SECRET).

> **Status L4:** ✅ `report-pure.ts` (agregat murni + delta, teruji 9), `weekly-report.ts` (kumpulkan order/lead/kupon/produk 7 hari + pembanding), `email-report.ts` (template HTML+teks, kirim ke `LEAD_NOTIFY_EMAILS`), `/api/cron/weekly-report` (fail-closed, `?days=` opsional). Dijadwalkan dari cron eksternal (mis. tiap Senin).

### FASE L5 — Kesehatan bisnis di dashboard
- `business-health.tsx` (KPI vs periode lalu; reuse `getSalesAnalytics` deltas).

### FASE L6 — QA & dokumentasi
- `tsc`/`lint`/`build` bersih; unit test scoring & pemetaan.
- Update `TASK-SELANJUTNYA.md`, `docs/README.md`, roadmap.

---

## 6. Risiko & Mitigasi
| Risiko | Mitigasi |
| --- | --- |
| Lead lama tanpa `score`/`stage` | Default aman (skor dihitung, stage dari `status`) — backward-compat |
| Skor "palsu"/mengada-ada | Berbasis data nyata (sumber/panjang/kontak), transparan (fungsi murni) |
| Email laporan gagal | Best-effort + status dicatat; endpoint cron fail-closed |
| Duplikasi status vs stage | Pemetaan tunggal (murni) + sinkronisasi dua arah |

---

## 7. Definition of Done
1. `tsc`/`lint`/`build` bersih; unit test scoring/pemetaan.
2. Skor & stage dihitung/di-set server-side; lead lama tetap jalan.
3. Laporan mingguan terkirim via cron (fail-closed); terukur & tercatat.
4. A11y (Kanban/list/timeline) & mobile-first.
5. Dokumentasi fase diperbarui.
