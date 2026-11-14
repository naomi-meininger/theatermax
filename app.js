/* TheaterMax prototype
 * Plain JavaScript, no build step. Pages: #home, #show-<slug>, #lottery, #guide
 * All ticket offers are generated from data/shows.js (sample data). To go live, replace
 * buildOffers() with real listings from seller feeds/APIs.
 */
(function () {
  "use strict";

  const LIVE = window.TM_LIVE || null;
  const EXTRAS = window.TM_EXTRAS || {};
  const PLAYS = new Set(window.TM_PLAYS || []);
  const THEATERS = window.TM_THEATERS || {};
  const PREVIEWS = window.TM_PREVIEWS || {};
  const RUN_DATES = window.TM_SCHEDULE || {};

  // ---- run status: "playing" | "previews" | "upcoming" | "closed" ----
  const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  function parseDay(str) { // "YYYY", "YYYY-MM" or "YYYY-MM-DD" → { date, precision }
    if (!str) return null;
    const [y, m, d] = String(str).split("-").map(Number);
    return { date: new Date(y, (m || 1) - 1, d || 1), precision: d ? "day" : m ? "month" : "year" };
  }
  function fmtRunDate(p) {
    if (!p) return "";
    const sameYear = p.date.getFullYear() === TODAY.getFullYear();
    if (p.precision === "year") return String(p.date.getFullYear());
    if (p.precision === "month") return p.date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return p.date.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  }
  function runInfo(slug, onSale, ratingCount, scene) {
    const sc = RUN_DATES[slug];
    if (!sc) {
      // Best guess when we have no dates (shown as "estimated" in the preview):
      // not on sale → upcoming. Off-Broadway listings with tickets are almost always current runs.
      // Broadway shows often go on sale months ahead, so there we also need 10+ audience reviews.
      const status = !onSale ? "upcoming" : scene === "off" || (ratingCount || 0) >= 10 ? "playing" : "upcoming";
      return { status, guessed: true, opening: null, closing: null };
    }
    const opening = parseDay(sc.opening), closing = parseDay(sc.closing);
    let previews = parseDay(sc.previews);
    if (!previews && opening && opening.precision === "day") {
      previews = { date: new Date(opening.date.getTime() - 28 * 864e5), precision: "day", assumed: true };
    }
    let status;
    if (closing && closing.precision === "day" && closing.date < TODAY) status = "closed";
    else if (sc.nowOpen || (opening && opening.date <= TODAY && opening.precision === "day")) status = "playing";
    else if (opening && opening.precision !== "day" && opening.date <= TODAY) status = "playing";
    else if (previews && previews.date <= TODAY) status = "previews";
    else status = "upcoming";
    return { status, guessed: false, opening, closing, previews };
  }
  // ---- closing soon ----
  const CLOSING_SOON_DAYS = 30;
  function daysLeft(s) {
    if (!s.closing || s.closing.precision !== "day" || s.status === "closed") return null;
    return Math.round((s.closing.date - TODAY) / 864e5);
  }
  const isClosingSoon = (s) => { const d = daysLeft(s); return d !== null && d <= CLOSING_SOON_DAYS; };
  function closingNote(s) { // { short, long, urgent } or null
    const d = daysLeft(s);
    if (d === null || d > CLOSING_SOON_DAYS) return null;
    const day = s.closing.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (d === 0) return { short: "Final show today", long: `Last chance: today (${day}) is the final performance.`, urgent: true };
    if (d === 1) return { short: "Closes tomorrow", long: `Last chance: the final performance is tomorrow, ${day}.`, urgent: true };
    if (d <= 7) return { short: `Final week · closes ${fmtRunDate(s.closing)}`, long: `Final week: ${esc(s.title)} closes ${day}. Only ${d} days left.`, urgent: true };
    return { short: `Closing soon · ${fmtRunDate(s.closing)}`, long: `Closing soon: the final performance is ${day}, ${d} days from now.`, urgent: false };
  }
  // ---- opening night within a week ----
  const OPENING_SOON_DAYS = 7;
  function daysToOpening(s) {
    if (!s.opening || s.opening.precision !== "day") return null;
    const d = Math.round((s.opening.date - TODAY) / 864e5);
    return d >= 0 && d <= OPENING_SOON_DAYS ? d : null;
  }
  const isOpeningSoon = (s) => daysToOpening(s) !== null;
  function openingNote(s) { // { short, long, tonight } or null
    const d = daysToOpening(s);
    if (d === null) return null;
    const day = s.opening.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const wk = s.opening.date.toLocaleDateString("en-US", { weekday: "short" });
    if (d === 0) return { short: "Opening night tonight!", long: `It's opening night! ${esc(s.title)} officially opens tonight. Break a leg!`, tonight: true };
    if (d === 1) return { short: "Opens tomorrow!", long: `Opening night is tomorrow, ${day}! Catch one of the last previews or be there for the big night.` };
    return { short: `Opens ${wk} ${s.opening.date.getDate()}!`, long: `Opening night is ${day}, just ${d} days away! Previews are a great way to see it early, often for less.` };
  }
  const confetti = () => `<span class="confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</span>`;

  // Is there a performance on this date? (not before first preview, not after closing)
  function performsOn(s, date) {
    if (s.closing && s.closing.precision === "day" && date > s.closing.date) return false;
    const start = s.previews && s.previews.precision === "day" ? s.previews.date
      : s.opening && s.opening.precision === "day" ? s.opening.date : null;
    if (start && (s.status === "upcoming" || s.status === "previews") && date < start) return false;
    if (s.status === "upcoming" && !start && s.opening) return false; // opens in a later month/year
    return true;
  }

  const STATUS_LABEL = { playing: "Now playing", previews: "In previews", upcoming: "Upcoming", closed: "Closed" };
  function statusBadge(s, long) {
    const soon = s.closing && s.closing.precision === "day" && (s.closing.date - TODAY) / 864e5 <= 45;
    if (s.status === "playing") return soon && long ? `<span class="badge red">Closes ${fmtRunDate(s.closing)}</span>` : (long ? `<span class="badge green">Now playing</span>` : soon && !isClosingSoon(s) ? `<span class="badge red">Closes ${fmtRunDate(s.closing)}</span>` : "");
    if (s.status === "previews") return `<span class="badge st-previews">In previews${s.opening && (long || !isOpeningSoon(s)) ? " · opens " + fmtRunDate(s.opening) : ""}</span>`;
    if (s.status === "upcoming") return `<span class="badge st-upcoming">${s.opening ? "Opens " + fmtRunDate(s.opening) : "Upcoming"}</span>`;
    return `<span class="badge">Closed</span>`;
  }

  // A View From My Seat: real audience photos by theater & section. We link out to their pages
  // (their policy says photos may only promote A View From My Seat, so we don't copy/embed them).
  const seatViewUrl = (theater) =>
    "https://aviewfrommyseat.com/venue/" + encodeURIComponent(theater).replace(/%20/g, "+") + "/sections/";
  const PALETTES = [
    ["#1b1b1b", "#c9a227"], ["#123d2a", "#7fd36b"], ["#7a2e0e", "#f2a33a"], ["#3a1f14", "#d98f3e"],
    ["#111111", "#e23b3b"], ["#1d2d6b", "#e6b54a"], ["#0e0e0e", "#d6d6d6"], ["#5c0b1f", "#ff4f6d"],
    ["#0d2a3a", "#d4b26a"], ["#1a0f2e", "#b48cff"], ["#0f3b3a", "#9ee6d4"], ["#2b0f0f", "#f0e6d2"],
  ];

  // Build the show list from Broadway.com's live list (data/live-shows.js) + our extras.
  // Seat-level pricing is still sample data generated in buildOffers().
  const SHOWS = (LIVE ? LIVE.shows : []).map((l, i, arr) => {
    const x = EXTRAS[l.slug] || {};
    const h = hash(l.slug);
    const popularity = l.ratingCount ? Math.min(1, l.ratingCount / 1000) : 0.3;
    return {
      slug: l.slug, title: l.title, bdcUrl: l.url, bdcFrom: l.fromPrice, ratingCount: l.ratingCount,
      onSale: l.fromPrice !== null,
      theater: x.theater || THEATERS[l.slug] || null,
      type: x.type || (PREVIEWS[l.slug] || {}).type || (PLAYS.has(l.slug) ? "Play" : null),
      blurb: (PREVIEWS[l.slug] || {}).blurb || null,
      critics: (PREVIEWS[l.slug] || {}).critics || null,
      scene: l.scene || "broadway",
      ...runInfo(l.slug, l.fromPrice !== null, l.ratingCount, l.scene || "broadway"),
      // Sample-pricing inputs: box-office orchestra price roughly 1.8x the cheapest listed seat.
      basePrice: (l.fromPrice || 80) * 1.8,
      demand: Math.min(0.95, 0.25 + popularity * 0.5 + (1 - i / arr.length) * 0.15 + ((h % 100) / 100) * 0.1),
      // If Ticketmaster's API returns this show, Ticketmaster is its official seller.
      official: x.official || (Object.values((window.TM_PRICES && window.TM_PRICES.shows && window.TM_PRICES.shows[l.slug]) || {}).some((p) => p.ticketmaster) ? "Ticketmaster" : (h % 2 ? "Telecharge" : "Ticketmaster")),
      colors: PALETTES[h % PALETTES.length],
      lottery: x.lottery || null, rush: x.rush || null,
    };
  });

  // "Last updated" note. Stale = the daily scrape failed, or the list is over ~36 hours old.
  function freshness(scene) {
    if (!LIVE) return { stale: true, text: "Live show list unavailable." };
    const fmt = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const cat = scene && LIVE.categories && LIVE.categories[scene === "off" ? "off" : "broadway"];
    const info = cat && cat.updatedAt ? cat : LIVE;
    const ageH = (Date.now() - new Date(info.updatedAt)) / 36e5;
    const stale = info.status === "stale" || ageH > 36;
    const src = { updatedAt: info.updatedAt, lastAttemptAt: info.lastAttemptAt };
    return {
      stale,
      when: fmt(src.updatedAt),
      text: stale
        ? `Couldn't refresh from Broadway.com${src.lastAttemptAt ? " on " + fmt(src.lastAttemptAt) : ""}. Showing the list last updated ${fmt(src.updatedAt)}.`
        : `Show list from Broadway.com · last updated ${fmt(src.updatedAt)}`,
    };
  }
  const SOURCES = window.TM_SOURCES || [];
  const DAYS_AHEAD = 14;

  const SECTIONS = [
    { id: "orch", name: "Orchestra", mult: 1.0, rows: "ABCDEFGHJKLMNOPQRSTU" },
    { id: "mezz", name: "Mezzanine", mult: 0.78, rows: "ABCDEFGHJKL" },
    { id: "balc", name: "Balcony", mult: 0.55, rows: "ABCDEFGH" },
  ];

  const OFFICIAL_URL = {
    Telecharge: "https://www.telecharge.com",
    Ticketmaster: "https://www.ticketmaster.com",
  };

  const state = {
    dateIdx: null, perfIdx: 0, section: "all", qty: 2,
    fees: true, hideMember: false, sort: "total",
    homeQuery: "", homeSort: "price",
    f: { scene: "all", type: "all", status: "all" },
  };

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(n % 1 === 0 ? 0 : 2);
  const money0 = (n) => "$" + Math.round(n);

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) { // mulberry32
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ } },
  };

  // ---------- performances ----------
  // Typical Broadway week: dark Monday, Wed & Sat matinees, Sun matinee only.
  const SCHEDULE = {
    0: [["3:00 PM", "mat"]],
    1: [],
    2: [["7:00 PM", "eve"]],
    3: [["2:00 PM", "mat"], ["7:30 PM", "eve"]],
    4: [["7:00 PM", "eve"]],
    5: [["8:00 PM", "peak"]],
    6: [["2:00 PM", "mat"], ["8:00 PM", "peak"]],
  };
  const TIME_MULT = { mat: 0.9, eve: 0.97, peak: 1.15 };

  function getDates() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const perfs = SCHEDULE[d.getDay()].map(([time, kind]) => ({
        time, kind, mult: TIME_MULT[kind], dayOffset: i,
        key: d.toISOString().slice(0, 10) + " " + time,
      }));
      out.push({ date: d, offset: i, perfs });
    }
    return out;
  }
  const DATES = getDates();

  // ---------- live prices (data/live-prices.js, from SeatGeek + Ticketmaster) ----------
  const PRICES = window.TM_PRICES || { sources: {}, shows: {} };
  const LIVE_SOURCES = Object.entries(PRICES.sources || {}).filter(([, v]) => v.status === "ok" || v.status === "stale").map(([k]) => k);
  const hasLive = (show) => !!(PRICES.shows && PRICES.shows[show.slug] && Object.keys(PRICES.shows[show.slug]).length);
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const toMinutes = (t) => { const [hm, ap] = t.split(" "); let [h, m] = hm.split(":").map(Number); if (ap === "PM" && h !== 12) h += 12; if (ap === "AM" && h === 12) h = 0; return h * 60 + m; };
  const inLiveWindow = (d) => PRICES.window && dayKey(d) >= PRICES.window.from && dayKey(d) <= PRICES.window.to;

  // Performances for one show on one day: the REAL schedule when we have live data for it,
  // otherwise the typical Broadway week (sample).
  function perfsFor(show, dt) {
    const live = PRICES.shows && PRICES.shows[show.slug];
    if (live && inLiveWindow(dt.date)) {
      const k = dayKey(dt.date);
      return Object.keys(live).filter((key) => key.startsWith(k + " ")).map((key) => {
        const time = key.slice(11), mins = toMinutes(time), dow = dt.date.getDay();
        const kind = mins < 17 * 60 ? "mat" : (dow === 5 || dow === 6) ? "peak" : "eve";
        return { time, kind, mult: TIME_MULT[kind], dayOffset: dt.offset, key: `${k} ${time}`, live: live[key] };
      }).sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
    }
    return dt.perfs;
  }

  // ---------- offers (sample generator) ----------
  const cache = new Map();
  function buildOffers(show, perf) {
    const ck = show.slug + "|" + perf.key;
    if (cache.has(ck)) return cache.get(ck);
    const r = rng(hash(ck));
    const d = show.demand;
    const near = perf.dayOffset;
    const offers = [];
    const row = (sec) => sec.rows[Math.floor(r() * sec.rows.length)];
    const face = (sec) => Math.round(show.basePrice * sec.mult * perf.mult * (0.95 + r() * 0.1));
    const officialFee = (p) => show.official === "Telecharge" ? 14.5 : Math.round(p * 0.18 * 100) / 100;
    const faces = {};

    SECTIONS.forEach((sec) => {
      const p = face(sec); faces[sec.id] = p;
      offers.push({ seller: show.official, kind: "Official seller", sec, row: row(sec), price: p, fee: officialFee(p), url: OFFICIAL_URL[show.official], tag: "official" });
    });

    // Promo codes that work on the official seller (BroadwayBox / Playbill Offers)
    if (d < 0.75) {
      ["mezz", "balc", d < 0.5 ? "orch" : null].filter(Boolean).forEach((id) => {
        const sec = SECTIONS.find((s) => s.id === id);
        const p = Math.round(faces[id] * (1 - (0.3 + r() * 0.15)));
        offers.push({ seller: show.official + " + promo code", kind: "Discount code", sec, row: row(sec), price: p, fee: officialFee(p), url: "https://www.broadwaybox.com", note: "Code from BroadwayBox / Playbill Offers", tag: "official" });
      });
    }

    // TodayTix
    SECTIONS.filter(() => r() > 0.35).forEach((sec) => {
      const p = Math.round(faces[sec.id] * (0.8 + d * 0.18 + r() * 0.08));
      offers.push({ seller: "TodayTix", kind: "Discount app", sec, row: row(sec), price: p, fee: 12, url: "https://www.todaytix.com" });
    });

    // SeatGeek (official + verified resale)
    SECTIONS.forEach((sec) => {
      const lastMinute = near < 2 ? -0.12 : 0;
      const p = Math.round(faces[sec.id] * (0.78 + d * 0.5 + lastMinute + r() * 0.15));
      offers.push({ seller: "SeatGeek", kind: "Verified resale", sec, row: row(sec), price: p, fee: Math.round(p * 0.22 * 100) / 100, url: "https://www.seatgeek.com" });
    });

    // TKTS — same/next day, only shows that aren't selling out
    if (near <= 1 && d < 0.7) {
      [SECTIONS[0], SECTIONS[1]].forEach((sec) => {
        const p = Math.round(faces[sec.id] * (1 - (0.2 + r() * 0.3)));
        offers.push({ seller: "TKTS booth", kind: "Same-day booth", sec, row: row(sec), price: p, fee: 7, url: "https://www.tdf.org/nyc/7/TKTS-Discount-Booths", note: "In person only — Times Square or Lincoln Center", inPerson: true });
      });
    }

    // TDF — members only, shows that aren't selling out
    if (d < 0.6) {
      const sec = SECTIONS[Math.floor(r() * 2)];
      offers.push({ seller: "TDF", kind: "Membership", sec, row: row(sec), price: 49, fee: 0, url: "https://www.tdf.org", note: "TDF membership required (students, teachers, artists…)", member: true });
    }

    // Theatr — members only
    if (d < 0.75 && r() > 0.3) {
      const sec = SECTIONS[1 + Math.floor(r() * 2)];
      const p = Math.round(faces[sec.id] * (0.45 + r() * 0.1));
      offers.push({ seller: "Theatr", kind: "Membership app", sec, row: row(sec), price: p, fee: 5, url: "https://www.theatr.com", note: "Theatr membership required", member: true });
    }

    // Lottery & rush — cheap, but not guaranteed
    if (show.lottery && near <= 2) {
      offers.push({ seller: show.lottery.where + " lottery", kind: "Digital lottery", sec: null, row: null, price: show.lottery.price, fee: 0, url: "https://bwayrush.com/", note: show.lottery.when + " · max 2 tickets · not guaranteed", chance: true, max: 2 });
    }
    if (show.rush && near === 0) {
      offers.push({ seller: show.rush.where + " rush", kind: "Rush", sec: null, row: null, price: show.rush.price, fee: 0, url: "https://bwayrush.com/", note: show.rush.when + " · max 2 tickets · while they last", chance: true, max: 2 });
    }

    // ---- real prices for this performance replace that seller's sample rows ----
    const live = perf.live || (PRICES.shows && PRICES.shows[show.slug] && PRICES.shows[show.slug][perf.key]);
    let result = offers.slice(); // copy: we refill `offers` below, so it must not alias `result`
    if (live) {
      if (live.seatgeek) {
        result = result.filter((o) => o.seller !== "SeatGeek");
        const sg = live.seatgeek;
        result.push({ seller: "SeatGeek", kind: "Cheapest available seat", sec: null, row: null, price: sg.low, fee: 0, url: sg.url, live: "seatgeek",
          note: [sg.listings ? `${sg.listings} listings` : null, sg.high ? `up to ${money0(sg.high)}` : null, "price includes fees"].filter(Boolean).join(" · ") });
      }
      if (live.ticketmaster) {
        const tm = live.ticketmaster;
        if (show.official === "Ticketmaster") result = result.filter((o) => !(o.tag === "official" && o.seller.startsWith("Ticketmaster")));
        const fee = Math.round(tm.min * 0.18 * 100) / 100; // TM shows face value; fees are added at checkout
        result.push({ seller: "Ticketmaster", kind: "Face-value tickets", sec: null, row: null, price: tm.min, fee, feeEstimated: true, url: tm.url, live: "ticketmaster", tag: "official",
          note: `Face value ${money0(tm.min)}–${money0(tm.max)} · fees estimated (~18%)` });
      }
    }
    result.forEach((o) => { o.total = Math.round((o.price + o.fee) * 100) / 100; if (!o.live && !o.chance) o.sample = true; });
    offers.length = 0; offers.push(...result);
    cache.set(ck, offers);
    return offers;
  }

  // Lowest guaranteed (non-lottery) all-in price
  function lowest(offers, opts = {}) {
    let best = null;
    offers.forEach((o) => {
      if (o.chance) return;
      if (opts.noMember && o.member) return;
      if (opts.section && opts.section !== "all" && (!o.sec || o.sec.id !== opts.section)) return;
      if (!best || o.total < best.total) best = o;
    });
    return best;
  }
  function lowestForDate(show, dateObj, opts) {
    if (!performsOn(show, dateObj.date)) return null;
    let best = null;
    perfsFor(show, dateObj).forEach((p) => {
      const b = lowest(buildOffers(show, p), opts);
      if (b && (!best || b.total < best.total)) best = b;
    });
    return best;
  }
  function lowestForShow(show) {
    let best = null, bestDate = null;
    DATES.forEach((dt) => {
      const b = lowestForDate(show, dt, { noMember: true });
      if (b && (!best || b.total < best.total)) { best = b; bestDate = dt; }
    });
    return { best, bestDate };
  }
  function officialLowest(show) {
    let best = null;
    DATES.filter((dt) => performsOn(show, dt.date)).forEach((dt) => perfsFor(show, dt).forEach((p) => {
      buildOffers(show, p).forEach((o) => { if (o.kind === "Official seller" && (!best || o.total < best.total)) best = o; });
    }));
    return best;
  }

  const fmtDow = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
  const fmtLong = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const posterStyle = (s) => `background: linear-gradient(150deg, ${s.colors[0]} 0%, ${s.colors[0]} 45%, ${s.colors[1]} 160%); color: ${s.colors[1]};`;

  // ---------- views ----------
  // ---------- filters ----------
  const typeOf = (s) => s.type || "Other";
  const FILTERS = {
    scene: [["all", "All"], ["broadway", "Broadway"], ["off", "Off-Broadway"]],
    type: [["all", "All types"], ["Musical", "Musicals"], ["Play", "Plays"], ["Special", "Specials"], ["Other", "Other"]],
    status: [["all", "Any time"], ["playing", "Now playing"], ["previews", "In previews"], ["upcoming", "Upcoming"], ["opening", "🎉 Opening this week"], ["closing", "⏳ Closing soon"]],
  };
  const SCENE_HASH = { all: "#home", broadway: "#broadway", off: "#off-broadway" };
  function passes(s, f, skip) {
    if (s.status === "closed") return false;
    if (skip !== "scene" && f.scene !== "all" && (f.scene === "off") !== (s.scene === "off")) return false;
    if (skip !== "type" && f.type !== "all" && typeOf(s) !== f.type) return false;
    if (skip !== "status" && f.status === "closing" && !isClosingSoon(s)) return false;
    if (skip !== "status" && f.status === "opening" && !isOpeningSoon(s)) return false;
    if (skip !== "status" && f.status !== "all" && f.status !== "closing" && f.status !== "opening" && s.status !== f.status) return false;
    return true;
  }
  function filtersHtml() {
    const row = (key, label) => `
      <div class="filter-row" role="group" aria-label="${label}">
        <span class="filter-label">${label}</span>
        ${FILTERS[key].map(([val, text]) => {
          const n = SHOWS.filter((s) => passes(s, { ...state.f, [key]: val }, null)).length;
          if (val === "Other" && !n) return "";
          const active = state.f[key] === val;
          const attrs = key === "scene" ? `href="${SCENE_HASH[val]}"` : `href="#" data-filter="${key}:${val}"`;
          return `<a class="pill ${active ? "active" : ""} ${n ? "" : "empty-pill"}" ${attrs} aria-pressed="${active}">${text} <span class="n">${n}</span></a>`;
        }).join("")}
      </div>`;
    return row("scene", "Where") + row("type", "Type") + row("status", "When") +
      (state.f.type !== "all" || state.f.status !== "all" || state.f.scene !== "all"
        ? `<a href="#home" class="clear-filters" data-clear>Clear filters</a>` : "");
  }

  function viewHome() {
    const sc = state.f.scene, off = sc === "off";
    const LIST = SHOWS.filter((s) => passes(s, { scene: sc, type: "all", status: "all" }));
    let maxSave = 0;
    LIST.filter((s) => s.onSale).forEach((s) => {
      const lo = lowestForShow(s).best, offc = officialLowest(s);
      if (lo && offc) maxSave = Math.max(maxSave, 1 - lo.total / offc.total);
    });
    const fresh = freshness(sc === "all" ? null : sc);
    const playing = LIST.filter((s) => s.status === "playing").length;
    const where = sc === "off" ? "off-Broadway" : sc === "broadway" ? "on Broadway" : "on & off Broadway";

    return `
      <section class="hero">
        ${off ? `
        <p class="eyebrow">Smaller stages · bigger bargains</p>
        <h1>Off-<em>Broadway</em></h1>
        <p class="lede">Off-Broadway theaters seat 499 people or fewer, so you're closer to the stage and tickets usually cost less. Every show below gets the same price comparison as Broadway.</p>` : `
        <p class="eyebrow">Every seller · one search</p>
        <h1>Stop tab-hopping. <em>Get the best seat price.</em></h1>
        <p class="lede">TheaterMax compares official sellers, discount codes, apps, resale, TKTS, memberships, lotteries and rush, so you see every price, date and seat in one place, with fees included.</p>`}
        <div class="search-bar" role="search">
          <input id="q" type="search" placeholder="Search a show or theater…" value="${esc(state.homeQuery)}" aria-label="Search shows" />
          <select id="homeSort" aria-label="Sort shows">
            <option value="price" ${state.homeSort === "price" ? "selected" : ""}>Lowest price</option>
            <option value="opening" ${state.homeSort === "opening" ? "selected" : ""}>Opening soonest</option>
            <option value="az" ${state.homeSort === "az" ? "selected" : ""}>A–Z</option>
            <option value="lottery" ${state.homeSort === "lottery" ? "selected" : ""}>Has lottery / rush</option>
          </select>
        </div>
        <div class="stats">
          <div class="stat"><strong>${LIST.length}</strong><span>shows ${where}</span></div>
          <div class="stat"><strong>${playing}</strong><span>playing now</span></div>
          <div class="stat"><strong>${SOURCES.length}</strong><span>ticket sources compared</span></div>
          <div class="stat"><strong>${Math.round(maxSave * 100)}%</strong><span>top saving vs. box office</span></div>
        </div>
        <p class="updated ${fresh.stale ? "stale" : ""}">${fresh.stale ? "⚠ " : "● "}${esc(fresh.text)}</p>
      </section>
      <div class="filters" id="filters"></div>
      <div class="section-head"><h2 id="grid-title"></h2><span class="muted" id="count"></span></div>
      <div class="grid" id="grid"></div>`;
  }

  function renderGrid() {
    const q = state.homeQuery.trim().toLowerCase();
    let list = SHOWS.filter((s) => passes(s, state.f)).map((s) => ({ s, ...(s.onSale ? lowestForShow(s) : { best: null, bestDate: null }) }))
      .filter(({ s }) => !q || s.title.toLowerCase().includes(q) || (s.theater || "").toLowerCase().includes(q));
    const tot = (x) => (x.best ? x.best.total : x.s.onSale ? 1e6 + x.s.bdcFrom : Infinity);
    const openKey = (x) => (x.s.status === "playing" ? Infinity : x.s.opening ? x.s.opening.date.getTime() : 9e15);
    if (state.homeSort === "price") list.sort((a, b) => tot(a) - tot(b));
    if (state.homeSort === "opening") list.sort((a, b) => openKey(a) - openKey(b) || tot(a) - tot(b));
    if (state.f.status === "closing" && state.homeSort !== "az") list.sort((a, b) => daysLeft(a.s) - daysLeft(b.s));
    if (state.f.status === "opening" && state.homeSort !== "az") list.sort((a, b) => daysToOpening(a.s) - daysToOpening(b.s));
    if (state.homeSort === "az") list.sort((a, b) => a.s.title.localeCompare(b.s.title));
    if (state.homeSort === "lottery") list = list.filter(({ s }) => s.lottery || s.rush).sort((a, b) => Math.min(a.s.lottery?.price ?? 999, a.s.rush?.price ?? 999) - Math.min(b.s.lottery?.price ?? 999, b.s.rush?.price ?? 999));

    $("#filters").innerHTML = filtersHtml();
    const f = state.f;
    const typeWord = f.type === "all" ? "Shows" : f.type === "Other" ? "Other shows" : FILTERS.type.find((x) => x[0] === f.type)[1];
    const whenWord = { all: "", playing: " now playing", previews: " in previews", upcoming: " coming soon", closing: " closing soon", opening: " opening this week" }[f.status];
    const whereWord = { all: "", broadway: " on Broadway", off: " off-Broadway" }[f.scene];
    $("#grid-title").textContent = typeWord + whenWord + whereWord;
    $("#count").textContent = `${list.length} show${list.length === 1 ? "" : "s"}`;
    $("#grid").innerHTML = list.length ? list.map(cardHtml).join("") : `<div class="empty">No shows match${state.homeQuery ? ` “${esc(state.homeQuery)}” with` : ""} these filters. <a href="#home" data-clear>Clear filters</a></div>`;
  }

  function cardHtml({ s, best, bestDate }) {
    const href = s.onSale ? `#show-${s.slug}` : s.bdcUrl;
    best = best || null;
    const ext = s.onSale ? "" : ` target="_blank" rel="noopener"`;
    return `
      <article class="show-card ${s.onSale ? "" : "soon"}">
        <a class="card-link" href="${esc(href)}"${ext}>
          <div class="poster" style="${posterStyle(s)}">
            ${closingNote(s) ? `<div class="ribbon ${closingNote(s).urgent ? "urgent" : ""}">⏳ ${closingNote(s).short}</div>`
              : openingNote(s) ? `<div class="ribbon opening">🎉 ${openingNote(s).short}</div>` : ""}
            <div class="p-title">${esc(s.title)}</div>
            <div class="p-theater">${esc(s.theater || (s.scene === "off" ? "Off-Broadway" : "Broadway"))}</div>
          </div>
          <div class="body">
            <div class="price-line">${s.onSale && !best
              ? `<span class="from">from <strong>${money0(s.bdcFrom)}</strong> on Broadway.com</span>`
              : s.onSale
              ? `<span class="from">from <strong>${money0(best.total)}</strong> all-in</span>
                 <span class="muted" style="font-size:13px">${fmtDow(bestDate.date)} ${bestDate.date.getDate()}</span>`
              : `<span class="from">Tickets not on sale yet</span>`}</div>
            <div class="badges">
              ${statusBadge(s, false)}
              ${s.type ? `<span class="badge">${esc(s.type)}</span>` : ""}
              ${s.critics ? `<span class="badge ${s.critics.score >= 70 ? "green" : "gold"}">Critics ${s.critics.score}%</span>` : ""}
              ${s.lottery ? `<span class="badge gold">Lottery ${money0(s.lottery.price)}</span>` : ""}
              ${s.rush ? `<span class="badge green">Rush ${money0(s.rush.price)}</span>` : ""}
              ${s.onSale && s.demand > 0.85 ? `<span class="badge red">Selling fast</span>` : ""}
            </div>
          </div>
        </a>
        <div class="card-actions">
          <button class="preview-btn" data-preview="${esc(s.slug)}">Preview</button>
          <a href="${esc(href)}"${ext}>${s.onSale ? "Compare prices →" : "Broadway.com ↗"}</a>
        </div>
      </article>`;
  }

  // ---------- preview modal ----------
  function previewHtml(s) {
    const c = s.critics;
    const total = c ? c.positive + c.mixed + c.negative : 0;
    const pct = (n) => (total ? (n / total) * 100 : 0);
    return `
      <div class="modal-backdrop" data-close></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pv-title">
        <div class="modal-head" style="${posterStyle(s)}">
          <button class="modal-x" data-close aria-label="Close preview">×</button>
          <h2 id="pv-title">${esc(s.title)}</h2>
          <div class="meta">${[s.type, s.theater || (s.scene === "off" ? "Off-Broadway" : "Broadway")].filter(Boolean).map(esc).join(" · ")}</div>
          <div class="pv-status">${statusBadge(s, true)}${s.status === "playing" && s.opening && s.opening.precision === "day" ? `<span>Opened ${fmtRunDate(s.opening)}</span>` : ""}${s.closing && s.status !== "closed" ? `<span>Final show ${fmtRunDate(s.closing)}</span>` : s.status === "playing" && !s.guessed ? `<span>Open-ended run</span>` : ""}${s.guessed ? `<span title="We don't have this show's dates yet, so the status is estimated from its listing.">Status estimated</span>` : ""}</div>
        </div>
        <div class="modal-body">
          ${closingNote(s) ? `<div class="closing-note ${closingNote(s).urgent ? "urgent" : ""}">⏳ ${closingNote(s).long}</div>` : ""}
          ${openingNote(s) ? `<div class="opening-note">${confetti()}<span class="on-text">🎉 ${openingNote(s).long}</span></div>` : ""}
          ${s.blurb
            ? `<p class="pv-blurb">${esc(s.blurb)}</p>`
            : `<p class="pv-blurb muted">We haven't written a description for this show yet. <a href="${esc(s.bdcUrl)}" target="_blank" rel="noopener">Read about it on Broadway.com ↗</a></p>`}

          <div class="pv-facts">
            <div><span>Lowest listed price</span><strong>${s.bdcFrom != null ? money(s.bdcFrom) : "Not on sale"}</strong><em>Broadway.com</em></div>
            <div><span>Audience reviews</span><strong>${s.ratingCount ? s.ratingCount.toLocaleString() : "—"}</strong><em>on Broadway.com</em></div>
            <div><span>Critics</span><strong>${c ? c.score + "%" : "—"}</strong><em>${c ? "avg. rating" : "no roundup yet"}</em></div>
          </div>

          ${c ? `
          <section class="pv-critics">
            <h3>What critics said</h3>
            <div class="verdict-bar" role="img" aria-label="${c.positive} positive, ${c.mixed} mixed, ${c.negative} negative reviews">
              <span class="pos" style="width:${pct(c.positive)}%"></span><span class="mix" style="width:${pct(c.mixed)}%"></span><span class="neg" style="width:${pct(c.negative)}%"></span>
            </div>
            <div class="verdict-legend"><span><i class="pos"></i>${c.positive} positive</span><span><i class="mix"></i>${c.mixed} mixed</span><span><i class="neg"></i>${c.negative} negative</span></div>
            <p>${esc(c.consensus)}</p>
            <a href="${esc(c.url)}" target="_blank" rel="noopener">Read all ${total} reviews in the ${esc(c.source)} ↗</a>
          </section>` : ""}

          <div class="pv-links">
            ${s.ratingCount ? `<a href="${esc(s.bdcUrl)}" target="_blank" rel="noopener">Audience reviews on Broadway.com ↗</a>` : ""}
            ${s.theater ? `<a href="${esc(seatViewUrl(s.theater))}" target="_blank" rel="noopener">📷 Seat views at ${esc(s.theater)} ↗</a>` : ""}
          </div>
        </div>
        <div class="modal-foot">
          ${s.onSale ? `<a class="btn" href="#show-${esc(s.slug)}" data-close>Compare prices</a>` : `<a class="btn" href="${esc(s.bdcUrl)}" target="_blank" rel="noopener">Get notified on Broadway.com ↗</a>`}
          <button class="btn ghost" data-close>Close</button>
        </div>
      </div>`;
  }
  let lastFocus = null;
  function openPreview(slug) {
    const s = SHOWS.find((x) => x.slug === slug); if (!s) return;
    lastFocus = document.activeElement;
    const root = $("#modal-root");
    root.innerHTML = previewHtml(s); root.hidden = false;
    document.body.classList.add("modal-open");
    $(".modal-x", root).focus();
  }
  function closePreview() {
    const root = $("#modal-root"); if (root.hidden) return;
    root.hidden = true; root.innerHTML = ""; document.body.classList.remove("modal-open");
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function seatMap(offers, show) {
    const lo = {};
    SECTIONS.forEach((s) => { lo[s.id] = lowest(offers, { section: s.id, noMember: state.hideMember }); });
    const vals = Object.values(lo).filter(Boolean).map((o) => o.total);
    const min = Math.min(...vals), max = Math.max(...vals);
    const shade = (v) => {
      const t = max === min ? 0 : (v - min) / (max - min);
      const light = 82 - (1 - t) * 40; // cheaper = deeper green
      return `hsl(${145 - t * 120}, 45%, ${light}%)`;
    };
    const arcs = [
      { id: "orch", d: "M60,95 Q200,135 340,95 L340,165 Q200,215 60,165 Z", ty: 150 },
      { id: "mezz", d: "M40,180 Q200,235 360,180 L360,225 Q200,285 40,225 Z", ty: 238 },
      { id: "balc", d: "M25,240 Q200,302 375,240 L375,280 Q200,350 25,280 Z", ty: 291 },
    ];
    return `
      <svg viewBox="0 0 400 340" role="img" aria-label="Seat map${show.theater ? " of " + esc(show.theater) : ""} with lowest price per section">
        <rect x="120" y="20" width="160" height="38" rx="6" fill="#16130f"/>
        <text x="200" y="45" text-anchor="middle" fill="#f6f1e7" font-size="13" font-weight="700" letter-spacing="3">STAGE</text>
        ${arcs.map((a) => {
          const sec = SECTIONS.find((s) => s.id === a.id); const o = lo[a.id];
          const sel = state.section === a.id; const dim = state.section !== "all" && !sel;
          return `<g class="sec" data-sec="${a.id}" tabindex="0" role="button" aria-label="${sec.name}${o ? ", from " + money0(o.total) : ""}" opacity="${dim ? 0.35 : 1}">
            <path d="${a.d}" fill="${o ? shade(o.total) : "#ddd"}" stroke="${sel ? "#16130f" : "#fffdf8"}" stroke-width="${sel ? 3 : 2}"/>
            <text x="200" y="${a.ty - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#16130f">${sec.name.toUpperCase()}</text>
            <text x="200" y="${a.ty + 10}" text-anchor="middle" font-size="13" fill="#16130f">${o ? "from " + money0(o.total) : "—"}</text>
          </g>`;
        }).join("")}
      </svg>`;
  }

  function viewShow(slug) {
    const show = SHOWS.find((s) => s.slug === slug);
    if (!show) return `<a class="back" href="#home">← All shows</a><div class="empty">Show not found.</div>`;
    const backHref = SCENE_HASH[state.f.scene] || "#home";
    if (!show.onSale) return `<a class="back" href="${backHref}">← All shows</a><div class="empty"><b>${esc(show.title)}</b> doesn't have tickets on sale yet. <a href="${esc(show.bdcUrl)}" target="_blank" rel="noopener">See it on Broadway.com ↗</a></div>`;

    const playable = (d) => perfsFor(show, d).length && performsOn(show, d.date);
    const note = closingNote(show);
    const on = openingNote(show);
    const banner = note ? `<div class="closing-note big ${note.urgent ? "urgent" : ""}">⏳ ${note.long} <a href="#" data-date-first>See remaining dates ↓</a></div>`
      : on ? `<div class="opening-note big ${on.tonight ? "tonight" : ""}">${confetti()}<span class="on-text"><b>🎉 ${on.tonight ? "Opening night tonight!" : "Opening night is almost here!"}</b><br>${on.long}</span></div>` : "";
    if (!DATES.some(playable)) {
      // Only state dates we actually have: a real first-preview date, otherwise the opening date.
      const first = show.previews && show.previews.precision === "day" && !show.previews.assumed ? { label: "first performance", d: show.previews }
        : show.opening ? { label: "opening night", d: show.opening } : null;
      return `
        <a class="back" href="${backHref}">← ${{ all: "All shows", broadway: "Broadway", off: "Off-Broadway" }[state.f.scene]}</a>
        <section class="detail-hero" style="${posterStyle(show)}"><div><h1>${esc(show.title)}</h1>
          <div class="meta">${[show.theater, show.type].filter(Boolean).map(esc).join(" · ") || "Broadway"}</div></div>
          <button class="preview-btn on-dark" data-preview="${esc(show.slug)}">Preview: about the show &amp; reviews</button></section>
        <div class="empty">No performances in the next ${DAYS_AHEAD} days${first ? ` — ${first.label} is ${fmtRunDate(first.d)}` : ""}.
          Tickets are on sale now from <b>${money(show.bdcFrom)}</b>. <a href="${esc(show.bdcUrl)}" target="_blank" rel="noopener">See dates on Broadway.com ↗</a></div>`;
    }
    if (state.dateIdx === null || !playable(DATES[state.dateIdx])) {
      state.dateIdx = DATES.findIndex(playable);
      state.perfIdx = 0;
    }
    const dateObj = DATES[state.dateIdx];
    const dayPerfs = perfsFor(show, dateObj);
    if (state.perfIdx >= dayPerfs.length) state.perfIdx = 0;
    const perf = dayPerfs[state.perfIdx];
    const alerts = store.get("tm-alerts", {});
    const target = alerts[slug];

    // date strip
    const lows = DATES.map((dt) => (perfsFor(show, dt).length ? lowestForDate(show, dt, { noMember: state.hideMember, section: state.section }) : null));
    const cheapestVal = Math.min(...lows.filter(Boolean).map((o) => o.total));
    const overall = { total: cheapestVal };

    // offers
    const all = buildOffers(show, perf);
    let offers = all.filter((o) =>
      (state.section === "all" || !o.sec || o.sec.id === state.section) &&
      !(state.hideMember && o.member) &&
      !(o.max && state.qty > o.max));
    const key = state.fees ? "total" : "price";
    if (state.sort === "total") offers.sort((a, b) => a[key] - b[key]);
    if (state.sort === "section") offers.sort((a, b) => (a.sec ? SECTIONS.indexOf(a.sec) : 9) - (b.sec ? SECTIONS.indexOf(b.sec) : 9) || a[key] - b[key]);
    if (state.sort === "official") offers.sort((a, b) => (b.tag === "official") - (a.tag === "official") || a[key] - b[key]);
    const bestDeal = lowest(offers, { noMember: false });
    const officialBySec = {};
    all.forEach((o) => { if (o.kind === "Official seller") officialBySec[o.sec.id] = o; });

    const offerHtml = offers.map((o) => {
      const shown = state.fees ? o.total : o.price;
      const off = o.sec && officialBySec[o.sec.id];
      const save = off && o !== off ? off.total - o.total : 0;
      const isBest = bestDeal && o === bestDeal;
      return `
        <article class="offer ${isBest ? "best" : ""}">
          <div>
            <div class="seller">${esc(o.seller)}
              ${isBest ? `<span class="badge red">Best deal</span>` : ""}
              ${o.chance ? `<span class="badge gold">Not guaranteed</span>` : ""}
              ${o.member ? `<span class="badge">Members</span>` : ""}
              ${o.tag === "official" ? `<span class="badge green">Official</span>` : ""}
              ${o.live ? `<span class="badge live">● Live price</span>` : o.sample && hasLive(show) ? `<span class="badge sample" title="Estimated — this seller's real prices aren't connected yet">Sample</span>` : ""}
            </div>
            <div class="kind">${esc(o.kind)}</div>
            ${o.note ? `<div class="note">${esc(o.note)}</div>` : ""}
          </div>
          <div class="seat">${o.sec ? `<b>${o.sec.name}</b>Row ${o.row}` : o.live ? `<b>Any section</b>Best available` : `<b>Seat assigned</b>Any section`}
            ${o.sec && show.theater ? `<a class="seatview" href="${esc(seatViewUrl(show.theater))}" target="_blank" rel="noopener">📷 View from this section</a>` : ""}</div>
          <div class="price">
            <div class="total">${money(shown)}</div>
            <div class="breakdown">${o.live === "seatgeek" ? "all-in" : state.fees ? `${money(o.price)} + ${o.feeEstimated ? "~" : ""}${money(o.fee)} fees` : "before fees"} · each</div>
            ${save > 1 ? `<div class="save">Save ${money0(save)} vs. box office</div>` : ""}
            ${state.qty > 1 ? `<div class="breakdown">${state.qty} tickets: ${money(shown * state.qty)}</div>` : ""}
            <div class="actions"><a class="btn ${isBest ? "" : "ghost"}" href="${esc(o.url)}" target="_blank" rel="noopener">${o.chance ? "Enter" : "View"} →</a></div>
          </div>
        </article>`;
    }).join("");

    const matches = target ? lows.filter((o) => o && o.total <= target).length : 0;

    return `
      <a class="back" href="${backHref}">← ${{ all: "All shows", broadway: "Broadway", off: "Off-Broadway" }[state.f.scene]}</a>
      <section class="detail-hero" style="${posterStyle(show)}">
        <div>
          <h1>${esc(show.title)}</h1>
          <div class="meta">${[show.theater, show.type].filter(Boolean).map(esc).join(" · ") || "Broadway"}${show.ratingCount ? ` · ${show.ratingCount.toLocaleString()} Broadway.com reviews` : ""}</div>
          <div class="meta"><a href="${esc(show.bdcUrl)}" target="_blank" rel="noopener" style="color:inherit">Broadway.com lists from <b>${money(show.bdcFrom)}</b> ↗</a> <span style="opacity:.75">· real price as of ${esc(freshness(show.scene).when)}</span></div>
        </div>
        <button class="preview-btn on-dark" data-preview="${esc(show.slug)}">Preview: about the show &amp; reviews</button>
        <div class="cheapest"><span>Lowest in the next ${DAYS_AHEAD} days${state.section !== "all" ? " · " + SECTIONS.find((x) => x.id === state.section).name : ""}</span><strong>${money0(overall.total)}</strong><span>all-in</span></div>
      </section>
      ${banner}

      <section class="panel" id="dates">
        <h3>Pick a date</h3>
        <div class="date-strip">
          ${DATES.map((dt, i) => {
            const lo = lows[i];
            if (!perfsFor(show, dt).length || !performsOn(show, dt.date)) {
              const why = !perfsFor(show, dt).length ? (hasLive(show) && inLiveWindow(dt.date) ? "—" : "Dark") : show.closing && dt.date > show.closing.date ? "Closed" : "—";
              return `<button class="date-chip dark" disabled title="${why === "Closed" ? "After the final performance" : why === "Dark" ? "No show this day" : "Before the first performance"}"><div class="dow">${fmtDow(dt.date)}</div><div class="day">${dt.date.getDate()}</div><div class="lo muted">${why}</div></button>`;
            }
            const isOpening = show.opening && show.opening.precision === "day" && dt.date.getTime() === show.opening.date.getTime();
            const cls = ["date-chip", isOpening ? "opening-day" : "", i === state.dateIdx ? "active" : "", lo && lo.total === cheapestVal ? "cheapest-day" : "", target && lo && lo.total <= target ? "alert-hit" : ""].join(" ");
            return `<button class="${cls}" data-date="${i}" aria-pressed="${i === state.dateIdx}"><div class="dow">${i === 0 ? "Today" : fmtDow(dt.date)}</div><div class="day">${dt.date.getDate()}</div><div class="lo">${lo ? money0(lo.total) : "—"}</div></button>`;
          }).join("")}
        </div>
        <div class="time-row">
          ${dayPerfs.map((p, i) => `<button class="pill ${i === state.perfIdx ? "active" : ""}" data-perf="${i}">${p.time}${p.kind === "mat" ? " · Matinee" : ""}</button>`).join("")}
        </div>
      </section>

      <div class="layout">
        <aside class="sidebar">
          <div class="panel">
            <h3>Filters</h3>
            <div class="filter-group">
              <label class="lbl">Tickets</label>
              <div class="qty"><button data-qty="-1" aria-label="Fewer tickets">−</button><span>${state.qty}</span><button data-qty="1" aria-label="More tickets">+</button></div>
            </div>
            <div class="filter-group">
              <label class="lbl">Section</label>
              <div class="chip-row">
                ${[{ id: "all", name: "All" }, ...SECTIONS].map((s) => `<button class="pill ${state.section === s.id ? "active" : ""}" data-section="${s.id}">${s.name}</button>`).join("")}
              </div>
            </div>
            <div class="filter-group">
              <label class="toggle"><input type="checkbox" id="fees" ${state.fees ? "checked" : ""}/> Show prices with fees</label>
              <label class="toggle"><input type="checkbox" id="member" ${state.hideMember ? "checked" : ""}/> Hide membership-only deals</label>
            </div>
          </div>
          <div class="panel seatmap">
            <h3>Seat map${show.theater ? " · " + esc(show.theater) : ""}</h3>
            ${seatMap(all, show)}
            <div class="legend">Greener = cheaper. Tap a section to filter.</div>
            ${show.theater ? `<a class="btn ghost seatview-btn" href="${esc(seatViewUrl(show.theater))}" target="_blank" rel="noopener">📷 See real seat views ↗</a>
            <div class="legend">Audience photos from every section on A View From My Seat.</div>` : ""}
          </div>
          <div class="panel alert-box">
            <h3>Price alert</h3>
            <form id="alertForm" class="row">
              <input type="number" min="1" id="alertVal" placeholder="Max price, e.g. 80" value="${target ?? ""}" aria-label="Alert price" />
              <button class="btn" type="submit">${target ? "Update" : "Watch"}</button>
            </form>
            <div class="alert-msg">${target
              ? `Watching for ${money0(target)} or less. ${matches ? `<b>${matches} date${matches === 1 ? "" : "s"}</b> already match (gold outline).` : "No dates match yet."} <a href="#" id="clearAlert">Remove</a>`
              : "Set a price and matching dates get highlighted. (Prototype: saved in this browser only.)"}</div>
          </div>
        </aside>

        <section>
          <div class="offers-head">
            <h2>${fmtLong(dateObj.date)} · ${perf.time}</h2>
            <select id="sort" aria-label="Sort offers">
              <option value="total" ${state.sort === "total" ? "selected" : ""}>Lowest price</option>
              <option value="section" ${state.sort === "section" ? "selected" : ""}>By section</option>
              <option value="official" ${state.sort === "official" ? "selected" : ""}>Official first</option>
            </select>
          </div>
          ${hasLive(show)
            ? `<p class="live-note">● Live prices from ${LIVE_SOURCES.map((k) => ({ seatgeek: "SeatGeek", ticketmaster: "Ticketmaster" }[k])).join(" & ")} · updated ${new Date(PRICES.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Rows marked <span class="badge sample">Sample</span> are estimates.</p>`
            : `<p class="sample-note">Prices on this page are sample data for now. Live prices appear once the SeatGeek and Ticketmaster connections are switched on.</p>`}
          <p class="muted" style="margin-top:-4px">${offers.length} offers from ${new Set(offers.map((o) => o.seller)).size} sources${offers.some((o) => o.chance) ? " · lottery & rush shown but never picked as “Best deal”, since they aren't guaranteed" : ""}</p>
          ${offerHtml || `<div class="empty">No offers match these filters. Try another section or fewer tickets.</div>`}
        </section>
      </div>`;
  }

  function viewLottery() {
    const rows = SHOWS.filter((s) => s.lottery || s.rush)
      .sort((a, b) => Math.min(a.lottery?.price ?? 999, a.rush?.price ?? 999) - Math.min(b.lottery?.price ?? 999, b.rush?.price ?? 999));
    const lot = SOURCES.find((s) => s.id === "lottery");
    return `
      <section class="hero">
        <p class="eyebrow">Same-day steals</p>
        <h1>Lottery &amp; <em>Rush</em></h1>
        <p class="lede">${esc(lot.what)} Every show's policy in one table, cheapest first.</p>
        <p class="updated stale">⚠ Sample lottery &amp; rush details. Policies change often, so confirm on <a href="https://bwayrush.com/" target="_blank" rel="noopener">bwayrush.com</a>.</p>
      </section>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Show</th><th>Digital lottery</th><th>Rush</th></tr></thead>
          <tbody>
            ${rows.map((s) => `
              <tr>
                <td class="show-name"><a href="#show-${s.slug}">${esc(s.title)}</a>${s.theater ? `<div class="muted" style="font-size:13px">${esc(s.theater)}</div>` : ""}</td>
                <td>${s.lottery ? `<span class="big">${money0(s.lottery.price)}</span><div style="font-size:13px">${esc(s.lottery.where)} · ${esc(s.lottery.when)}</div>` : `<span class="muted">—</span>`}</td>
                <td>${s.rush ? `<span class="big">${money0(s.rush.price)}</span><div style="font-size:13px">${esc(s.rush.where)} · ${esc(s.rush.when)}</div>` : `<span class="muted">—</span>`}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="two-col">
        <div class="panel"><h3>How to enter</h3><ul>${lot.how.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
        <div class="panel"><h3>Tips</h3><ul>${lot.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          <p style="margin-bottom:0">${lot.links.map((l) => `<a class="btn ghost" style="margin:4px 4px 0 0" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</p></div>
      </div>`;
  }

  function viewGuide() {
    const check = (b) => (b ? "✓" : "—");
    return `
      <section class="hero">
        <p class="eyebrow">NYC discount &amp; access guide</p>
        <h1>Where the <em>cheap seats</em> hide</h1>
        <p class="lede">Every source TheaterMax checks, what it's best for, and how to get the most out of it.</p>
      </section>
      <div class="section-head"><h2>Quick comparison</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Source</th><th>Typical discount</th><th>Same day?</th><th>Online / app?</th><th>Best for</th></tr></thead>
          <tbody>${SOURCES.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.discount)}</td><td>${check(s.sameDay)}</td><td>${check(s.online)}</td><td>${esc(s.bestFor)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
      <div class="section-head"><h2>The sources</h2></div>
      <div class="guide-grid">
        ${SOURCES.map((s, i) => `
          <article class="source-card" id="src-${s.id}">
            <div class="num">${String(i + 1).padStart(2, "0")}</div>
            <h3>${esc(s.name)}</h3>
            <div class="sub">${esc(s.subtitle)}</div>
            <span class="discount">${esc(s.discount)}${s.discount.includes("%") ? " off" : ""}</span>
            <p style="margin:0;font-size:15px">${esc(s.what)}</p>
            <h4>How to use</h4>
            <ul>${s.how.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            <h4>Tips</h4>
            <ul>${s.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            ${s.links.length ? `<div class="links">${s.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>` : `<div class="muted" style="font-size:13px">Find it in the App Store.</div>`}
          </article>`).join("")}
      </div>`;
  }

  // ---------- router & events ----------
  let currentSlug = null;
  function route() {
    const h = (location.hash || "#home").slice(1);
    if (h === "home" || h === "broadway" || h === "off-broadway") state.f.scene = h === "broadway" ? "broadway" : h === "off-broadway" ? "off" : "all";
    const app = $("#app");
    let nav = "home";
    if (h.startsWith("show-")) {
      nav = { all: "home", broadway: "broadway", off: "off" }[state.f.scene]; // keep the tab you came from lit
      const slug = h.slice(5);
      if (slug !== currentSlug) { state.dateIdx = null; state.perfIdx = 0; state.section = "all"; currentSlug = slug; }
      app.innerHTML = viewShow(slug);
      document.title = (SHOWS.find((s) => s.slug === slug)?.title || "Show") + " tickets — TheaterMax";
    } else if (h === "off-broadway" || h === "broadway") {
      nav = h === "broadway" ? "broadway" : "off"; app.innerHTML = viewHome(); renderGrid();
      document.title = (h === "broadway" ? "Broadway" : "Off-Broadway") + " — TheaterMax";
    } else if (h === "lottery") {
      nav = "lottery"; app.innerHTML = viewLottery(); document.title = "Lottery & Rush — TheaterMax";
    } else if (h === "guide") {
      nav = "guide"; app.innerHTML = viewGuide(); document.title = "Discount Guide — TheaterMax";
    } else {
      app.innerHTML = viewHome(); renderGrid(); document.title = "TheaterMax — Compare theater ticket prices";
    }
    // Match on href, so the highlight works even if a cached older index.html is on screen.
    const NAV_HREF = { home: "#home", broadway: "#broadway", off: "#off-broadway", lottery: "#lottery", guide: "#guide" };
    document.querySelectorAll(".nav a").forEach((a) => {
      const on = a.getAttribute("href") === NAV_HREF[nav];
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  function rerenderShow() {
    const y = window.scrollY; $("#app").innerHTML = viewShow(currentSlug); window.scrollTo(0, y);
    const active = $(".date-chip.active"); if (active) active.parentElement.scrollLeft = active.offsetLeft - 40;
  }

  document.addEventListener("click", (e) => {
    const fl = e.target.closest("[data-filter]");
    if (fl) {
      e.preventDefault();
      const [k, v] = fl.dataset.filter.split(":"); state.f[k] = v; renderGrid(); return;
    }
    const clr = e.target.closest("[data-clear]");
    if (clr) {
      state.f.type = "all"; state.f.status = "all"; state.homeQuery = "";
      if (location.hash === "#home" || location.hash === "") { e.preventDefault(); route(); }
      return;
    }
    if (e.target.closest("[data-date-first]")) { e.preventDefault(); $("#dates")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const pv = e.target.closest("[data-preview]");
    if (pv) { e.preventDefault(); openPreview(pv.dataset.preview); return; }
    if (e.target.closest("[data-close]")) {
      const link = e.target.closest("a[data-close]");
      closePreview(); if (!link) e.preventDefault();
      return;
    }
    const t = e.target.closest("[data-date],[data-perf],[data-section],[data-qty],[data-sec],#clearAlert");
    if (!t) return;
    if (t.id === "clearAlert") {
      e.preventDefault(); const a = store.get("tm-alerts", {}); delete a[currentSlug]; store.set("tm-alerts", a);
    } else if (t.dataset.date) { state.dateIdx = +t.dataset.date; state.perfIdx = 0; }
    else if (t.dataset.perf) state.perfIdx = +t.dataset.perf;
    else if (t.dataset.section) state.section = t.dataset.section;
    else if (t.dataset.sec) state.section = state.section === t.dataset.sec ? "all" : t.dataset.sec;
    else if (t.dataset.qty) state.qty = Math.min(8, Math.max(1, state.qty + +t.dataset.qty));
    rerenderShow();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePreview();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".sec")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "fees") { state.fees = e.target.checked; rerenderShow(); }
    if (e.target.id === "member") { state.hideMember = e.target.checked; rerenderShow(); }
    if (e.target.id === "sort") { state.sort = e.target.value; rerenderShow(); }
    if (e.target.id === "homeSort") { state.homeSort = e.target.value; renderGrid(); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "q") { state.homeQuery = e.target.value; renderGrid(); }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "alertForm") return;
    e.preventDefault();
    const v = parseFloat($("#alertVal").value);
    const a = store.get("tm-alerts", {});
    if (v > 0) a[currentSlug] = v; else delete a[currentSlug];
    store.set("tm-alerts", a); rerenderShow();
  });

  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  route();
})();
