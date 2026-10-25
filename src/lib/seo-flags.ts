import "server-only";
import { NextResponse } from "next/server";
import { SEO_FEATURE_LABEL, seoFeatureEnabled, type SeoFeature } from "@/lib/seo-flags-pure";

/**
 * Feature flag SEO server-side (fase D7). Membaca `SEO_DISABLED_FEATURES`
 * (dipisah koma, mis. "audit,ga4"). Default: semua aktif.
 */
export function isSeoFeatureEnabledFromEnv(feature: SeoFeature): boolean {
  return seoFeatureEnabled(feature, process.env.SEO_DISABLED_FEATURES);
}

/** Respons 503 siap pakai bila sebuah fitur dinonaktifkan (kill switch). */
export function seoFeatureDisabledResponse(feature: SeoFeature): NextResponse {
  return NextResponse.json(
    {
      error: `Fitur ${SEO_FEATURE_LABEL[feature]} sedang dinonaktifkan sementara.`,
      code: "seo_feature_disabled",
      feature,
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}