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
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
