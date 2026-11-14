#!/usr/bin/env node
/**
 * Daily refresh of each show's REAL performance calendar → data/schedules.js.
 * Source: Broadway.com's per-show schedule page, e.g. https://www.broadway.com/shows/wicked/schedule/
 * Runs as a step of .github/workflows/update-shows.yml, right after the show list updates.
 *
 *   node scripts/update-schedules.mjs                       # fetch every show in data/live-shows.js
 *   node scripts/update-schedules.mjs --file page.html      # parse one saved page (testing)
 *
 * Why: shows don't all follow the "dark Monday" week, and holiday weeks are irregular
 * (extra Monday shows, 3pm matinees, cancelled evenings). We keep only facts: date, curtain time,
 * and the "from $" price Broadway.com shows for that performance, when listed.
 * If a show's page can't be fetched or parsed, that show keeps yesterday's calendar.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "schedules.js");
const PAUSE_MS = 600;
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const text = (h) => decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const readWindowVar = (file, name) => {
  if (!existsSync(file)) return null;
  const w = {}; new Function("window", readFileSync(file, "utf8"))(w); return w[name] ?? null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Show page "Show Dates: Previews: Nov 16, 2026 • Opening: Nov 30, 2026 • Closing: Dec 30, 2026" → ISO dates. */
export function parseRunDates(html) {
  const t = text(html), out = {};
  for (const [k, label] of [["previews", "Previews"], ["opening", "Opening"], ["closing", "Closing"]]) {
    const m = t.match(new RegExp(label + ":\\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\\d{1,2}), (\\d{4})"));
    if (m) out[k] = `${m[3]}-${String(MONTHS[m[1]]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return out;
}

/** "Tue, Dec 15, 2026 7:00pm from $97.28" … → { "2026-12-15": [{ t: "7:00 PM", from: 97.28 }] } */
export function parseSchedule(html) {
  const t = text(html), out = {};
  const re = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) ?(am|pm)(?: from \$([\d,]+(?:\.\d{2})?))?/gi;
  for (const m of t.matchAll(re)) {
    const day = `${m[4]}-${String(MONTHS[m[2]]).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const time = `${+m[5]}:${m[6]} ${m[7].toUpperCase()}`;
    const list = out[day] || (out[day] = []);
    if (list.some((p) => p.t === time)) continue;
    const perf = { t: time };
    if (m[8]) perf.from = +m[8].replace(/,/g, "");
    list.push(perf);
  }
  const mins = (s) => { const [hm, ap] = s.split(" "); let [h, mm] = hm.split(":").map(Number); if (ap === "PM" && h !== 12) h += 12; if (ap === "AM" && h === 12) h = 0; return h * 60 + mm; };
  for (const d of Object.keys(out)) out[d].sort((a, b) => mins(a.t) - mins(b.t));
  return out;
}

async function run() {
  const live = readWindowVar(path.join(ROOT, "data", "live-shows.js"), "TM_LIVE") || { shows: [] };
  const prev = readWindowVar(OUT, "TM_SCHEDULES") || { shows: {} };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const shows = {}, runs = {};
  let ok = 0, kept = 0;
  for (const s of live.shows) {
    if (!s.url || !/broadway\.com\/shows\//.test(s.url)) continue;
    const url = s.url.replace(/\/?$/, "/") + "schedule/";
    // Run dates (first preview / opening / closing) from the show's main page.
    try {
      const r = await fetch(s.url, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax)" } });
      const rd = r.ok ? parseRunDates(await r.text()) : {};
      if (Object.keys(rd).length) runs[s.slug] = rd; else if (prev.runs && prev.runs[s.slug]) runs[s.slug] = prev.runs[s.slug];
    } catch { if (prev.runs && prev.runs[s.slug]) runs[s.slug] = prev.runs[s.slug]; }
    await sleep(PAUSE_MS);
    try {
      const res = await fetch(url, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax)" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const cal = parseSchedule(await res.text());
      const days = Object.keys(cal).filter((d) => d >= today);
      if (!days.length) throw new Error("no upcoming performances found");
      days.sort();
      // Only trust the calendar while it looks complete: stop before the first 7-day stretch
      // with fewer than 3 performances (a page that lists only some dates would otherwise
      // make the missing days look "dark"). A show's final week is allowed to be short.
      const DAY = 864e5, d0 = Date.parse(days[0]), dEnd = Date.parse(days.at(-1));
      let to = days.at(-1);
      for (let w = d0; w + 7 * DAY <= dEnd; w += 7 * DAY) {
        const n = days.filter((d) => { const t = Date.parse(d); return t >= w && t < w + 7 * DAY; }).reduce((a, d) => a + cal[d].length, 0);
        if (n < 3) { to = new Date(w - DAY).toISOString().slice(0, 10); break; }
      }
      if (to < days[0]) throw new Error("calendar too sparse to trust");
      shows[s.slug] = { source: url, from: days[0], to, days: Object.fromEntries(days.filter((d) => d <= to).map((d) => [d, cal[d]])) };
      ok++;
    } catch (e) {
      if (prev.shows && prev.shows[s.slug]) { shows[s.slug] = prev.shows[s.slug]; kept++; }
      console.warn(`${s.slug}: ${e.message}${prev.shows && prev.shows[s.slug] ? " (kept yesterday's)" : ""}`);
    }
    await sleep(PAUSE_MS);
  }
  console.log(`Calendars: ${ok} fresh, ${kept} kept from yesterday.`);
  const status = ok ? "ok" : Object.keys(shows).length ? "stale" : "unavailable";
  writeFileSync(OUT, `// Auto-generated by scripts/update-schedules.mjs from Broadway.com schedule pages. Do not edit by hand.\nwindow.TM_SCHEDULES = ${JSON.stringify({ status, updatedAt: new Date().toISOString(), runs, shows })};\n`);
}

const args = process.argv.slice(2);
if (args[0] === "--run") console.log(parseRunDates(readFileSync(args[1], "utf8")));
else if (args[0] === "--file") console.log(JSON.stringify(parseSchedule(readFileSync(args[1], "utf8")), null, 1));
else if (import.meta.url === `file://${process.argv[1]}`) run().catch((e) => { console.error(e); process.exit(1); });
