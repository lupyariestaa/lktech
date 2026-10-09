import { test } from "node:test";
import assert from "node:assert/strict";
import { findHistoryConflict } from "../src/lib/slug-conflict.ts";
import {
  createHeadingIdGenerator,
  HEADING_FALLBACK,
  parseMarkdown,
} from "../src/lib/markdown-parse.ts";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

/* ---------- G7: id heading unik & fallback ---------- */

test("G7 createHeadingIdGenerator: heading unik dapat id dasar", () => {
  const next = createHeadingIdGenerator(slugify);
  assert.equal(next("Mulai dari Mana"), "mulai-dari-mana");
  assert.equal(next("Kesimpulan"), "kesimpulan");
});

test("G7 createHeadingIdGenerator: judul sama diberi sufiks, tidak pernah duplikat", () => {
  const next = createHeadingIdGenerator(slugify);
  assert.equal(next("Tips"), "tips");
  assert.equal(next("Tips"), "tips-2");
  assert.equal(next("Tips"), "tips-3");
});

test("G7 createHeadingIdGenerator: teks simbol saja → fallback, berulang tetap unik", () => {
  const next = createHeadingIdGenerator(slugify);
  assert.equal(next("***"), HEADING_FALLBACK);
  assert.equal(next("!!!"), `${HEADING_FALLBACK}-2`);
});

test("G7 createHeadingIdGenerator: sufiks tidak bertabrakan dengan heading yang sudah ada", () => {
  const next = createHeadingIdGenerator(slugify);
  assert.equal(next("Tips"), "tips");
  assert.equal(next("Tips 2"), "tips-2");
  assert.equal(next("Tips"), "tips-3"); // "tips-2" sudah terpakai oleh "Tips 2"
});

test("G7 parseMarkdown: heading duplikat di dokumen mendapat id berbeda", () => {
  const blocks = parseMarkdown("## Tips\n\nisi\n\n## Tips");
  const ids = blocks.flatMap((b) => (b.t === "h" ? [b.id] : []));
  assert.deepEqual(ids, ["tips", "tips-2"]);
});

test("G7 parseMarkdown: heading simbol mendapat id fallback (bukan kosong)", () => {
  const blocks = parseMarkdown("## ***");
  assert.equal(blocks[0].t === "h" && blocks[0].id, HEADING_FALLBACK);
});

/* ---------- G4: konflik slug vs riwayat ---------- */

test("G4 findHistoryConflict: slug yang masih jadi riwayat artikel lain → konflik", () => {
  const all = [{ slug: "baru", slugHistory: ["lama"] }];
  assert.equal(findHistoryConflict("lama", all)?.slug, "baru");
});

test("G4 findHistoryConflict: slug bebas → tidak ada konflik", () => {
  const all = [{ slug: "baru", slugHistory: ["lama"] }];
  assert.equal(findHistoryConflict("segar", all), null);
});

test("G4 findHistoryConflict: artikel mengedit slug-nya sendiri tidak dianggap konflik", () => {
  const all = [{ slug: "a", slugHistory: ["a"] }];
  assert.equal(findHistoryConflict("a", all), null);
});

test("G4 findHistoryConflict: slug aktif artikel lain bukan konflik riwayat (ditangani duplikasi)", () => {
  const all = [{ slug: "x", slugHistory: [] }];
  assert.equal(findHistoryConflict("x", all), null);
});
