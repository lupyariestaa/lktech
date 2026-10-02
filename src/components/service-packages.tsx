import { Check, Minus, Sparkles } from "lucide-react";
import type { ServicePackage, ServicePackageCompare } from "@/lib/services";
import { Reveal } from "@/components/motion";
import { ButtonAnchor } from "@/components/ui/button";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/** Kartu paket individual (+ badge & CTA WhatsApp). */
function PackageCard({
  pkg,
  index,
  waMessage,
  whatsapp,
}: {
  pkg: ServicePackage;
  index: number;
  waMessage: string;
  whatsapp?: string;
}) {
  const message = waMessage
    ? `${waMessage} (Paket: ${pkg.name})`
    : `Halo LKTech! Saya tertarik dengan Paket ${pkg.name}.`;
  const points = pkg.points ?? [];

  return (
    <Reveal delay={index * 0.06}>
      <div
        className={cn(
          "relative flex h-full flex-col rounded-3xl border bg-white p-6 transition-all duration-300",
          pkg.highlight
            ? "border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
            : "border-slate-200 hover:border-primary/25 hover:shadow-lg hover:shadow-slate-900/5",
        )}
      >
        {pkg.badge && (
          <span
            className={cn(
              "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[11px] font-semibold text-white shadow",
              pkg.highlight ? "bg-primary" : "bg-secondary",
            )}
          >
            {pkg.badge}
          </span>
        )}

        <h3 className="text-lg font-bold text-secondary">{pkg.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {pkg.suitedFor}
        </p>

        <ul className="mt-5 flex flex-1 flex-col gap-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="h-2.5 w-2.5" />
              </span>
              <span className="text-sm text-slate-700">{p}</span>
            </li>
          ))}
        </ul>

        <ButtonAnchor
          href={waLink(message, whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          variant={pkg.highlight ? "primary" : "outline"}
          size="md"
          className="mt-6 w-full justify-center group"
        >
          <Sparkles className="h-4 w-4" />
          Pilih Paket {pkg.name}
        </ButtonAnchor>
      </div>
    </Reveal>
  );
}

/** Tabel banding paket (responsif: scroll-x di mobile). */
function CompareTable({
  packages,
  compare,
}: {
  packages: ServicePackage[];
  compare: ServicePackageCompare[];
}) {
  const names = packages.map((p) => p.name);

  return (
    <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface px-5 py-4 text-left font-semibold text-secondary"
            >
              Fitur
            </th>
            {names.map((n) => (
              <th
                key={n}
                scope="col"
                className="px-5 py-4 text-center font-semibold text-secondary"
              >
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compare.map((row, ri) => (
            <tr
              key={row.feature}
              className={ri % 2 === 0 ? "bg-white" : "bg-surface/60"}
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-inherit px-5 py-3.5 text-left font-medium text-muted"
              >
                {row.feature}
              </th>
              {row.values.map((v, vi) => (
                <td key={vi} className="px-5 py-3.5 text-center">
                  {typeof v === "boolean" ? (
                    v ? (
                      <Check
                        className="mx-auto h-4 w-4 text-emerald-500"
                        aria-label="Ya"
                      />
                    ) : (
                      <Minus
                        className="mx-auto h-4 w-4 text-slate-300"
                        aria-label="Tidak"
                      />
                    )
                  ) : (
                    <span className="text-secondary">{v}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Bagian paket: kartu paket (+ CTA) & opsional tabel banding.
 */
export function ServicePackages({
  packages,
  compare,
  waMessage,
  whatsapp,
}: {
  packages: ServicePackage[];
  compare?: ServicePackageCompare[];
  waMessage: string;
  whatsapp?: string;
}) {
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, i) => (
          <PackageCard
            key={pkg.name}
            pkg={pkg}
            index={i}
            waMessage={waMessage}
            whatsapp={whatsapp}
          />
        ))}
      </div>

      {compare && compare.length > 0 && (
        <>
          <p className="mt-10 text-center text-xs font-semibold tracking-widest text-muted uppercase">
            Bandingkan paket
          </p>
          <CompareTable packages={packages} compare={compare} />
        </>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Harga menyesuaikan kebutuhan proyek. Hubungi kami untuk penawaran terbaik.
      </p>
    </div>
  );
}
