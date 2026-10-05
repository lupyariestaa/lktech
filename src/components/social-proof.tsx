import "server-only";
import { Flame } from "lucide-react";
import { getSocialProof } from "@/lib/social-proof";

/**
 * Komponen server: menampilkan bukti sosial NYATA (FASE P4) — jumlah pesanan
 * dalam 7 hari terakhir. Sembunyi bila datanya belum cukup (tidak menampilkan
 * angka palsu / terlalu kecil).
 *
 * Aman tanpa Admin SDK (tidak merender apa pun).
 */
export async function SocialProof({ className }: { className?: string }) {
  let proof;
  try {
    proof = await getSocialProof(7);
  } catch {
    return null;
  }
  if (!proof?.label) return null;

  return (
    <p
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
      }
    >
      <Flame className="h-3.5 w-3.5" />
      {proof.label}
    </p>
  );
}
