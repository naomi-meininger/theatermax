// One-off discovery run: records TodayTix MCP tools, their input schemas, and sample responses
// for one show, so the price updater can be wired to the real field names.
import { writeFileSync } from "node:fs";
import { connect, listTools, callTool, sleep } from "./todaytix-mcp.mjs";

const out = { ranAt: new Date().toISOString(), steps: [] };
const log = (step, data) => { out.steps.push({ step, data }); console.log(`== ${step}\n${JSON.stringify(data, null, 1).slice(0, 3000)}`); };
const save = () => writeFileSync("data/todaytix-probe.json", JSON.stringify(out, null, 1));
try {
  log("initialize", await connect());
  const tools = await listTools(); log("tools", tools);
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const props = (n) => Object.keys(byName[n]?.inputSchema?.properties || {});
  // Fill arguments from schema property names as best we can.
  const today = new Date(), iso = (d) => d.toISOString().slice(0, 10), plus = (n) => iso(new Date(today.getTime() + n * 864e5));
  const guess = (name, extra = {}) => {
    const a = {};
    for (const p of props(name)) {
      if (/^(query|keyword|search|q|text)$/i.test(p)) a[p] = "Wicked";
      else if (/location|city|market/i.test(p)) a[p] = (byName[name].inputSchema.properties[p].enum || ["nyc"])[0] && "nyc";
      else if (/start|from/i.test(p) && /date/i.test(p)) a[p] = plus(1);
      else if (/end|to|until/i.test(p) && /date/i.test(p)) a[p] = plus(7);
      else if (/party|quantity|qty|tickets|seats/i.test(p) && byName[name].inputSchema.properties[p].type !== "string") a[p] = 2;
    }
    return { ...a, ...extra };
  };
  const tryCall = async (name, args) => {
    if (!byName[name]) return null;
    try { const r = await callTool(name, args); log(`${name} ${JSON.stringify(args)}`, r); return r; }
    catch (e) { log(`${name} ERROR ${JSON.stringify(args)}`, String(e.message)); return null; }
  };
  const search = (await tryCall("search_shows", guess("search_shows"))) || (await tryCall("list_shows", guess("list_shows")));
  save();
  // Find a show id anywhere in the response.
  const findId = (o) => { if (!o || typeof o !== "object") return null; for (const [k, v] of Object.entries(o)) { if (/^(show_?id|id)$/i.test(k) && (typeof v === "number" || typeof v === "string")) return v; const r = findId(v); if (r != null) return r; } return null; };
  const showId = findId(search);
  log("showId", showId);
  if (showId != null) {
    const idKey = (n) => props(n).find((p) => /show/i.test(p) && /id/i.test(p)) || props(n).find((p) => /id$/i.test(p)) || "showId";
    await sleep(800);
    const perfs = await tryCall("list_performances", guess("list_performances", { [idKey("list_performances")]: showId }));
    await sleep(800);
    await tryCall("compare_prices", guess("compare_prices", { [idKey("compare_prices")]: showId }));
    await sleep(800);
    await tryCall("find_seats", guess("find_seats", { [idKey("find_seats")]: showId }));
    const perfId = findId(Array.isArray(perfs) ? perfs[0] : perfs && (perfs.performances || perfs.items || [])[0]);
    if (perfId != null) {
      await sleep(800);
      const pk = props("get_seat_prices").find((p) => /perf/i.test(p)) || "performanceId";
      await tryCall("get_seat_prices", guess("get_seat_prices", { [pk]: perfId, [idKey("get_seat_prices")]: showId }));
    }
  }
} catch (e) { log("FATAL", String(e.stack || e)); }
save();
