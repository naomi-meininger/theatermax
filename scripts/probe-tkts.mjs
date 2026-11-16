// One-off: save what TDF's TKTS Live page serves, to find where today's listings come from.
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "TheaterMaxBot/1.0 (+https://github.com/naomi-meininger/theatermax)" };
const out = { ranAt: new Date().toISOString(), pages: [] };
for (const url of ["https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/", "https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/"]) {
  try {
    const r = await fetch(url, { headers: UA }); const html = await r.text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    const apiHints = [...new Set([...html.matchAll(/["'](https?:\/\/[^"']*(?:api|tkts|listing|json|graphql)[^"']*)["']/gi)].map((m) => m[1]))].slice(0, 60);
    const idx = Math.max(0, html.search(/Broadway|Wicked|Chicago|Off-Broadway/));
    out.pages.push({ url, status: r.status, length: html.length, scripts, apiHints,
      sample: html.slice(Math.max(0, idx - 2000), idx + 6000), dataAttrs: [...new Set([...html.matchAll(/data-[a-z-]+=/g)].map((m) => m[0]))].slice(0, 60) });
    for (const s of scripts.filter((s) => /tkts|live|app|main|bundle|chunk/i.test(s)).slice(0, 8)) {
      const u = new URL(s, url).href;
      try { const js = await (await fetch(u, { headers: UA })).text();
        out.pages.push({ url: u, length: js.length, hits: [...new Set([...js.matchAll(/["'`]([^"'`]*(?:tkts|listing|\/api\/)[^"'`]{0,120})["'`]/gi)].map((m) => m[1]))].slice(0, 80) }); } catch {}
    }
  } catch (e) { out.pages.push({ url, error: String(e) }); }
}
writeFileSync("data/tkts-probe.json", JSON.stringify(out, null, 1));
