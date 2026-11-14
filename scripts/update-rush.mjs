#!/usr/bin/env node
/**
 * Weekly refresh of rush / lottery / student / standing-room deals from bwayrush.com
 * → data/rush.js. Runs from .github/workflows/update-rush.yml every Monday.
 *
 *   node scripts/update-rush.mjs                    # fetch bwayrush.com
 *   node scripts/update-rush.mjs --file page.html   # parse a saved page (testing)
 *
 * Keeps only facts (show, price, type, platform, link) and credits bwayrush.com on the site.
 * If the site can't be reached or parsed, the previous week's data is kept and marked "stale".
 *
 * Page shape we rely on: each show is a link whose title attribute reads "<Show> at <Theatre>",
 * followed by discount links whose text starts with a price ("$49 digital", "50% off student").
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { norm } from "./update-prices.mjs";

const SOURCE = "https://bwayrush.com/";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "rush.js");
const SHOWS_FILE = path.join(ROOT, "data", "live-shows.js");
const MIN_SHOWS = 15;

const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&apos;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const text = (h) => decode(h.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const readWindowVar = (file, name) => {
  if (!existsSync(file)) return null;
  const w = {}; new Function("window", readFileSync(file, "utf8"))(w); return w[name] ?? null;
};

// ---------- classify one discount ----------
const PLATFORMS = [
  [/lottery\.broadwaydirect\.com/, "Broadway Direct"], [/socialtoaster\.com/, "Telecharge"] /* Telecharge lotteries run on SocialToaster */, [/luckyseat\.com/, "Lucky Seat"],
  [/todaytix\.com/, "TodayTix"], [/telecharge\.com/, "Telecharge"], [/instagram\.com/, "Box office"],
  [/roundabouttheatre\.org/, "Roundabout"], [/lct\.org/, "Lincoln Center Theater"], [/manhattantheatreclub\.com/, "Manhattan Theatre Club"],
  [/2st\.com/, "Second Stage"],
];
export function classify(label, url) {
  const l = label.toLowerCase(), u = (url || "").toLowerCase();
  const platform = (PLATFORMS.find(([re]) => re.test(u)) || [null, u ? "Show website" : null])[1];
  let type;
  if (/military/.test(l)) type = "special";
  else if (/student/.test(l)) type = "student";
  else if (/30 under 30|hiptix|linctix|mtc35|club \d+|under \d+/.test(l)) type = "young";
  else if (/\bsro\b|standing/.test(l)) type = "sro";
  else if (!/in-person|mobile|digital/.test(l) && [/lottery|lotto/, /rush/, /standing/].filter((re) => re.test(u)).length > 1) type = "special"; // unlabeled + ambiguous link
  else if (/lottery|lotto/.test(u) || /lottery/.test(l)) type = "lottery";
  else if (/rush/.test(u) || /in-person|mobile/.test(l)) type = "rush";
  else if (/digital/.test(l)) type = "lottery";
  else type = "special";
  // Readable channel: "In-person rush", "Digital lottery", "Mobile rush (TodayTix app)", …
  const channel = /in-person/.test(l) ? "In-person" : /mobile/.test(l) ? "Mobile" : /digital/.test(l) ? "Digital" : null;
  const m = label.match(/\$\s?([\d.]+)/);
  return { type, channel, platform, price: m ? parseFloat(m[1]) : null };
}

// ---------- parse the page ----------
export function parseRush(html) {
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const week = (text(body).match(/week of\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i) || [])[1] || null;
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const shows = [];
  let cur = null, m;
  while ((m = linkRe.exec(body))) {
    const attrs = m[1], label = text(m[2]);
    const href = decode((attrs.match(/href\s*=\s*"([^"]*)"/i) || [])[1] || "");
    const title = decode((attrs.match(/title\s*=\s*"([^"]*)"/i) || [])[1] || "");
    const at = title.match(/^(.*)\s+at\s+(.+)$/);
    if (at && label && !/^\$|% off/i.test(label)) {           // a show title link
      cur = { title: label, theater: at[2].trim(), deals: [] };
      shows.push(cur);
      continue;
    }
    if (cur && /^(\$\s?\d|\d+% off)/i.test(label)) {            // a discount link
      const c = classify(label, href);
      if (!cur.deals.some((d) => d.label === label && d.url === href)) cur.deals.push({ label, url: href, ...c });
    }
  }
  return { week, shows };
}

// ---------- match bwayrush titles to our show list ----------
export function matchToSlugs(rushShows, liveShows) {
  const ours = liveShows.map((s) => ({ slug: s.slug, n: norm(s.title) }));
  const out = {}, unmatched = [];
  for (const r of rushShows) {
    const n = norm(r.title);
    let hit = ours.filter((o) => o.n === n);
    if (hit.length !== 1) hit = ours.filter((o) => o.n.startsWith(n + " ") || n.startsWith(o.n + " ")); // "It's a Wonderful Life" ↔ "…: A Live Radio Play"
    if (hit.length === 1) out[hit[0].slug] = { title: r.title, theater: r.theater, deals: r.deals };
    else unmatched.push(r.title);
  }
  return { bySlug: out, unmatched };
}

async function main() {
  const prev = readWindowVar(OUT, "TM_RUSH");
  const live = readWindowVar(SHOWS_FILE, "TM_LIVE");
  const now = new Date().toISOString();
  const fileArg = process.argv.indexOf("--file");
  try {
    let html;
    if (fileArg > -1) html = readFileSync(process.argv[fileArg + 1], "utf8");
    else {
      const res = await fetch(SOURCE, { headers: { "User-Agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax; weekly, credits bwayrush.com)" }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`bwayrush.com responded ${res.status}`);
      html = await res.text();
    }
    const { week, shows } = parseRush(html);
    if (shows.length < MIN_SHOWS) throw new Error(`only found ${shows.length} shows (need ${MIN_SHOWS}); the page layout may have changed`);
    const { bySlug, unmatched } = matchToSlugs(shows, live?.shows || []);
    console.log(`Parsed ${shows.length} shows (${shows.filter((s) => s.deals.length).length} with deals); matched ${Object.keys(bySlug).length}.`);
    if (unmatched.length) console.log("Not on our show list:", unmatched.join(", "));
    write({ source: SOURCE, status: "ok", weekOf: week, updatedAt: now, lastAttemptAt: now, shows: bySlug, unmatched });
  } catch (e) {
    if (!prev) { console.error(`${e.message} — and there's no previous data.`); process.exit(1); }
    console.log(`::warning::Couldn't refresh lottery & rush (${e.message}). Keeping the data from ${prev.updatedAt}.`);
    write({ ...prev, status: "stale", lastAttemptAt: now, lastError: e.message });
  }
}
function write(payload) {
  writeFileSync(OUT, `// AUTO-GENERATED weekly by scripts/update-rush.mjs from bwayrush.com — do not edit by hand.\nwindow.TM_RUSH = ${JSON.stringify(payload, null, 1)};\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
