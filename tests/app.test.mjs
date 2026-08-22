import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const requiredRoutes = [
  "/membership",
  "/store",
  "/community",
  "/about-support",
  "/login",
  "/account",
  "/cart",
  "/checkout",
  "/membership-registration",
  "/become-a-companion",
];

test("production bundle contains the current brand and inclusive visual assets", async () => {
  await Promise.all([
    access("dist/client/index.html"),
    access("dist/client/assets/brand/one-life-circle-logo.png"),
    access("dist/client/assets/brand/tuhitu-bliss-logo.webp"),
    access("dist/client/assets/brand/biome-plus-logo.webp"),
    access("dist/client/assets/inclusive-hero.webp"),
    access("dist/client/assets/intergenerational-community.webp"),
    access("dist/client/assets/young-everyday-choices.webp"),
    access("dist/client/assets/pizza-making-workshop.webp"),
    access("dist/client/assets/cookie-making-workshop.webp"),
    access("dist/client/assets/tiramisu-making-workshop.webp"),
    access("dist/server/index.js"),
    access("dist/supabase/schema.sql"),
  ]);

  const html = await readFile("dist/client/index.html", "utf8");
  assert.match(html, /One Life Circle/);
  assert.match(html, /assets\/brand\/one-life-circle-logo\.jpeg/);
});

test("membership data contains only the three approved annual plans", async () => {
  const planSource = await readFile("src/data/plans.js", "utf8");
  assert.match(planSource, /id: "community"/);
  assert.match(planSource, /regularPrice: 12000/);
  assert.match(planSource, /annualPrice: 6000/);
  assert.match(planSource, /potentialValue: 50000/);
  assert.match(planSource, /potentialValueLabel: "₹50,000\+"/);
  assert.match(planSource, /id: "active"/);
  assert.match(planSource, /annualPrice: 24000/);
  assert.match(planSource, /potentialValue: 100000/);
  assert.match(planSource, /id: "signature"/);
  assert.match(planSource, /annualPrice: 48000/);
  assert.match(planSource, /potentialValue: 200000/);
  assert.doesNotMatch(planSource, new RegExp(`id: ["']${["found", "ing"].join("")}["']`, "i"));
  assert.doesNotMatch(planSource, /annualPrice: 0/);
});

test("homepage leads with the approved lifestyle positioning and comparable value proof", async () => {
  const home = await readFile("src/pages/home-page.jsx", "utf8");
  assert.match(home, /hero-brand-heading">One Life Circle/);
  assert.match(home, /Get benefits worth <span>₹50,000\+<\/span> with a ₹6,000 annual membership/);
  assert.match(home, /TuHiTu One Life Circle is a curated community/);
  assert.match(home, /exclusive privileges across 100\+ brands/);
  assert.match(home, /<PlanComparisonTable source="Homepage value comparison"/);
  assert.match(home, /id="membership-value"/);
  assert.match(home, /₹1,00,000 on eligible Member Store purchases/);
  assert.match(home, /Potential annual value depends on eligible use/);
});

test("Community & Experiences opens with sixteen activities in the approved priority order", async () => {
  const { events } = await import("../src/data/events.js");
  assert.equal(events.length, 16);
  assert.equal(new Set(events.map((event) => event.slug)).size, 16);
  assert.deepEqual(events.slice(0, 4).map((event) => event.title), [
    "Morning Mobility Circle",
    "Family Wellness Sunday",
    "Mindful Evenings",
    "Storytelling & Reading Circle",
  ]);
  assert.ok(events.some((event) => event.title === "Pizza Making Workshop"));
  assert.ok(events.some((event) => event.title === "Cookie Making & Decorating"));
  assert.ok(events.some((event) => event.title === "Tiramisu Making Experience"));

  const community = await readFile("src/pages/community-page.jsx", "utf8");
  assert.match(community, /events\.map\(\(event\) => <EventCard/);
  assert.match(community, /16 ways to take part/);
  assert.match(community, /COMPANIONSHIP & THE WIDER CIRCLE/);
  assert.doesNotMatch(community, /FeaturedExperienceCarousel|slideshow|carousel/i);
  assert.doesNotMatch(community, /GET INVITED/);
});

test("membership comparison follows the annual plan section", async () => {
  const membership = await readFile("src/pages/membership-page.jsx", "utf8");
  const plansIndex = membership.indexOf("paid-plan-section");
  const comparisonIndex = membership.indexOf("compare-section");
  const ecosystemIndex = membership.indexOf("benefit-category-section");
  assert.ok(plansIndex >= 0 && comparisonIndex > plansIndex && ecosystemIndex > comparisonIndex);
  assert.match(membership, /<PlanComparisonTable source="Membership access comparison"/);
});

test("router source contains all required core and protected journeys", async () => {
  const app = await readFile("src/App.jsx", "utf8");
  for (const route of requiredRoutes) assert.match(app, new RegExp(`path=["']${route}["']`));
});

test("member access uses the real API and has no browser-only review account", async () => {
  const [provider, login, worker] = await Promise.all([
    readFile("src/components/app-provider.jsx", "utf8"),
    readFile("src/pages/utility-pages.jsx", "utf8"),
    readFile("worker/api.js", "utf8"),
  ]);
  assert.match(provider, /api\/auth\/session/);
  assert.match(provider, /api\/auth\/login/);
  assert.match(worker, /findMemberForLogin/);
  assert.match(worker, /derivePassword/);
  assert.match(worker, /member\.status !== "active"/);
  assert.doesNotMatch(`${provider}\n${login}`, /OLC-PKL|loginDemo|View Demo Member|any non-empty/i);
});

test("responsive navigation and membership timeline include compact-layout behavior", async () => {
  const [provider, styles] = await Promise.all([
    readFile("src/components/app-provider.jsx", "utf8"),
    readFile("src/styles/global.css", "utf8"),
  ]);

  assert.match(provider, /aria-label=\{mobileOpen \? "Close navigation" : "Open navigation"\}/);
  assert.match(provider, /aria-expanded=\{mobileOpen\}/);
  assert.match(provider, /className="mobile-nav" aria-label="Mobile navigation"/);
  assert.match(styles, /@media \(max-width: 1000px\)[\s\S]*?\.desktop-nav \{ display: none; \}[\s\S]*?\.menu-button \{ display: inline-grid; \}/);
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*?\.membership-timeline \{[^}]*grid-template-columns: 1fr;/);
  assert.match(styles, /\.membership-timeline::before \{[^}]*left: 28px;[^}]*width: 1px;[^}]*height: auto;/);
});

test("server bundle serves the SPA shell for deep links", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const requests = [];

  const response = await worker.fetch(
    new Request("https://onelifecircle.example/store/daily-multivitamin-gummies", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        async fetch(request) {
          const url = new URL(request.url);
          requests.push(url.pathname);
          return url.pathname === "/index.html"
            ? new Response("<!doctype html><title>One Life Circle</title>", {
                status: 200,
                headers: { "content-type": "text/html; charset=utf-8" },
              })
            : new Response("Not found", { status: 404 });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(requests, ["/", "/index.html"]);
  assert.match(await response.text(), /One Life Circle/);
});
