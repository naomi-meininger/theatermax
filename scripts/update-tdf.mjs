#!/usr/bin/env node
/**
 * Weekly refresh of TDF (Theatre Development Fund) facts for our shows → data/tdf.js.
 * Runs from .github/workflows/update-tdf.yml every Tuesday.
 *
 *   node scripts/update-tdf.mjs                         # crawl tdf.org
 *   node scripts/update-tdf.mjs --file show.html slug   # parse one saved show page (testing)
 *
 * For each show we keep only facts from its TDF Show Finder page (tdf.org/shows/<id>/<slug>/):
 *   - "TDF Member tickets:" line (e.g. "Not currently available for this show", or a price)
 *   - "Listed at [TKTS]" line (Frequently / Sometimes / Never / n/a)
 *   - full-price range, and first preview / opening / closing dates
 *
 * Finding pages: TDF's Show Finder list loads by script, so we start from pages that link to
 * shows (Get Tickets, What's On Stage, Membership) plus every show page we've found before, and
 * follow /shows/<id>/<slug>/ links whose slug matches one of our show titles. Each page links
 * to related shows ("You Might Also Like"), so coverage grows run to run. Bounded and polite:
 * at most MAX_PAGES fetches, one at a time, with a pause between them.
 *
 * If TDF can't be reached, last week's data is kept and marked "stale". A page we can't read
 * is simply left out: the site then shows the generic TDF link, never an invented offer.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { norm } from "./update-prices.mjs";

const BASE = "https://www.tdf.org";
const SEEDS = ["/get-tickets/", "/on-stage/", "/membership", "/"];
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "tdf.js");
const MAX_PAGES = 220, PAUSE_MS = 900;
// Show pages confirmed by hand (our slug → TDF path), so the first run has somewhere to start.
const KNOWN = {
  "school-girls-or-african-mean-girls-play": "/shows/23167/school-girls-or-the-african-mean-girls-play/",
  "the-sound-of-music": "/shows/23369/the-sound-of-music/",
  "juliet": "/shows/19001/juliet/",
};

const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&apos;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, " ").replace(/&ndash;|&mdash;/g, "-").replace(/&amp;/g, "&");
const text = (h) => decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " $1 ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const readWindowVar = (file, name) => {
  if (!existsSync(file)) return null;
  const w = {}; new Function("window", readFileSync(file, "utf8"))(w); return w[name] ?? null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const isoDate = (s) => {
  const m = s && s.match(/([A-Z][a-z]{2})[a-z]*\.? (\d{1,2}), (\d{4})/);
  return m && MONTHS[m[1].toLowerCase()] ? `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
};
// Text between a label and the next of several labels.
const between = (t, label, ends) => {
  const i = t.search(label); if (i < 0) return null;
  const rest = t.slice(i).replace(label, "");
  let j = rest.length; for (const e of ends) { const k = rest.search(e); if (k >= 0 && k < j) j = k; }
  return rest.slice(0, j).trim() || null;
};

/** Parse one TDF show page into facts. Exported for tests. */
export function parseShowPage(html) {
  const t = text(html);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? text(h1[1]) : null;
  const venueLd = html.match(/"location"\s*:\s*\{\s*"@?type"?[^}]*?"name"\s*:\s*"([^"]+)"/) || html.match(/"location"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/);
  const venue = venueLd ? decode(venueLd[1]) : between(t, /Playing @/, [/\d{2,} [A-Z]/, /,/]);
  const STOP = [/Listed at/i, /Full-price tickets/i, /TDF Member tickets/i, /Accessibility/i, /TDF Social Feed/i, /You Might Also Like/i];
  let member = between(t, /TDF Member tickets:?/i, STOP);
  let tkts = between(t, /Listed at:?\s*(TKTS)?/i, STOP);
  const full = between(t, /Full-price tickets:?/i, [/Buy Tickets/i, ...STOP]);
  if (member) member = member.slice(0, 90);
  if (tkts) tkts = (tkts.match(/^(Frequently|Sometimes|Occasionally|Rarely|Never|n\/a)/i) || [null])[0];
  const price = (s) => { const m = s && s.match(/\$\d[\d,.]*(?:\s*-\s*\$\d[\d,.]*)?/); return m ? m[0].replace(/\s+/g, " ") : null; };
  return {
    title,
    venue: venue ? venue.slice(0, 80) : null,
    previews: isoDate(between(t, /First Preview:?/i, [/Opening Date/i, /Closing Date/i, /Running Time/i])),
    opening: isoDate(between(t, /Opening Date:?/i, [/Closing Date/i, /Running Time/i])),
    closing: isoDate(between(t, /Closing Date:?/i, [/Running Time/i, /Playing @/i])),
    member,                                   // TDF's own wording, e.g. "Not currently available for this show"
    memberAvailable: !!member && !/not (currently )?available|n\/a/i.test(member) && /\$\d/.test(member),
    memberPrice: member && !/not (currently )?available/i.test(member) ? price(member) : null,
    tkts: tkts ? tkts[0].toUpperCase() + tkts.slice(1).toLowerCase() : null,   // how often TDF says it's at the TKTS booth
    fullPrice: price(full),
  };
}

/** All /shows/<id>/<slug>/ links on a page → [{ path, id, words }]. */
export function showLinks(html) {
  const out = new Map();
  for (const m of html.matchAll(/href="(?:https?:\/\/www\.tdf\.org)?(\/shows\/(\d+)\/([a-z0-9-]+)\/?)"/gi)) {
    if (/about:blank/.test(m[3])) continue;
    out.set(m[2], { path: `/shows/${m[2]}/${m[3]}/`, id: m[2], words: norm(m[3].replace(/-/g, " ")) });
  }
  return [...out.values()];
}

// Our show slug whose title matches a TDF URL slug / page title.
function matcher(shows) {
  const keys = shows.map((s) => ({ slug: s.slug, key: norm(s.title.replace(/\s*\(Encores!\)/, "")), theater: s.theater }));
  return (words) => {
    if (!words) return null;
    const hit = keys.find((k) => k.key && (words === k.key || (k.key.length >= 8 && words.startsWith(k.key + " ")) || (words.length >= 8 && k.key.startsWith(words))));
    return hit || null;
  };
}

async function get(p) {
  const res = await fetch(BASE + p, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax; weekly, link-back only)" } });
  if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`);
  return res.text();
}

function write(data) {
  writeFileSync(OUT, `// Auto-generated by scripts/update-tdf.mjs — facts from TDF Show Finder pages (tdf.org). Do not edit by hand.\nwindow.TM_TDF = ${JSON.stringify(data, null, 2)};\n`);
}

async function run() {
  const prev = readWindowVar(OUT, "TM_TDF") || { shows: {}, ids: {} };
  const live = readWindowVar(path.join(ROOT, "data", "live-shows.js"), "TM_LIVE") || { shows: [] };
  const extra = readWindowVar(path.join(ROOT, "data", "extra-shows.js"), "TM_EXTRA_SHOWS") || [];
  const theaters = readWindowVar(path.join(ROOT, "data", "shows.js"), "TM_THEATERS") || {};
  const ours = [...live.shows, ...extra].map((s) => ({ slug: s.slug, title: s.title, theater: s.theater || theaters[s.slug] }));
  const match = matcher(ours);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const known = { ...KNOWN, ...Object.fromEntries(Object.entries(prev.ids || {}).map(([k, v]) => [k, v])) };
  const queue = [...SEEDS.map((p) => ({ path: p, seed: true })), ...Object.values(known).map((p) => ({ path: p }))];
  const seen = new Set(), shows = {}, ids = {};
  let fetched = 0, failures = 0;

  while (queue.length && fetched < MAX_PAGES) {
    const item = queue.shift();
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    let html;
    try { html = await get(item.path); fetched++; } catch (e) { failures++; console.warn("skip", e.message); continue; }
    await sleep(PAUSE_MS);

    if (!item.seed) {
      const f = parseShowPage(html);
      const hit = match(norm(f.title || "")) || match(norm(item.path.split("/")[3].replace(/-/g, " ")));
      // Same title but an old production (e.g. a past season) doesn't count.
      const current = !f.closing || f.closing >= today;
      if (hit && current && (f.member || f.tkts || f.fullPrice || f.opening)) {
        const venueOk = !hit.theater || !f.venue || norm(f.venue).split(" ")[0] === norm(hit.theater).split(" ")[0];
        if (venueOk) { shows[hit.slug] = { url: BASE + item.path, ...f }; ids[hit.slug] = item.path; }
      }
    }
    // Follow links to shows that look like ours.
    for (const l of showLinks(html)) {
      if (seen.has(l.path)) continue;
      if (match(l.words)) queue.unshift({ path: l.path });   // likely ours: fetch soon
    }
  }

  // Shows the crawl didn't reach: TDF also answers /shows/0/<name-slug>/ by name, so try that
  // once per missing show (the page's own title must still match ours).
  const slugify = (t) => String(t).toLowerCase().replace(/\s*\((the met|encores!|nycb)\)\s*/g, " ").replace(/[’'`]/g, "").replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let guessed = 0;
  for (const o of ours) {
    if (shows[o.slug] || guessed >= 160) continue;
    const variants = [...new Set([slugify(o.title), slugify(o.title.replace(/^the\s+/i, "")), slugify(o.title.replace(/&/g, " ")),
      slugify(o.title.replace(/\s*[:(–-].*$/, ""))])].filter(Boolean);
    for (const v of variants) {
      const p = `/shows/0/${v}/`;
      if (seen.has(p)) continue;
      seen.add(p); guessed++;
      let res;
      try { res = await fetch(BASE + p, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax; weekly, link-back only)" } }); } catch { continue; }
      await sleep(PAUSE_MS);
      if (!res.ok) continue;
      const f = parseShowPage(await res.text());
      const hit = match(norm(f.title || ""));
      const current = !f.closing || f.closing >= today;
      if (hit && hit.slug === o.slug && current && (f.member || f.tkts || f.fullPrice || f.opening)) {
        const finalPath = new URL(res.url).pathname;
        shows[o.slug] = { url: BASE + finalPath, ...f }; ids[o.slug] = finalPath; break;
      }
    }
  }
  console.log(`Name lookups: ${guessed}.`);

  const found = Object.keys(shows).length;
  console.log(`Fetched ${fetched} pages (${failures} failed); matched ${found} of our shows.`);
  if (fetched === 0 || found === 0) {
    console.warn("Nothing usable from TDF — keeping last week's data.");
    write({ ...prev, status: "stale", lastAttemptAt: new Date().toISOString() });
    return;
  }
  write({ status: "ok", source: BASE + "/on-stage/show-finder/", updatedAt: new Date().toISOString(), ids: { ...prev.ids, ...ids }, shows });
}

const args = process.argv.slice(2);
if (args[0] === "--file") console.log(JSON.stringify(parseShowPage(readFileSync(args[1], "utf8")), null, 2));
else if (import.meta.url === `file://${process.argv[1]}`) run().catch((e) => { console.error(e); process.exit(1); });
