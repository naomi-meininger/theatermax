// Daily TodayTix prices via TodayTix's official MCP server (their supported programmatic
// interface — see https://www.todaytix.com/llms.txt; their terms forbid scraping the site).
//
// For each show on our list: find its TodayTix id (cached), then one compare_prices call
// for the next 13 days, party of 2. Output per performance: cheapest / median / highest
// price per ticket (fees included) and cheapest per section, mapped to our sections.
// Rules we follow from TodayTix's guide: read-only, back off when throttled, only quote
// currently bookable prices (we only store what the server says is on sale today).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { connect, callTool, sleep } from "./todaytix-mcp.mjs";

const OUT = "data/todaytix.js";
const load = (file, name) => { if (!existsSync(file)) return null; const ctx = { window: {} }; vm.runInNewContext(readFileSync(file, "utf8"), ctx); return ctx.window[name] || null; };
const prev = load(OUT, "TM_TODAYTIX") || { ids: {}, shows: {} };
const live = load("data/live-shows.js", "TM_LIVE") || { shows: [] };
const extra = load("data/extra-shows.js", "TM_EXTRA_SHOWS") || [];
const ours = [...live.shows, ...(Array.isArray(extra) ? extra : [])].filter((s) => s.slug && s.title);

const norm = (t) => String(t).toLowerCase().replace(/&#x?[0-9a-f]+;/gi, "'").replace(/\((the met|encores!?|nycb)\)/g, "")
  .replace(/\b(on|off)[- ]broadway\b/g, "").replace(/\bthe musical\b|\bthe play\b|\bbroadway\b/g, "")
  .replace(/[’'`]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/^the /, "").trim();
const sameShow = (a, b) => { const x = norm(a), y = norm(b); return x === y || (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x))); };

// TodayTix section codes (ORCH, ORCHST, FMEZZ, RMEZZ, BALC, BOXL…) → our section ids.
const secId = (name) => { const n = String(name).toUpperCase();
  if (/STAGE/.test(n)) return "stage"; if (/BOX|LOGE/.test(n)) return "box"; if (/BALC|GALL/.test(n)) return "balc";
  if (/MEZ|DRESS|CIRCLE|TIER/.test(n)) return "mezz"; if (/ORCH|ORC|STALL|PARQ|PARTERRE|PIT/.test(n)) return "orch"; return null; };
const to12 = (hhmm) => { const h = +hhmm.slice(0, 2), m = hhmm.slice(2); return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`; };
const ny = (d) => new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = ny(new Date()), from = iso(today), to = iso(new Date(today.getTime() + 13 * 864e5));

const now = new Date().toISOString();
const out = { status: "ok", updatedAt: now, lastAttemptAt: now, window: { from, to }, quantity: 2, ids: { ...(prev.ids || {}) }, shows: {} };
let calls = 0, errors = 0;
const call = async (name, args) => { calls++; await sleep(700); return callTool(name, args); };

try {
  await connect();
  for (const s of ours) {
    try {
      // 1) TodayTix id (cached; null = searched, not on TodayTix — re-check weekly)
      let id = out.ids[s.slug];
      const stale = id && id.checked && (Date.now() - Date.parse(id.checked)) > 7 * 864e5;
      if (id === undefined || (id && id.id == null && stale)) {
        const r = await call("search_shows", { query: norm(s.title).slice(0, 50) || s.title.slice(0, 50), location: "nyc" });
        const hit = (r.results || []).find((x) => sameShow(x.name, s.title));
        id = out.ids[s.slug] = hit ? { id: hit.id, name: hit.name, url: hit.url, checked: now } : { id: null, checked: now };
      }
      if (!id || id.id == null) continue;
      // 2) prices for the next 13 days
      const r = await call("compare_prices", { showId: id.id, location: "nyc", startDate: from, endDate: to, quantity: 2 });
      const perfs = {};
      for (const p of r.results || []) {
        if (!p.date || !p.time || p.cheapest == null) continue;
        const secs = {};
        for (const x of p.sections || []) { const k = secId(x.name); if (k && x.cheapest != null && (secs[k] == null || x.cheapest < secs[k])) secs[k] = x.cheapest; }
        perfs[`${p.date.slice(0, 10)} ${to12(String(p.time).padStart(4, "0"))}`] = {
          low: p.cheapest, med: p.median ?? null, high: p.mostExpensive ?? null, secs,
          best: p.cheapestBlock ? { sec: secId(p.cheapestBlock.section), row: p.cheapestBlock.row || null, url: p.cheapestBlock.seatingPlanUrl || null } : null,
          deal: !!(p.discount || p.promotion),
        };
      }
      if (Object.keys(perfs).length) out.shows[s.slug] = { id: id.id, url: id.url, perfs };
    } catch (e) {
      errors++; console.error(`${s.slug}: ${e.message}`);
      if (/denied|throttled/.test(e.message)) throw e; // stop politely
      if (prev.shows && prev.shows[s.slug]) out.shows[s.slug] = prev.shows[s.slug];
    }
  }
} catch (e) {
  console.error("Stopped:", e.message);
  out.status = Object.keys(out.shows).length ? "partial" : "stale"; out.lastError = e.message;
  for (const [k, v] of Object.entries(prev.shows || {})) if (!out.shows[k]) out.shows[k] = v;
  if (!Object.keys(out.shows).length) out.updatedAt = prev.updatedAt || null;
}
console.log(`TodayTix: ${calls} calls, ${errors} errors, ${Object.keys(out.shows).length} shows with prices, ${Object.values(out.ids).filter((x) => x && x.id).length} matched ids`);
writeFileSync(OUT, `// AUTO-GENERATED by scripts/update-todaytix.mjs — do not edit by hand.
// TodayTix prices from TodayTix's official MCP server: per ticket, fees included, for 2 seats together.
window.TM_TODAYTIX = ${JSON.stringify(out, null, 1)};
`);
