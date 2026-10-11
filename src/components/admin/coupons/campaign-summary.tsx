"use client";

import type { CampaignGlobalStat } from "@/lib/coupon-analytics-pure";
import { formatRupiah } from "@/lib/format";

/** Tabel ringkas analitik per kampanye (30 hari) — C8. */
export function CampaignSummary({ campaigns }: { campaigns: CampaignGlobalStat[] }) {
  if (campaigns.length === 0) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-secondary">Kampanye (30 hari)</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="px-3 py-2">Kampanye</th>
              <th className="px-3 py-2 text-right">Kode</th>
              <th className="px-3 py-2 text-right">Order</th>
              <th className="px-3 py-2 text-right">Omzet</th>
              <th className="px-3 py-2 text-right">Σ Diskon</th>
              <th className="px-3 py-2 text-right">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => (
              <tr key={c.campaign} className="hover:bg-surface">
                <td className="px-3 py-2 font-medium text-secondary">{c.campaign}</td>
                <td className="px-3 py-2 text-right text-muted">{c.couponCount}</td>
                <td className="px-3 py-2 text-right text-muted">{c.orders}</td>
                <td className="px-3 py-2 text-right font-semibold text-secondary">
                  {formatRupiah(c.revenue)}
                </td>
                <td className="px-3 py-2 text-right text-muted">{formatRupiah(c.discount)}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                  {c.roi > 0 ? `${c.roi.toLocaleString("id-ID", { maximumFractionDigits: 2 })}×` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
