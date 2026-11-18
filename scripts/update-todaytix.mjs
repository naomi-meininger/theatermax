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
// Shows that start later: also price their first two weeks (from Broadway.com's calendar).
const cals = (load("data/schedules.js", "TM_SCHEDULES") || {}).shows || {};
const addDays = (isoDay, n) => { const d = new Date(isoDay + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ours = [...live.shows, ...(Array.isArray(extra) ? extra : [])].filter((s) => s.slug && s.title);

const norm = (t) => String(t).toLowerCase().replace(/&#x?[0-9a-f]+;/gi, "'").replace(/\((the met|encores!?|nycb)\)/g, "")
  .replace(/\b(on|off)[- ]broadway\b/g, "").replace(/\bthe musical\b|\bthe play\b|\bbroadway\b/g, "")
  .replace(/[’'`]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/^the /, "").trim();
const sameShow = (a, b) => { const x = norm(a), y = norm(b); return x === y || (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x))); };

// TodayTix section codes (ORCH, ORCHST, FMEZZ, RMEZZ, BALC, BOXL…) → our section ids.
const secId = (name) => { const n = String(name).toUpperCase();
  if (/STAGE/.test(n)) return "stage"; if (/^R(EAR)?\s*MEZ/.test(n)) return "rmezz"; if (/BOX|LOGE/.test(n)) return "box"; if (/BALC|GALL/.test(n)) return "balc";
  if (/MEZ|DRESS|CIRCLE|TIER/.test(n)) return "mezz"; if (/ORCH|ORC|STALL|PARQ|PARTERRE|PIT/.test(n)) return "orch"; return null; };
const to12 = (hhmm) => { const h = +hhmm.slice(0, 2), m = hhmm.slice(2); return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`; };
const ny = (d) => new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = ny(new Date()), from = iso(today), to = iso(new Date(today.getTime() + 13 * 864e5));

const QTYS = [1, 2, 4];
// Each show's far-out prices are refreshed one day a week (spread across the week); the first
// run after this was added refreshes everyone once.
// Far-out weeks only for shows that haven't opened yet (people book those well ahead);
// open shows just get the next two weeks.
const runs = (load("data/schedules.js", "TM_SCHEDULES") || {}).runs || {};
const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const extendToday = (slug) => { const r = runs[slug] || {}; return r.opening ? r.opening > todayIso : !!(r.previews && r.previews > todayIso); };
const now = new Date().toISOString();
const out = { status: "ok", updatedAt: now, lastAttemptAt: now, window: { from, to }, quantities: [1, 2, 4], ids: { ...(prev.ids || {}) }, shows: {} };
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
      // 2) prices for the next 13 days, for parties of 1, 2 and 4 (seats together)
      const byQty = {};
      for (const q of QTYS) {
      // compare_prices can run out of time and skip performances (performancesNotSearched),
      // so ask a week at a time and re-ask for any dates it skipped.
      const results = [];
      const ask = async (a, b, depth = 0) => {
        let r;
        try { r = await call("compare_prices", { showId: id.id, location: "nyc", startDate: a, endDate: b, quantity: q }); }
        catch (e) { if (/No performances/i.test(e.message)) return; throw e; }
        results.push(...(r.results || []));
        const missed = [...new Set((r.performancesNotSearched || []).map((x) => String(x.date || x).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
        if (missed.length && depth < 3) for (const d of missed) await ask(d, d, depth + 1);
      };
      const mid = iso(new Date(today.getTime() + 6 * 864e5)), mid2 = iso(new Date(today.getTime() + 7 * 864e5));
      await ask(from, mid); await ask(mid2, to);
      const first = cals[s.slug] && cals[s.slug].from;
      if (first && first > to) { await ask(first, addDays(first, 6)); await ask(addDays(first, 7), addDays(first, 13)); }
      // Further out (weeks 3–12), party of 2 only, refreshed for each show once a week.
      // Shows not open yet: weeks 3–12 (counted from their first performance if that's later), 2 tickets.
      const farStart = first && first > to ? addDays(first, 14) : addDays(from, 14);
      if (q === 2 && extendToday(s.slug)) for (let w = 0; w < 10; w++) { const a = addDays(farStart, w * 7); await ask(a, addDays(a, 6)); }
      const seenPerf = new Set();
      const perfs = {};
      for (const p of results) {
        const pk = p.date + p.time; if (seenPerf.has(pk)) continue; seenPerf.add(pk);
        if (!p.date || !p.time || p.cheapest == null) continue;
        const secs = {};
        for (const x of p.sections || []) { const k = secId(x.name); if (k && x.cheapest != null && (secs[k] == null || x.cheapest < secs[k])) secs[k] = x.cheapest; }
        perfs[`${p.date.slice(0, 10)} ${to12(String(p.time).padStart(4, "0"))}`] = {
          low: p.cheapest, med: p.median ?? null, high: p.mostExpensive ?? null, secs,
          best: p.cheapestBlock ? { sec: secId(p.cheapestBlock.section), row: p.cheapestBlock.row || null, url: p.cheapestBlock.seatingPlanUrl || null } : null,
          deal: !!(p.discount || p.promotion),
        };
      }
      if (Object.keys(perfs).length) byQty[q] = perfs;
      }
      const firstW = cals[s.slug] && cals[s.slug].from > to ? [[cals[s.slug].from, addDays(cals[s.slug].from, 13)]] : [];
      // Keep last week's far-out prices for days we didn't re-ask today.
      const ext = extendToday(s.slug);
      const farWindow = ext ? { from: first && first > to ? addDays(first, 14) : addDays(to, 1), to: addDays(first && first > to ? first : from, 83), checked: from } : null;
      const windows = [[from, to], ...firstW, ...(farWindow ? [[farWindow.from, farWindow.to]] : [])];
      if (Object.keys(byQty).length) out.shows[s.slug] = { id: id.id, url: id.url, perfs: byQty[2] || {}, byQty, windows, farWindow };
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
// TodayTix prices from TodayTix's official MCP server: per ticket, fees included, for 1, 2 and 4 seats together.
window.TM_TODAYTIX = ${JSON.stringify(out, null, 1)};
`);
