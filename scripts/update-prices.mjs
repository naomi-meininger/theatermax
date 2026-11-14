#!/usr/bin/env node
/**
 * Pull REAL ticket prices for every show from the SeatGeek and Ticketmaster APIs
 * and write data/live-prices.js (one entry per show per performance).
 *
 *   SEATGEEK_CLIENT_ID=... TICKETMASTER_API_KEY=... node scripts/update-prices.mjs
 *
 * Keys come from GitHub Actions secrets (see README → "Live prices").
 * - A source with no key is skipped (status "not-configured"); the site keeps using sample rows.
 * - If a source fails (network error, bad key, rate limit), its previous data is kept and
 *   marked "stale", so the site never loses prices it already had.
 * - Only the next DAYS_AHEAD days are fetched, matching the site's date picker.
 *
 * What each API gives (free tiers):
 *   SeatGeek:     lowest / highest / median price per performance (lowest includes fees), listing count, link
 *   Ticketmaster: face-value min / max price range per performance (before fees), link
 * Neither gives prices by section on the free tier — the site labels these rows "any section".
 *
 * No dependencies — Node 18+.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOWS_FILE = path.join(ROOT, "data", "live-shows.js");
const THEATERS_FILE = path.join(ROOT, "data", "shows.js");
const OUT = path.join(ROOT, "data", "live-prices.js");
const DAYS_AHEAD = 14;

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readWindowVar = (file, name) => {
  if (!existsSync(file)) return null;
  const src = readFileSync(file, "utf8");
  const sandbox = { window: {} };
  new Function("window", src)(sandbox.window); // our own data files: plain `window.X = {...}`
  return sandbox.window[name] ?? null;
};

// "The Lost Boys, A New Musical" → "lost boys"; "Hamilton (NY)" → "hamilton"
export function norm(title) {
  return String(title)
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(a new musical|the musical|musical|on broadway|broadway|off-broadway|new york|nyc|ny|live on broadway)\b/g, " ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/^\s*(the|a|an)\s+/, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const normVenue = (v) => String(v || "").toLowerCase().replace(/\b(the|theatre|theater)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Does an API event belong to this show?
 * - Exact title match (after normalizing) is always required unless we can confirm the venue.
 * - Looser "title starts with / contains" matching is only allowed when we know the show's theater
 *   and the event is at that theater (so "Annie" never matches "Annie Lennox" at Radio City).
 */
export function matches(show, eventTitle, venueName, theater) {
  const a = norm(show.title), b = norm(eventTitle);
  if (!a || !b) return false;
  const t = normVenue(theater), v = normVenue(venueName);
  const venueKnown = !!(t && v);
  const venueOk = venueKnown && (v.includes(t) || t.includes(v));
  if (venueKnown && !venueOk) return false;            // wrong building → never a match
  if (a === b) return true;
  if (!venueOk) return false;                          // fuzzy title match needs a confirmed venue
  return (a.length >= 3 && (b.startsWith(a + " ") || b.includes(" " + a + " ") || b.endsWith(" " + a))) ||
    (b.length >= 4 && a.startsWith(b + " "));
}

// "2026-11-14T14:00:00" or ("2026-11-14","14:00:00") → { date: "2026-11-14", time: "2:00 PM" }
export function perfKey(dateStr, timeStr) {
  let d = dateStr, t = timeStr;
  if (!t && d && d.includes("T")) [d, t] = d.split("T");
  if (!d || !t) return null;
  const [hh, mm] = t.split(":").map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  return { date: d, time: `${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}` };
}

const round2 = (n) => Math.round(n * 100) / 100;

async function getJSON(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": "TheaterMax/1.0 (+https://github.com/naomi-meininger/theatermax)" }, signal: AbortSignal.timeout(20000) });
  if (res.status === 429) throw Object.assign(new Error("rate limited (429)"), { fatal: true });
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error(`key rejected (${res.status})`), { fatal: true });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------- SeatGeek ----------
export async function fetchSeatGeek(show, theater, { clientId, from, to, fetchImpl = fetch }) {
  const params = new URLSearchParams({
    client_id: clientId, q: show.title, "venue.city": "New York", per_page: "100",
    "datetime_local.gte": from, "datetime_local.lte": to,
  });
  const data = await getJSON(`https://api.seatgeek.com/2/events?${params}`, fetchImpl);
  const perfs = {};
  for (const ev of data.events || []) {
    if (!matches(show, ev.short_title || ev.title, ev.venue?.name, theater) && !matches(show, ev.title, ev.venue?.name, theater)) continue;
    const k = perfKey(ev.datetime_local);
    const st = ev.stats || {};
    if (!k || st.lowest_price == null) continue;
    perfs[`${k.date} ${k.time}`] = {
      low: round2(st.lowest_price), high: st.highest_price != null ? round2(st.highest_price) : null,
      median: st.median_price != null ? round2(st.median_price) : null,
      listings: st.listing_count ?? null, url: ev.url, venue: ev.venue?.name || null,
    };
  }
  return perfs;
}

// ---------- Ticketmaster ----------
export async function fetchTicketmaster(show, theater, { apiKey, from, to, fetchImpl = fetch }) {
  const params = new URLSearchParams({
    apikey: apiKey, keyword: show.title, city: "New York", stateCode: "NY", size: "100",
    startDateTime: `${from}T00:00:00Z`, endDateTime: `${to}T23:59:59Z`, sort: "date,asc",
  });
  const data = await getJSON(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, fetchImpl);
  const perfs = {};
  for (const ev of data._embedded?.events || []) {
    const venue = ev._embedded?.venues?.[0]?.name;
    if (!matches(show, ev.name, venue, theater)) continue;
    const k = perfKey(ev.dates?.start?.localDate, ev.dates?.start?.localTime);
    const pr = (ev.priceRanges || []).filter((p) => (p.currency || "USD") === "USD");
    if (!k || !pr.length) continue;
    perfs[`${k.date} ${k.time}`] = {
      min: round2(Math.min(...pr.map((p) => p.min))), max: round2(Math.max(...pr.map((p) => p.max))),
      url: ev.url, venue: venue || null,
    };
  }
  return perfs;
}

// ---------- main ----------
export async function run({ env = process.env, fetchImpl = fetch, now = new Date(), delayMs = 250, log = console.log } = {}) {
  const live = readWindowVar(SHOWS_FILE, "TM_LIVE");
  if (!live?.shows?.length) throw new Error("data/live-shows.js has no shows — run update-shows.mjs first.");
  const theaters = readWindowVar(THEATERS_FILE, "TM_THEATERS") || {};
  const prev = readWindowVar(OUT, "TM_PRICES");

  // Dates in New York time (Actions runs in UTC, and an evening run would otherwise skip "today").
  const iso = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const from = iso(now), to = iso(new Date(now.getTime() + (DAYS_AHEAD - 1) * 864e5));
  const stamp = now.toISOString();
  const shows = live.shows.filter((s) => s.fromPrice !== null); // only shows on sale

  const SOURCES = [
    { id: "seatgeek", key: env.SEATGEEK_CLIENT_ID, fn: (s, t) => fetchSeatGeek(s, t, { clientId: env.SEATGEEK_CLIENT_ID, from, to, fetchImpl }) },
    { id: "ticketmaster", key: env.TICKETMASTER_API_KEY, fn: (s, t) => fetchTicketmaster(s, t, { apiKey: env.TICKETMASTER_API_KEY, from, to, fetchImpl }) },
  ];

  const out = { updatedAt: stamp, window: { from, to }, sources: {}, shows: {} };
  const put = (slug, perfKey, src, val) => {
    out.shows[slug] ??= {};
    out.shows[slug][perfKey] ??= {};
    out.shows[slug][perfKey][src] = val;
  };
  const keepPrevious = (src) => {
    for (const [slug, perfs] of Object.entries(prev?.shows || {})) {
      for (const [k, v] of Object.entries(perfs)) {
        if (v[src] && k.slice(0, 10) >= from) put(slug, k, src, v[src]); // drop past performances
      }
    }
  };

  for (const src of SOURCES) {
    const before = prev?.sources?.[src.id];
    if (!src.key) {
      log(`[${src.id}] no API key set — skipping (add it as a GitHub secret to turn it on).`);
      out.sources[src.id] = { status: "not-configured", updatedAt: before?.updatedAt || null };
      keepPrevious(src.id);
      continue;
    }
    let matched = 0, errors = 0, fatal = null;
    const got = {};
    for (const show of shows) {
      try {
        const perfs = await src.fn(show, theaters[show.slug]);
        if (Object.keys(perfs).length) { got[show.slug] = perfs; matched++; }
      } catch (e) {
        errors++;
        if (e.fatal) { fatal = e.message; break; }
      }
      if (delayMs) await sleep(delayMs);
    }
    // If the source is broken (bad key, rate limit, or nearly every call failed), keep yesterday's data.
    if (fatal || (errors > 0 && errors >= shows.length * 0.5)) {
      const why = fatal || `${errors} of ${shows.length} requests failed`;
      log(`::warning::[${src.id}] ${why} — keeping previous prices from ${before?.updatedAt || "never"}.`);
      out.sources[src.id] = { status: "stale", updatedAt: before?.updatedAt || null, lastAttemptAt: stamp, lastError: why };
      keepPrevious(src.id);
      continue;
    }
    for (const [slug, perfs] of Object.entries(got)) for (const [k, v] of Object.entries(perfs)) put(slug, k, src.id, v);
    out.sources[src.id] = { status: "ok", updatedAt: stamp, lastAttemptAt: stamp, showsMatched: matched, errors };
    log(`[${src.id}] prices for ${matched} of ${shows.length} shows${errors ? ` (${errors} requests failed)` : ""}.`);
  }

  const js = `// AUTO-GENERATED by scripts/update-prices.mjs — do not edit by hand.\n` +
    `// Real prices per performance from SeatGeek (lowest, incl. fees) and Ticketmaster (face value, before fees).\n` +
    `window.TM_PRICES = ${JSON.stringify(out, null, 1)};\n`;
  writeFileSync(OUT, js);
  log(`Wrote ${path.relative(process.cwd(), OUT)}.`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
