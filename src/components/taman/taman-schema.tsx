import "server-only";
import { listTamanTestimonials } from "@/lib/taman-store";
import { buildTamanReviewJsonLd, publicPool } from "@/lib/taman-logic";
import { SITE } from "@/lib/site";

/**
 * JSON-LD `Review` untuk testimoni taman yang sah (T10). Server component: data
 * diambil di server dan hanya field publik yang sampai ke markup (lewat publicPool).
 * Tidak merender apa pun bila tidak ada testimoni sah.
 */
export async function TamanSchema() {
  const items = publicPool(await listTamanTestimonials());
  const ld = buildTamanReviewJsonLd(items, { siteUrl: SITE.url, siteName: SITE.name });
  if (!ld) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
