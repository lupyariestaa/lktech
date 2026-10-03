import { Check, Minus } from "lucide-react";
import { PRICING_COMPARE, PRICING_COMPARE_COLUMNS } from "@/lib/pricing";

/**
 * Tabel banding fitur antar paket (Basic / Profesional / Enterprise).
 *
 * Responsif: `overflow-x-auto` + kolom fitur "sticky" agar tetap terbaca
 * saat digeser di layar sempit (pola sama seperti `service-packages.tsx`).
 */
export function PricingTable() {
  const columns = PRICING_COMPARE_COLUMNS;

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <caption className="sr-only">
            Perbandingan fitur paket Basic, Profesional, dan Enterprise
          </caption>
          <thead>
            <tr className="bg-surface">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface px-5 py-4 text-left font-semibold text-secondary"
              >
                Fitur
              </th>
              {columns.map((name) => (
                <th
                  key={name}
                  scope="col"
                  className="px-5 py-4 text-center font-semibold text-secondary"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRICING_COMPARE.map((row, ri) => {
              const rowBg = ri % 2 === 0 ? "bg-white" : "bg-slate-50";
              return (
                <tr key={row.feature} className={rowBg}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 ${rowBg} px-5 py-3.5 text-left font-medium text-muted`}
                  >
                    {row.feature}
                  </th>
                  {row.values.map((v, vi) => (
                    <td key={vi} className="px-5 py-3.5 text-center">
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check
                            className="mx-auto h-4 w-4 text-emerald-500"
                            aria-label="Termasuk"
                          />
                        ) : (
                          <Minus
                            className="mx-auto h-4 w-4 text-slate-300"
                            aria-label="Tidak termasuk"
                          />
                        )
                      ) : (
                        <span className="text-secondary">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-center text-xs text-muted sm:hidden">
        Geser tabel ke samping untuk melihat semua paket →
      </p>
    </div>
  );
}
