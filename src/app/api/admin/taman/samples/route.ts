import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { canSeedSamples, nextAnimal, variantsForAnimal } from "@/lib/taman-logic";
import {
  listTamanTestimonials,
  writeTamanTestimonial,
  deleteTamanTestimonial,
} from "@/lib/taman-store";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Contoh fiktif (D2): tidak pernah tampil publik, hanya pratinjau admin & lokal. */
const SAMPLES: Array<{ displayName: string; role: string; quote: string; rating: number }> = [
  { displayName: "Contoh · Dimas P.", role: "Pemilik Kedai Kopi (contoh)", quote: "Setelah punya website, pesanan dari luar kota jadi lebih sering masuk.", rating: 5 },
  { displayName: "Contoh · Rina A.", role: "Owner Butik Online (contoh)", quote: "Prosesnya rapi dan dijelaskan dengan bahasa yang mudah dipahami.", rating: 5 },
  { displayName: "Contoh · Agus T.", role: "Pengelola Klinik (contoh)", quote: "Halaman layanan kami sekarang jelas dan calon pasien tidak bingung lagi.", rating: 4 },
  { displayName: "Contoh · Lia S.", role: "Guru Les Privat (contoh)", quote: "Pendaftaran online membuat administrasi jauh lebih ringan setiap minggu.", rating: 5 },
  { displayName: "Contoh · Hadi W.", role: "Pemilik Toko Bangunan (contoh)", quote: "Katalog produknya memudahkan pelanggan melihat pilihan sebelum datang.", rating: 4 },
  { displayName: "Contoh · Sari N.", role: "Konsultan Keuangan (contoh)", quote: "Kesan pertama yang profesional, dan klien baru lebih percaya diri menghubungi.", rating: 5 },
  { displayName: "Contoh · Bayu R.", role: "Pengrajin Kayu (contoh)", quote: "Galeri hasil kerja kami sekarang tampil rapi di ponsel maupun desktop.", rating: 5 },
  { displayName: "Contoh · Wulan D.", role: "Pemilik Salon (contoh)", quote: "Booking lewat website membantu kami mengurangi pesan yang tumpang tindih.", rating: 4 },
];

/** POST membuat contoh (lokal saja, D2). */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  // D2: di luar development, sample tidak pernah dibuat.
  if (!canSeedSamples({ NODE_ENV: process.env.NODE_ENV })) {
    return NextResponse.json(
      { error: "Contoh testimoni hanya bisa dibuat di lingkungan lokal (development)." },
      { status: 403 },
    );
  }

  const nowISO = new Date().toISOString();
  const existing = await listTamanTestimonials();
  const used = existing.map((t) => t.animal);
  const created: string[] = [];
  for (const [i, s] of SAMPLES.entries()) {
    const animal = nextAnimal(used);
    used.push(animal);
    const id = await writeTamanTestimonial(
      {
        kind: "sample",
        status: "published",
        displayName: s.displayName,
        role: s.role,
        quote: s.quote,
        rating: s.rating,
        dateISO: nowISO.slice(0, 10),
        animal,
        variant: variantsForAnimal(animal)[0],
        order: existing.length + i,
        source: "sample",
        consent: { given: false },
        createdAtISO: nowISO,
        updatedAtISO: nowISO,
      },
      null,
    );
    created.push(id);
  }

  await recordAdminAudit({
    action: "taman.save",
    actor: check.email,
    target: "samples",
    meta: { count: created.length, seed: true },
  });
  return NextResponse.json({ ok: true, created: created.length }, { status: 201 });
}

/** DELETE — hapus semua contoh (sample). Berlaku di lingkungan mana pun untuk membersihkan. */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const samples = (await listTamanTestimonials()).filter((t) => t.kind === "sample");
  for (const s of samples) await deleteTamanTestimonial(s.id);

  await recordAdminAudit({
    action: "taman.delete",
    actor: check.email,
    target: "samples",
    meta: { count: samples.length },
  });
  return NextResponse.json({ ok: true, deleted: samples.length });
}
