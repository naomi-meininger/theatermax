// Minimal client for TodayTix's official MCP server (https://www.todaytix.com/mcp).
// TodayTix's terms forbid scraping; this server is their supported programmatic interface
// (see https://www.todaytix.com/llms.txt). Read-only, polite: small batches, backs off on 429/403.
const ENDPOINT = "https://www.todaytix.com/mcp";
const UA = "TheaterMax/1.0 (+https://naomi-meininger.github.io/theatermax/; price comparison)";
let session = null, nextId = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params, { notify = false } = {}) {
  const body = { jsonrpc: "2.0", method, ...(params ? { params } : {}), ...(notify ? {} : { id: nextId++ }) };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "User-Agent": UA,
        "MCP-Protocol-Version": "2025-06-18", ...(session ? { "Mcp-Session-Id": session } : {}) },
      body: JSON.stringify(body),
    });
    if (res.headers.get("mcp-session-id")) session = res.headers.get("mcp-session-id");
    if (res.status === 429 || res.status === 503) { await sleep(5000 * (attempt + 1)); continue; }
    if (res.status === 403) throw new Error(`TodayTix denied access (403) — backing off`);
    if (notify) return null;
    if (!res.ok) throw new Error(`${method}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const text = await res.text();
    // Streamable HTTP may answer as SSE ("data: {...}") or plain JSON.
    const json = (res.headers.get("content-type") || "").includes("event-stream")
      ? text.split("\n").filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5))).find((m) => m.id === body.id)
      : JSON.parse(text);
    if (!json) throw new Error(`${method}: no response`);
    if (json.error) throw new Error(`${method}: ${json.error.message || JSON.stringify(json.error)}`);
    return json.result;
  }
  throw new Error(`${method}: throttled, giving up`);
}

export async function connect() {
  const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "theatermax", version: "1.0" } });
  await rpc("notifications/initialized", null, { notify: true });
  return init;
}
export const listTools = async () => (await rpc("tools/list", {})).tools || [];

// Call a tool; returns structuredContent if present, else parsed JSON text content, else raw text.
export async function callTool(name, args) {
  const r = await rpc("tools/call", { name, arguments: args });
  if (r.isError) throw new Error(`${name}: ${(r.content || []).map((c) => c.text).join(" ").slice(0, 300)}`);
  if (r.structuredContent) return r.structuredContent;
  const text = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  try { return JSON.parse(text); } catch { return text; }
}
export { sleep };
