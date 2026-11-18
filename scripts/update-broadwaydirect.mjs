// Daily Broadway Direct prices from Broadway Direct's public AI Discovery API
// (tickets.broadwaydirect.com/api/v1/agentic, documented in tickets.broadwaydirect.com/llms.txt).
// broadwaydirect.com/ai.txt says agents may "use pricing and availability data to help users find
// and book tickets", and the guide asks agents to always show the publicUrl booking link, so every
// price we store carries the performance's publicUrl.
//
// For each show Broadway Direct sells: list performances in the next two weeks, read each one's
// seat inventory, and keep the cheapest seat per section (mapped to our sections) and overall.
// Prices are all-in: the seat map shows ticket + online fee (e.g. $225 + $21 = $246).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const OUT = "data/broadwaydirect.js";
const API = "https://tickets.broadwaydirect.com/api/v1/agentic";
const UA = "TheaterMax/1.0 (+https://naomi-meininger.github.io/theatermax/)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load = (file, name) => { if (!existsSync(file)) return null; const ctx = { window: {} }; vm.runInNewContext(readFileSync(file, "utf8"), ctx); return ctx.window[name]; };
const prev = load(OUT, "TM_BD") || { shows: {} };
const live = load("data/live-shows.js", "TM_LIVE") || { shows: [] };
const extra = load("data/extra-shows.js", "TM_EXTRA_SHOWS") || [];
const ours = [...live.shows, ...(Array.isArray(extra) ? extra : [])].filter((s) => s.slug && s.title);

const norm = (t) => String(t).toLowerCase().replace(/&#x?[0-9a-f]+;/gi, "'").replace(/\(.*?\)/g, "")
  .replace(/\b(on|off)[- ]broadway\b/g, "").replace(/\bthe musical\b|\bthe play\b|\bbroadway\b/g, "")
  .replace(/[’'`]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/^the /, "").trim();
const sameShow = (a, b) => { const x = norm(a), y = norm(b); return x === y || (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x))); };

// Broadway Direct section names (ORCH, ORCH L, MEZZ C, FRONT MEZZ, REAR MEZZ, BALC, BOX A…) → our ids.
const secId = (name) => { const n = String(name).toUpperCase();
  if (/STAGE|ONSTAGE|TABLE|FLOOR/.test(n)) return "stage"; if (/^R(EAR)?\s*MEZ/.test(n)) return "rmezz"; if (/BOX|LOGE/.test(n)) return "box"; if (/BALC|GALL/.test(n)) return "balc";
  if (/MEZ|DRESS|CIRCLE|TIER/.test(n)) return "mezz"; if (/ORCH|ORC|STALL|PARQ|PARTERRE|PIT/.test(n)) return "orch"; return null; };
const to12 = (hh, mm) => `${hh % 12 || 12}:${mm} ${hh < 12 ? "AM" : "PM"}`;
const ny = (d) => new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = ny(new Date()), from = iso(today), to = iso(new Date(today.getTime() + 13 * 864e5));

let calls = 0;
async function get(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(calls++ ? 300 : 0);
    const r = await fetch(API + path, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  }
  throw new Error(`${path}: throttled`);
}

const out = { status: "ok", updatedAt: new Date().toISOString(), window: { from, to }, series: {}, shows: {} };
let errors = 0;
try {
  const series = (await get("/events/series")).result || [];
  for (const s of series) {
    const slug = s.metadata && s.metadata.slug;
    const mine = ours.find((o) => o.slug === slug) || ours.find((o) => sameShow(o.title, s.name));
    out.series[s.seriesCode] = { name: s.name, slug: mine ? mine.slug : null, venue: s.venue && s.venue.name };
    if (!mine) continue;
    try {
      const events = [];
      for (let page = 0; page < 5; page++) {
        const r = await get(`/events?seriesCode=${encodeURIComponent(s.seriesCode)}&pageSize=100&page=${page}`);
        const res = r.result || [];
        events.push(...res);
        if (res.length < 100 || res.some((e) => String(e.date).slice(0, 10) > to)) break;
      }
      const perfs = {};
      for (const e of events) {
        const day = String(e.date).slice(0, 10);
        if (day < from || day > to) continue;
        const inv = await get(`/events/${e.id}/inventory`);
        const secs = {}, raw = {};
        let low = null, n = 0;
        const add = (section, price, count = 1) => {
          if (price == null || !(price > 0)) return;
          n += count; if (low == null || price < low) low = price;
          raw[section] = Math.min(raw[section] ?? Infinity, price);
          const k = secId(section); if (k && (secs[k] == null || price < secs[k])) secs[k] = price;
        };
        for (const seat of inv.seats || []) add(seat.section, seat.price);
        for (const ga of inv.gaSections || []) add(ga.name || ga.section || "GA", ga.price ?? ga.minPrice, ga.available ?? 1);
        const [hh, mm] = String(e.date).slice(11, 16).split(":");
        perfs[`${day} ${to12(+hh, mm)}`] = { low, seats: n, secs, raw, url: e.publicUrl || inv.publicUrl || null };
      }
      out.shows[mine.slug] = { seriesCode: s.seriesCode, name: s.name, url: s.publicUrl || (s.metadata && s.metadata.ticketUrl) || null, perfs };
      console.log(`${mine.slug}: ${Object.keys(perfs).length} performances`);
    } catch (e) {
      errors++; console.error(`${mine.slug}: ${e.message}`);
      if (prev.shows && prev.shows[mine.slug]) out.shows[mine.slug] = prev.shows[mine.slug];
    }
  }
} catch (e) {
  console.error(e.message);
  out.status = "error"; out.error = e.message;
  if (prev.shows) out.shows = prev.shows;
}
if (errors) out.errors = errors;
out.calls = calls;
writeFileSync(OUT, `// AUTO-GENERATED by scripts/update-broadwaydirect.mjs — do not edit by hand.
// Broadway Direct prices from its public AI Discovery API (tickets.broadwaydirect.com/llms.txt):
// cheapest listed seat per section, per performance, next two weeks. Booking link = publicUrl.
window.TM_BD = ${JSON.stringify(out, null, 1)};
`);
console.log(`Done: ${Object.keys(out.shows).length} shows, ${calls} API calls, ${errors} errors`);
