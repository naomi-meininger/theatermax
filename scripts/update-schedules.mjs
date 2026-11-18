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
// The show's own share image (og:image): the key art producers publish for link previews.
// We store only the URL and show it hotlinked; nothing is copied.
export function parseOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const u = m && m[1].replace(/&amp;/g, "&");
  return u && /^https:\/\//.test(u) && !/logo|default|placeholder|fallback/i.test(u) ? u : null;
}

/** Event page "Pricing by Section": "… 8:00pm Balcony $77.31 $109.61 …" → { balc: { lo, hi }, … } */
export function parseSectionPrices(html) {
  const t = text(html), i = t.search(/Pricing by Section/i);
  if (i < 0) return null;
  const seg = t.slice(i, i + 3000), out = {};
  const id = (n) => /stage/i.test(n) ? "stage" : /rear mezz/i.test(n) ? "rmezz" : /box|loge/i.test(n) ? "box" : /balc/i.test(n) ? "balc" : /mezz|dress|circle/i.test(n) ? "mezz" : /orch|stall|premium/i.test(n) ? "orch" : null;
  for (const m of seg.matchAll(/(?:am|pm)\s+([A-Za-z][A-Za-z .&'-]{2,40}?)\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})/gi)) {
    const k = id(m[1]); if (!k) continue;
    const lo = +m[2].replace(/,/g, ""), hi = +m[3].replace(/,/g, "");
    if (!out[k] || lo < out[k].lo) out[k] = { lo, hi: Math.max(hi, out[k] ? out[k].hi : 0) };
  }
  return Object.keys(out).length ? out : null;
}

/** Visitor info from a Broadway.com show page: running time, address, age guidance, advisories. */
export function parseShowInfo(html) {
  const t = text(html), info = {};
  // Theater name: the "Theater" block on Broadway.com show pages ("Learn more about the theater. <name>").
  // Prefer the link to the venue page (/venues/theaters/<slug>/), whose text is the theater's name.
  const vl = [...html.matchAll(/href="[^"]*\/venues\/[a-z-]+\/[a-z0-9-]+\/?"[^>]*>\s*([^<]{3,90}?)\s*</gi)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").trim())
    .find((n) => /[A-Za-z]/.test(n) && !/^(view|see|learn|more|map|directions|venue|theaters?)\b/i.test(n));
  if (vl) { info.theater = vl; }
  const th = info.theater ? null : t.match(/Learn more about the theater\.?\s+([A-Z][^.\n]{3,80}?)(?=\s+(?:Hearing|Wheelchair|Accessib|Restroom|Address|\d{2,4}\s)|\s*$)/);
  if (th) info.theater = th[1].trim().replace(/\s+Entrance$/i, "");
  const rt = t.match(/(?:Running Time|Run Time|Runtime)\s*:?\s*((?:\d+\s*(?:hours?|hrs?|h)\.?\s*(?:and\s*)?)?(?:\d+\s*(?:minutes?|mins?|m)\.?)?(?:[^.]{0,40}?(?:intermission|no intermission))?)/i);
  if (rt && /\d/.test(rt[1])) info.runtime = rt[1].replace(/\s+/g, " ").trim();
  const ad = t.match(/(\d{2,4}\s+(?:West|East|W\.?|E\.?)\s+\d{1,3}(?:st|nd|rd|th)\s+(?:Street|St\.?))/i) || t.match(/(\d{1,4}\s+(?:\d{1,2}(?:st|nd|rd|th)|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:Avenue|Ave\.?|Street|St\.?|Place|Plaza))/);
  if (ad) info.address = ad[1].replace(/\s+/g, " ");
  const age = t.match(/(?:Age (?:Recommendation|Guidance|Restriction)s?|Recommended for ages?|Suitable for)\s*:?\s*([^.]{2,60}?)(?:\.|\s{2}|$)/i);
  if (age) info.age = age[1].trim();
  const adv = [...new Set([...t.matchAll(/\b(strobe lights?|flashing lights?|haze|fog|smoke|gunshots?|gunfire|loud noises?|nudity|mature content|strong language|pyrotechnics)\b/gi)].map((m) => m[1].toLowerCase()))];
  if (adv.length) info.advisories = adv.slice(0, 8);
  return info;
}

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
  // Each performance links to its event page: /shows/<slug>/event/<id>/<MM-DD-YYYY>/<HHMM>/
  const events = {};
  for (const m of html.matchAll(/\/shows\/[a-z0-9-]+\/event\/(\d+)\/(\d{2})-(\d{2})-(\d{4})\/(\d{2})(\d{2})\//g)) {
    const h = +m[5], time = `${h % 12 || 12}:${m[6]} ${h < 12 ? "AM" : "PM"}`;
    events[`${m[4]}-${m[2]}-${m[3]} ${time}`] = m[0];
  }
  const re = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) ?(am|pm)(?: from \$([\d,]+(?:\.\d{2})?)| (sold out|soldout))?/gi;
  for (const m of t.matchAll(re)) {
    const day = `${m[4]}-${String(MONTHS[m[2]]).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const time = `${+m[5]}:${m[6]} ${m[7].toUpperCase()}`;
    const list = out[day] || (out[day] = []);
    if (list.some((p) => p.t === time)) continue;
    const perf = { t: time };
    if (m[8]) perf.from = +m[8].replace(/,/g, "");
    if (m[9]) perf.soldOut = true;
    const ev = events[`${day} ${time}`]; if (ev) perf.ev = ev;
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
  // Images: keep what we have (dropping Broadway.com's placeholder art); shows without one are
  // rechecked at most once a month (imagesChecked), so a newly added poster gets picked up.
  const images = Object.fromEntries(Object.entries(prev.images || {}).filter(([, u]) => !/fallback|placeholder/i.test(u)));
  const imagesChecked = { ...(prev.imagesChecked || {}) };
  const dueForImage = (slug) => !images[slug] && (!imagesChecked[slug] || Date.now() - Date.parse(imagesChecked[slug]) > 30 * 864e5);
  const shows = {}, runs = {}, info = {};
  let ok = 0, kept = 0;
  for (const s of live.shows) {
    if (!s.url || !/broadway\.com\/shows\//.test(s.url)) continue;
    const url = s.url.replace(/\/?$/, "/") + "schedule/";
    // Run dates (first preview / opening / closing) from the show's main page.
    try {
      const r = await fetch(s.url, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax)" } });
      const html = r.ok ? await r.text() : "";
      const rd = html ? parseRunDates(html) : {};
      if (html) { const inf = parseShowInfo(html); if (Object.keys(inf).length) info[s.slug] = inf; }
      if (html && dueForImage(s.slug)) { const img = parseOgImage(html); if (img) images[s.slug] = img; imagesChecked[s.slug] = new Date().toISOString(); }
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
  // Section prices from each performance's event page, next 14 days (Broadway.com's own
  // "Pricing by Section" table). Capped so the daily run stays polite.
  const horizon = new Date(Date.parse(today) + 14 * 864e5).toISOString().slice(0, 10);
  let evFetched = 0;
  for (const [slug, cal] of Object.entries(shows)) {
    for (const [day, perfs] of Object.entries(cal.days || {})) {
      if (day > horizon) continue;
      for (const p of perfs) {
        if (!p.ev || evFetched >= 1500) continue;
        try {
          const r = await fetch("https://www.broadway.com" + p.ev, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax)" } });
          evFetched++;
          const secs = r.ok ? parseSectionPrices(await r.text()) : null;
          if (secs) p.secs = secs;
        } catch {}
        await sleep(350);
      }
    }
  }
  console.log(`Section prices: ${evFetched} event pages.`);

  // Images for our own extra shows (City Center, Met, NYCB…): from the show's own page when
  // its ticket link is specific to that show (not a link shared by several shows).
  const extra = readWindowVar(path.join(ROOT, "data", "extra-shows.js"), "TM_EXTRA_SHOWS") || [];
  const linkCount = {}; extra.forEach((x) => x.tickets && (linkCount[x.tickets] = (linkCount[x.tickets] || 0) + 1));
  for (const x of extra) {
    const page = x.page || (x.tickets && linkCount[x.tickets] === 1 ? x.tickets : null);
    if (!page || !dueForImage(x.slug)) continue;
    imagesChecked[x.slug] = new Date().toISOString();
    try {
      const r = await fetch(page, { headers: { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax)" } });
      const img = r.ok && parseOgImage(await r.text()); if (img) images[x.slug] = img;
    } catch {}
    await sleep(PAUSE_MS);
  }
  console.log(`Calendars: ${ok} fresh, ${kept} kept from yesterday. Images: ${Object.keys(images).length}.`);
  const status = ok ? "ok" : Object.keys(shows).length ? "stale" : "unavailable";
  writeFileSync(OUT, `// Auto-generated by scripts/update-schedules.mjs from Broadway.com schedule pages. Do not edit by hand.\nwindow.TM_SCHEDULES = ${JSON.stringify({ status, updatedAt: new Date().toISOString(), runs, info, images, imagesChecked, shows })};\n`);
}

const args = process.argv.slice(2);
if (args[0] === "--run") console.log(parseRunDates(readFileSync(args[1], "utf8")));
else if (args[0] === "--file") console.log(JSON.stringify(parseSchedule(readFileSync(args[1], "utf8")), null, 1));
else if (import.meta.url === `file://${process.argv[1]}`) run().catch((e) => { console.error(e); process.exit(1); });
