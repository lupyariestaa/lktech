import "server-only";
import { formatRupiah } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { WeeklyReport } from "@/lib/weekly-report";
import {
  RESEND_ENDPOINT,
  getResendApiKey,
  getFromEmail,
} from "@/lib/email-config";

/**
 * Email LAPORAN MINGGUAN (Tema 3.3, FASE L4) — dikirim ke ADMIN
 * (`LEAD_NOTIFY_EMAILS`) via Resend. Best-effort: tidak melempar.
 */

const apiKey = getResendApiKey();
const fromEmail = getFromEmail();

export type ReportEmailResult = { ok: boolean; skipped?: boolean; error?: string };

function recipients(): string[] {
  return (process.env.LEAD_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format delta persen (mis. "+12%" / "−5%" / "—"). */
function deltaLabel(v: number | null): string {
  if (v === null) return "—";
  const p = Math.round(v * 100);
  const sign = p > 0 ? "+" : p < 0 ? "−" : "";
  return `${sign}${Math.abs(p)}%`;
}

function deltaColor(v: number | null): string {
  if (v === null || v === 0) return "#94a3b8";
  return v > 0 ? "#059669" : "#e11d48";
}

function statRow(label: string, value: string, delta?: string, deltaCol = "#94a3b8") {
  return `<tr>
    <td style="padding:10px 16px;color:#64748b;font-size:14px">${esc(label)}</td>
    <td style="padding:10px 16px;text-align:right;color:#0a0f1e;font-size:15px;font-weight:700">${esc(value)}${
      delta ? `<span style="margin-left:8px;color:${deltaCol};font-size:12px;font-weight:600">${esc(delta)}</span>` : ""
    }</td>
  </tr>`;
}

function buildHtml(report: WeeklyReport): string {
  const top = report.topProducts
    .map(
      (p) => `<tr>
        <td style="padding:6px 0;color:#0a0f1e;font-size:13px">${esc(p.name)}</td>
        <td style="padding:6px 0;text-align:right;color:#64748b;font-size:13px">${p.units} unit · ${formatRupiah(p.revenue)}</td>
      </tr>`,
    )
    .join("");

  const period = `${new Date(report.fromISO).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${new Date(report.toISO).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:20px">📊 Laporan Mingguan ${esc(SITE.name)}</h1>
        <p style="margin:6px 0 0;color:#dbe6ff;font-size:13px">${esc(period)} · ${report.windowDays} hari</p>
      </div>
      <div style="padding:8px 8px 0">
        <table style="width:100%;border-collapse:collapse">
          ${statRow("Omzet (dibayar)", formatRupiah(report.orders.revenue), deltaLabel(report.deltas.revenue), deltaColor(report.deltas.revenue))}
          ${statRow("Total pesanan", String(report.orders.total), deltaLabel(report.deltas.orders), deltaColor(report.deltas.orders))}
          ${statRow("Pesanan dibayar", `${report.orders.paid} · selesai ${report.orders.completed}`)}
          ${statRow("Nilai rata-rata / pesanan", report.orders.aov > 0 ? formatRupiah(report.orders.aov) : "—")}
          ${statRow("Lead baru", String(report.leads.new), deltaLabel(report.deltas.leads), deltaColor(report.deltas.leads))}
          ${statRow("Lead menang", String(report.leads.won))}
          ${statRow("Kupon terpakai", `${report.coupons.ordersUsing} pesanan`, undefined)}
          ${statRow("Total diskon diberikan", formatRupiah(report.coupons.discountGiven))}
        </table>
      </div>
      ${
        report.topProducts.length > 0
          ? `<div style="padding:8px 24px 24px">
              <p style="margin:16px 0 6px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Produk terlaris</p>
              <table style="width:100%;border-collapse:collapse">${top}</table>
            </div>`
          : `<div style="padding:8px 24px 24px"><p style="color:#94a3b8;font-size:13px">Belum ada penjualan pada periode ini.</p></div>`
      }
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        Laporan otomatis · <a href="${esc(SITE.url)}/admin" style="color:#94a3b8">Buka dashboard</a>
      </div>
    </div>
  </div>`;
}

function buildText(report: WeeklyReport): string {
  const lines = [
    `Laporan Mingguan ${SITE.name} (${report.windowDays} hari)`,
    "",
    `Omzet (dibayar)   : ${formatRupiah(report.orders.revenue)} (${deltaLabel(report.deltas.revenue)})`,
    `Total pesanan     : ${report.orders.total} (${deltaLabel(report.deltas.orders)})`,
    `Pesanan dibayar   : ${report.orders.paid} · selesai ${report.orders.completed}`,
    `AOV               : ${report.orders.aov > 0 ? formatRupiah(report.orders.aov) : "—"}`,
    `Lead baru         : ${report.leads.new} (${deltaLabel(report.deltas.leads)}) · menang ${report.leads.won}`,
    `Kupon terpakai    : ${report.coupons.ordersUsing} · diskon ${formatRupiah(report.coupons.discountGiven)}`,
  ];
  if (report.topProducts.length > 0) {
    lines.push("", "Produk terlaris:");
    for (const p of report.topProducts) {
      lines.push(`- ${p.name}: ${p.units} unit (${formatRupiah(p.revenue)})`);
    }
  }
  lines.push("", `Dashboard: ${SITE.url}/admin`);
  return lines.join("\n");
}

/** Kirim email laporan mingguan ke admin. Best-effort. */
export async function sendWeeklyReportEmail(
  report: WeeklyReport,
): Promise<ReportEmailResult> {
  if (!apiKey) return { ok: false, skipped: true };
  const to = recipients();
  if (to.length === 0) return { ok: false, skipped: true };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: `📊 Laporan Mingguan ${SITE.name} — omzet ${formatRupiah(report.orders.revenue)}`,
        text: buildText(report),
        html: buildHtml(report),
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[email-report] Resend gagal:", res.status, errText);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email-report] gagal mengirim laporan:", err);
    return { ok: false, error: "network" };
  }
}
