import { jsonLdString, type JsonLd } from "@/lib/structured-data-pure";

/**
 * Merender satu node JSON-LD sebagai `<script type="application/ld+json">`.
 *
 * - Server component (aman, tanpa hook).
 * - Mengembalikan `null` bila `node` kosong (tak merender script kosong).
 * - Menerima satu node atau array node (beberapa digabung).
 */
export function JsonLdScript({ node }: { node: JsonLd | JsonLd[] | null | undefined }) {
  const data = Array.isArray(node) ? node.filter(Boolean) : node;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return (
    <script
      type="application/ld+json"
      // Serializer men-escape `</script>` & karakter pemutus script lainnya.
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
