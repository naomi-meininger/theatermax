#!/usr/bin/env node
/**
 * Refresh the lists of shows currently on Broadway and Off-Broadway from Broadway.com's listings.
 *
 *   node scripts/update-shows.mjs        # fetch Broadway + Off-Broadway listings, write data/live-shows.js
 *   node scripts/update-shows.mjs --file-broadway a.html --file-off b.html   # parse saved pages (testing)
 *
 * Runs once a day from .github/workflows/update-shows.yml.
 * Keeps only facts: title, Broadway.com link, lowest listed "from" price and rating count.
 * It does not copy show descriptions or images.
 * If Broadway.com can't be reached (3 tries) or the page can't be parsed (fewer than MIN_SHOWS
 * found), it keeps the previous list and marks it status: "stale" with lastAttemptAt/lastError,
 * so the site can say when the list was last updated. A redesign or outage never wipes the list.
 *
 * No dependencies — needs Node 18+ (built-in fetch).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Each listing is scraped separately and falls back to its own last good copy.
const CATEGORIES = [
  { scene: "broadway", url: "https://www.broadway.com/shows/tickets/?category=broadway&view_all=true", min: 20 },
  { scene: "off",      url: "https://www.broadway.com/shows/tickets/?category=off-broadway", min: 8 },
];
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "live-shows.js");
const SKIP_SLUGS = new Set(["tickets", "broadway", "off-broadway", "musical", "play"]);
const GENERIC_TEXT = /^(learn more|buy tickets|tickets|more info|see details|view)$/i;

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&").replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&eacute;/g, "é")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = (html) => decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

export function parseShows(html) {
  // Only look at the page body, and skip header/footer nav if they're marked up as such.
  const body = html.replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ").replace(/<script\b[\s\S]*?<\/script>/gi, " ");

  const NOT_SHOWS = /^(find-by-date|tickets|calendar|gift-cards?|deals|discounts?|broadway|off-broadway|new-york|london|touring|search)$/;
  // Every link to a show page: /shows/{slug}/ (relative or absolute)
  const linkRe = /<a\b[^>]*href="(?:https?:\/\/(?:www\.)?broadway\.com)?\/shows\/([a-z0-9-]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
  const hits = [];
  let m;
  while ((m = linkRe.exec(body))) {
    if (SKIP_SLUGS.has(m[1])) continue;
    hits.push({ slug: m[1], index: m.index, end: linkRe.lastIndex, inner: m[2] });
  }

  // Group links by slug; remember where each slug's block starts.
  const bySlug = new Map();
  for (const h of hits) {
    if (!bySlug.has(h.slug)) bySlug.set(h.slug, { slug: h.slug, first: h.index, titles: [], blocks: [] });
    const s = bySlug.get(h.slug);
    const t = text(h.inner) || (h.inner.match(/alt="([^"]+)"/i) || [])[1];
    if (t && !GENERIC_TEXT.test(t)) s.titles.push(decode(t).trim());
  }

  // A slug's "block" runs from each of its links to the next link for a different slug.
  for (let i = 0; i < hits.length; i++) {
    let j = i + 1;
    while (j < hits.length && hits[j].slug === hits[i].slug) j++;
    const end = j < hits.length ? hits[j].index : Math.min(body.length, hits[i].end + 4000);
    bySlug.get(hits[i].slug).blocks.push(body.slice(hits[i].index, end));
  }

  const shows = [];
  for (const s of bySlug.values()) {
    if (!s.titles.length) continue;
    // Most frequent title text wins (cards usually repeat the title in an image alt + heading).
    const counts = s.titles.reduce((acc, t) => acc.set(t, (acc.get(t) || 0) + 1), new Map());
    const title = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];

    // Use the last block for this slug: the full "All shows" list comes after featured carousels.
    let fromPrice = null, ratingCount = null;
    for (const b of [...s.blocks].reverse()) {
      const t = text(b);
      const p = t.match(/from\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
      if (p && fromPrice === null) fromPrice = parseFloat(p[1].replace(/,/g, ""));
      const r = t.match(/\((\d[\d,]*)\)/);
      if (r && ratingCount === null) ratingCount = parseInt(r[1].replace(/,/g, ""), 10);
      if (fromPrice !== null && ratingCount !== null) break;
    }
    // Skip Broadway.com's own pages that live under /shows/ (e.g. "Find tickets by date").
    if (NOT_SHOWS.test(s.slug) || /^(find |shop |browse |see all|view all|tickets by)/i.test(title || "") || /\.$/.test(title || "")) continue;
    shows.push({ slug: s.slug, title, url: `https://www.broadway.com/shows/${s.slug}/`, fromPrice, ratingCount });
  }
  return shows;
}

function readPrevious() {
  if (!existsSync(OUT)) return null;
  try {
    const src = readFileSync(OUT, "utf8");
    return JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
  } catch { return null; }
}

function writeOut(payload) {
  const js = `// AUTO-GENERATED by scripts/update-shows.mjs — do not edit by hand.\n` +
    `// Shows currently listed on Broadway.com (titles, links, lowest "from" price, rating count).\n` +
    `window.TM_LIVE = ${JSON.stringify(payload, null, 2)};\n`;
  writeFileSync(OUT, js);
}

async function fetchWithRetry(url, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax; once-daily show list refresh)",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Broadway.com responded ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      console.warn(`Attempt ${i}/${tries} failed: ${e.message}`);
      if (i < tries) await new Promise((r) => setTimeout(r, 5000 * i));
    }
  }
  throw lastErr;
}

async function main() {
  // --file-broadway page.html / --file-off page.html parse saved pages instead (for testing)
  const fileFor = (scene) => { const i = process.argv.indexOf(`--file-${scene}`); return i > -1 ? process.argv[i + 1] : null; };
  const offline = CATEGORIES.some((c) => fileFor(c.scene));
  const prev = readPrevious();
  const now = new Date().toISOString();
  const out = { categories: {}, shows: [] };

  for (const cat of CATEGORIES) {
    const before = prev?.categories?.[cat.scene] || (cat.scene === "broadway" && prev?.updatedAt ? { updatedAt: prev.updatedAt } : null);
    const prevShows = (prev?.shows || []).filter((s) => (s.scene || "broadway") === cat.scene);
    try {
      if (offline && !fileFor(cat.scene)) throw new Error("no test file given");
      const html = fileFor(cat.scene) ? readFileSync(fileFor(cat.scene), "utf8") : await fetchWithRetry(cat.url);
      const shows = parseShows(html).map((s) => ({ ...s, scene: cat.scene }));
      console.log(`[${cat.scene}] parsed ${shows.length} shows (${shows.filter((s) => s.fromPrice !== null).length} with prices).`);
      if (shows.length < cat.min) throw new Error(`only found ${shows.length} shows (need ${cat.min}); the page layout may have changed`);
      const was = prevShows.map((s) => s.slug), is = shows.map((s) => s.slug);
      const added = is.filter((x) => !was.includes(x)), gone = was.filter((x) => !is.includes(x));
      if (prevShows.length && added.length) console.log(`[${cat.scene}] new:`, added.join(", "));
      if (prevShows.length && gone.length) console.log(`[${cat.scene}] gone:`, gone.join(", "));
      out.categories[cat.scene] = { source: cat.url, status: "ok", updatedAt: now, lastAttemptAt: now, count: shows.length };
      // firstSeen: the day a show first showed up on Broadway.com's list (feeds "Recently announced").
      // Shows already listed before we started tracking keep firstSeen: null.
      const today = now.slice(0, 10), prevBySlug = Object.fromEntries(prevShows.map((p) => [p.slug, p]));
      for (const sh of shows) sh.firstSeen = prevBySlug[sh.slug] ? (prevBySlug[sh.slug].firstSeen ?? null) : (prevShows.length ? today : null);
      out.shows.push(...shows);
    } catch (e) {
      // Network error or unparseable page: keep the previous day's list for this category.
      if (!prevShows.length) {
        console.log(`::warning::[${cat.scene}] couldn't load (${e.message}) and there's no previous list.`);
        out.categories[cat.scene] = { source: cat.url, status: "missing", updatedAt: null, lastAttemptAt: now, lastError: e.message, count: 0 };
        continue;
      }
      console.log(`::warning::[${cat.scene}] couldn't refresh (${e.message}). Keeping the list from ${before?.updatedAt}.`);
      out.categories[cat.scene] = { source: cat.url, status: "stale", updatedAt: before?.updatedAt || null, lastAttemptAt: now, lastError: e.message, count: prevShows.length };
      out.shows.push(...prevShows.map((s) => ({ ...s, scene: cat.scene })));
    }
  }

  if (!out.shows.length) { console.error("Nothing to write: every listing failed and there's no previous data."); process.exit(1); }
  const cats = Object.values(out.categories);
  // Top-level summary the site reads: the oldest successful update, and "stale" if any list is.
  const ok = cats.filter((c) => c.updatedAt);
  writeOut({
    status: cats.every((c) => c.status === "ok") ? "ok" : "stale",
    updatedAt: ok.map((c) => c.updatedAt).sort()[0],
    lastAttemptAt: now,
    count: out.shows.length,
    categories: out.categories,
    shows: out.shows,
  });
  console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${out.shows.length} shows).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
