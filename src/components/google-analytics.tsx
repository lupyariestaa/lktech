import Script from "next/script";

/**
 * Google Analytics 4 (GA4) — OPSIONAL & fail-safe (fase S6).
 *
 * Dirender HANYA bila `NEXT_PUBLIC_GA_ID` diisi (mis. "G-XXXXXXX"). Bila kosong,
 * komponen tidak menghasilkan apa pun (analytics nonaktif) — tidak mengganggu
 * build/runtime. Vercel Analytics tetap berjalan sebagai sumber utama.
 *
 * Tanpa PII: GA4 default mengirim page_view; event kustom dikirim via
 * `trackEvent` (Vercel) — integrasi dual opsional.
 *
 * F6 (perf): `lazyOnload`, bukan `afterInteractive`. Audit Lighthouse produksi
 * menunjukkan gtag.js menghabiskan ~3,9 dtk script-evaluation pada mobile
 * ter-throttle dan ikut menekan LCP/TBT — padahal Vercel Analytics sudah
 * menjadi sumber utama. Skrip kini menyusul saat browser idle setelah load,
 * di luar jalur kritis hidrasi.
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
