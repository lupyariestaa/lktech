import { Download, Laptop, MousePointerClick } from "lucide-react";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Pilih tool",
    description: "Dari kebutuhan atau katalog.",
  },
  {
    icon: Laptop,
    title: "Proses di browser",
    description: "Berkas tetap di perangkat Anda.",
  },
  {
    icon: Download,
    title: "Unduh hasil",
    description: "Tidak ada antrean unggah.",
  },
] as const;

/** Band alur 3 langkah yang ringkas — bukan tiga kartu besar. */
export function ToolsWorkflow() {
  return (
    <section className="relative bg-surface py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12">
          <div>
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
              Alur
            </span>
            <h2 className="mt-3 text-2xl font-bold text-secondary sm:text-3xl">
              Tiga langkah,{" "}
              <span className="text-gradient">tanpa instalasi.</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Perlu akun LKTech — gratis, sekali masuk. Tidak ada berkas yang
              diunggah.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-50 text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <step.icon
                    className="h-4 w-4 text-slate-300"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-3 text-sm font-bold text-secondary">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
