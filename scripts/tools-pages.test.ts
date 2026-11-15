import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { TOOL_GUIDES, toolGuideSlugs } from "../src/lib/tools-guides-pure.ts";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { TOOLS, availableToolSlugs } from "../src/lib/tools-registry-pure.ts";

/**
 * Uji wiring pemisahan Landing (`/tools`), Panduan publik
 * (`/tools/panduan/[slug]`), dan Dashboard (`/tools/ruang`, `/tools/[slug]`).
 *
 * Jalankan: `npm run test:tools-pages`
 *
 * Membaca berkas sebagai teks (tanpa impor TSX) agar tak terpengaruh alias
 * `@/`. Tujuan: mencegah regresi — landing & panduan harus tetap publik,
 * dashboard harus tetap login-gated lewat layout `(workspace)`, dan
 * robot/sitemap mencerminkan aturan itu.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), "utf8");

const landing = read("../src/app/tools/page.tsx");
const workspaceLayout = read("../src/app/tools/(workspace)/layout.tsx");
const space = read("../src/app/tools/(workspace)/ruang/page.tsx");
const workspace = read("../src/app/tools/(workspace)/[slug]/page.tsx");
const guideIndex = read("../src/app/tools/panduan/page.tsx");
const guideDetail = read("../src/app/tools/panduan/[slug]/page.tsx");
const robots = read("../src/app/robots.ts");
const sitemap = read("../src/app/sitemap.ts");
const toolShell = read("../src/components/tools/tool-shell.tsx");
const toolWorkspace = read("../src/components/tools/tool-workspace.tsx");
const catalog = read("../src/components/tools/tools-catalog.tsx");
const toolsShell = read(
  "../src/components/tools/dashboard/tools-shell.tsx",
);
const sidebarContent = read(
  "../src/components/tools/dashboard/tools-sidebar-content.tsx",
);
const sidebarNav = read(
  "../src/components/tools/dashboard/tools-sidebar-nav.tsx",
);
const accountOverview = read("../src/components/auth/account-overview.tsx");

test("landing /tools publik: tanpa UserGuard & boleh diindeks", () => {
  assert.doesNotMatch(landing, /UserGuard/);
  assert.doesNotMatch(landing, /index:\s*false/);
  assert.match(landing, /canonical:\s*"\/tools"/);
  assert.match(landing, /ToolsHero/);
  assert.match(landing, /ToolsIntentGrid/);
  assert.match(landing, /ToolsShowcase/);
  assert.match(landing, /ToolsFaqCta/);
  assert.match(landing, /TOOLS/);
});

test("landing menyediakan anchor demo, katalog, dan FAQ", () => {
  assert.match(landing, /id="demo"/);
  // Anchor katalog & FAQ berasal dari komponen landing.
  assert.match(
    read("../src/components/tools/landing/tools-showcase.tsx"),
    /id="tool"/,
  );
  assert.match(
    read("../src/components/tools/landing/tools-faq-cta.tsx"),
    /id="faq"/,
  );
});

test("landing menautkan panduan publik & JSON-LD memakai URL panduan", () => {
  assert.match(
    read("../src/components/tools/landing/tools-faq-cta.tsx"),
    /href="\/tools\/panduan"/,
  );
  // ItemList tidak boleh menunjuk workspace gated.
  assert.match(landing, /toolGuideHref\(tool\.slug\)/);
  assert.doesNotMatch(landing, /url:\s*`\$\{SITE\.url\}\/tools\/\$\{tool\.slug\}`/);
});

test("layout (workspace) memusatkan guard & noindex", () => {
  assert.match(workspaceLayout, /UserGuard/);
  assert.match(workspaceLayout, /index:\s*false/);
  assert.match(workspaceLayout, /ToolsShell/);
});

test("ruang /tools/ruang memakai shell dashboard, guard dari layout", () => {
  assert.doesNotMatch(space, /<UserGuard/);
  assert.doesNotMatch(space, /components\/sections\/navbar/);
  assert.doesNotMatch(space, /components\/sections\/footer/);
  assert.match(space, /ToolsDashboardOverview/);
  assert.match(space, /ToolsCatalog/);
  assert.match(space, /Suspense/);
  assert.match(space, /id="katalog"/);
  assert.match(space, /<div className="w-full">/);
});

test("workspace /tools/[slug] tetap statis & memakai shell dashboard", () => {
  assert.doesNotMatch(workspace, /<UserGuard/);
  assert.doesNotMatch(workspace, /components\/sections\/navbar/);
  assert.doesNotMatch(workspace, /components\/sections\/footer/);
  assert.match(workspace, /ToolWorkspace/);
  assert.match(workspace, /generateStaticParams/);
});

test("panduan /tools/panduan publik & indexable", () => {
  assert.doesNotMatch(guideIndex, /<UserGuard/);
  assert.doesNotMatch(guideIndex, /components\/auth\/user-guard/);
  assert.doesNotMatch(guideIndex, /index:\s*false/);
  assert.match(guideIndex, /canonical:\s*"\/tools\/panduan"/);
  assert.match(guideIndex, /TOOL_GUIDES/);
});

test("panduan /tools/panduan/[slug] publik, statis, & punya FAQ terlihat", () => {
  assert.doesNotMatch(guideDetail, /UserGuard/);
  assert.match(
    guideDetail,
    /alternates:\s*\{\s*canonical:\s*toolGuideHref\(slug\)/,
  );
  assert.match(guideDetail, /dynamicParams\s*=\s*false/);
  assert.match(guideDetail, /generateStaticParams/);
  assert.match(guideDetail, /toolGuideHref/);
  assert.match(guideDetail, /FaqAccordion/);
});

test("robots: workspace diblokir, panduan publik diizinkan", () => {
  assert.match(robots, /"\/tools\/"/);
  assert.match(robots, /"\/tools\/panduan"/);
  // Tidak boleh ada entri persis "/tools" (tanpa garis miring) yang ikut memblokir landing.
  assert.doesNotMatch(robots, /"\/tools"(?!\/)/);
});

test("sitemap memuat landing /tools dan panduan publik", () => {
  assert.match(sitemap, /`\$\{SITE\.url\}\/tools`/);
  assert.match(sitemap, /tools\/panduan/);
});

test("navigasi internal mengarah ke ruang, bukan landing", () => {
  assert.match(toolShell, /href="\/tools\/ruang"/);
  assert.match(accountOverview, /href="\/tools\/ruang"/);
});

test("dashboard memakai sidebar bersama + drawer mobile", () => {
  assert.match(toolsShell, /ToolsSidebarContent/);
  assert.match(toolsShell, /ToolsMobileDrawer/);
  assert.match(toolsShell, /ToolsMobileTopbar/);
  assert.match(toolsShell, /useToolFavorites/);
  assert.match(toolsShell, /useToolUsage/);
  assert.match(toolsShell, /id="tools-main"/);
  assert.match(toolsShell, /lg:grid-cols-\[76px_minmax\(0,1fr\)\]/);
  assert.match(toolsShell, /useSyncExternalStore/);
  assert.match(sidebarContent, /onToggleCollapsed/);
  assert.match(sidebarContent, /Tampilkan sidebar penuh/);
  assert.match(sidebarContent, /collapsed/);
  assert.match(toolShell, /w-full px-4/);
});

test("sidebar memuat tool aktif, favorit, frekuensi, semua tool", () => {
  assert.match(sidebarContent, /Sedang dibuka/);
  assert.match(sidebarContent, /Favorit/);
  assert.match(sidebarContent, /Sering dibuka/);
  assert.match(sidebarContent, /Semua tool/);
  assert.match(sidebarContent, /ToolsCurrentTool/);
  assert.match(sidebarContent, /ToolsFavoriteList/);
  assert.match(sidebarContent, /ToolsFrequentList/);
  assert.match(sidebarNav, /aria-current/);
  assert.match(sidebarNav, /"page"/);
});

test("rail lama sudah dihapus; workspace memakai sidebar", () => {
  assert.doesNotMatch(toolShell, /ToolRail/);
  assert.doesNotMatch(toolShell, /tool-rail/);
  assert.throws(() => read("../src/components/tools/tool-rail.tsx"));
});

test("recent & usage dicatat sekali saat workspace mount", () => {
  assert.match(toolWorkspace, /recordToolOpen/);
  assert.match(toolWorkspace, /useRef/);
  assert.match(toolWorkspace, /trackToolsToolOpen\(\{ tool: tool\.slug \}\)/);
  assert.match(toolWorkspace, /source:\s*"related"/);
  // Katalog tidak lagi menulis recent (klik hanya analytics).
  assert.doesNotMatch(catalog, /writeRecentTools/);
  assert.doesNotMatch(catalog, /addRecentToolSlug/);
  assert.doesNotMatch(catalog, /clearToolsLocalData/);
});

test("setiap tool tersedia punya panduan yang lengkap", () => {
  const guideSlugs = toolGuideSlugs();
  assert.equal(new Set(guideSlugs).size, guideSlugs.length);

  for (const slug of availableToolSlugs()) {
    const guide = TOOL_GUIDES.find((item) => item.slug === slug);
    assert.ok(guide, `panduan ${slug} tidak ada`);
    assert.ok(guide.title.trim().length > 0, slug);
    assert.ok(guide.intro.trim().length > 0, slug);
    assert.ok(guide.steps.length >= 3, slug);
    assert.ok(guide.useCases.length >= 3, slug);
    assert.ok(guide.faq.length >= 3, slug);
    for (const faq of guide.faq) {
      assert.ok(faq.question.trim() && faq.answer.trim(), slug);
    }
  }

  // Panduan tidak boleh menjanjikan tool fiktif atau klaim absolut.
  for (const guide of TOOL_GUIDES) {
    const text = JSON.stringify(guide).toLowerCase();
    assert.doesNotMatch(text, /100% aman/, guide.slug);
    assert.doesNotMatch(text, /testimoni/, guide.slug);
  }

  // Registry & panduan harus memakai kumpulan slug yang sama.
  assert.deepEqual(
    [...guideSlugs].sort(),
    [...TOOLS.filter((tool) => tool.status === "tersedia").map((t) => t.slug)].sort(),
  );
});
