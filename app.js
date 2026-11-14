/* TheaterMax prototype
 * Plain JavaScript, no build step. Pages: #home, #show-<slug>, #lottery, #guide
 * All ticket offers are generated from data/shows.js (sample data). To go live, replace
 * buildOffers() with real listings from seller feeds/APIs.
 */
(function () {
  "use strict";

  const SHOWS = window.TM_SHOWS || [];
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

    offers.forEach((o) => { o.total = Math.round((o.price + o.fee) * 100) / 100; });
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
    let best = null;
    dateObj.perfs.forEach((p) => {
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
    DATES.forEach((dt) => dt.perfs.forEach((p) => {
      buildOffers(show, p).forEach((o) => { if (o.kind === "Official seller" && (!best || o.total < best.total)) best = o; });
    }));
    return best;
  }

  const fmtDow = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
  const fmtLong = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const posterStyle = (s) => `background: linear-gradient(150deg, ${s.colors[0]} 0%, ${s.colors[0]} 45%, ${s.colors[1]} 160%); color: ${s.colors[1]};`;

  // ---------- views ----------
  function viewHome() {
    let maxSave = 0;
    SHOWS.forEach((s) => {
      const lo = lowestForShow(s).best, off = officialLowest(s);
      if (lo && off) maxSave = Math.max(maxSave, 1 - lo.total / off.total);
    });
    const lotteryCount = SHOWS.filter((s) => s.lottery || s.rush).length;

    return `
      <section class="hero">
        <p class="eyebrow">Every seller · one search</p>
        <h1>Stop tab-hopping. <em>Get the best seat price.</em></h1>
        <p class="lede">TheaterMax compares official sellers, discount codes, apps, resale, TKTS, memberships, lotteries and rush, so you see every price, date and seat in one place, with fees included.</p>
        <div class="search-bar" role="search">
          <input id="q" type="search" placeholder="Search a show or theater…" value="${esc(state.homeQuery)}" aria-label="Search shows" />
          <select id="homeSort" aria-label="Sort shows">
            <option value="price" ${state.homeSort === "price" ? "selected" : ""}>Lowest price</option>
            <option value="az" ${state.homeSort === "az" ? "selected" : ""}>A–Z</option>
            <option value="lottery" ${state.homeSort === "lottery" ? "selected" : ""}>Has lottery / rush</option>
          </select>
        </div>
        <div class="stats">
          <div class="stat"><strong>${SHOWS.length}</strong><span>shows tracked</span></div>
          <div class="stat"><strong>${SOURCES.length}</strong><span>ticket sources compared</span></div>
          <div class="stat"><strong>${Math.round(maxSave * 100)}%</strong><span>top saving vs. box office</span></div>
          <div class="stat"><strong>${lotteryCount}</strong><span>shows with lottery or rush</span></div>
        </div>
      </section>
      <div class="section-head"><h2>Now playing</h2><span class="muted" id="count"></span></div>
      <div class="grid" id="grid"></div>`;
  }

  function renderGrid() {
    const q = state.homeQuery.trim().toLowerCase();
    let list = SHOWS.map((s) => ({ s, ...lowestForShow(s) }))
      .filter(({ s }) => !q || s.title.toLowerCase().includes(q) || s.theater.toLowerCase().includes(q));
    if (state.homeSort === "price") list.sort((a, b) => a.best.total - b.best.total);
    if (state.homeSort === "az") list.sort((a, b) => a.s.title.localeCompare(b.s.title));
    if (state.homeSort === "lottery") list = list.filter(({ s }) => s.lottery || s.rush).sort((a, b) => Math.min(a.s.lottery?.price ?? 999, a.s.rush?.price ?? 999) - Math.min(b.s.lottery?.price ?? 999, b.s.rush?.price ?? 999));

    $("#count").textContent = `${list.length} show${list.length === 1 ? "" : "s"}`;
    $("#grid").innerHTML = list.length ? list.map(({ s, best, bestDate }) => `
      <a class="show-card" href="#show-${s.slug}">
        <div class="poster" style="${posterStyle(s)}">
          <div class="p-title">${esc(s.title)}</div>
          <div class="p-theater">${esc(s.theater)}</div>
        </div>
        <div class="body">
          <div class="price-line">
            <span class="from">from <strong>${money0(best.total)}</strong> all-in</span>
            <span class="muted" style="font-size:13px">${fmtDow(bestDate.date)} ${bestDate.date.getDate()}</span>
          </div>
          <div class="badges">
            <span class="badge">${esc(s.type)}</span>
            ${s.lottery ? `<span class="badge gold">Lottery ${money0(s.lottery.price)}</span>` : ""}
            ${s.rush ? `<span class="badge green">Rush ${money0(s.rush.price)}</span>` : ""}
            ${s.demand > 0.85 ? `<span class="badge red">Selling fast</span>` : ""}
          </div>
        </div>
      </a>`).join("") : `<div class="empty">No shows match “${esc(state.homeQuery)}”.</div>`;
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
      <svg viewBox="0 0 400 340" role="img" aria-label="Seat map of ${esc(show.theater)} with lowest price per section">
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

    if (state.dateIdx === null || !DATES[state.dateIdx].perfs.length) {
      state.dateIdx = DATES.findIndex((d) => d.perfs.length);
      state.perfIdx = 0;
    }
    const dateObj = DATES[state.dateIdx];
    if (state.perfIdx >= dateObj.perfs.length) state.perfIdx = 0;
    const perf = dateObj.perfs[state.perfIdx];
    const alerts = store.get("tm-alerts", {});
    const target = alerts[slug];

    // date strip
    const lows = DATES.map((dt) => (dt.perfs.length ? lowestForDate(show, dt, { noMember: state.hideMember, section: state.section }) : null));
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
            </div>
            <div class="kind">${esc(o.kind)}</div>
            ${o.note ? `<div class="note">${esc(o.note)}</div>` : ""}
          </div>
          <div class="seat">${o.sec ? `<b>${o.sec.name}</b>Row ${o.row}` : `<b>Seat assigned</b>Any section`}</div>
          <div class="price">
            <div class="total">${money(shown)}</div>
            <div class="breakdown">${state.fees ? `${money(o.price)} + ${money(o.fee)} fees` : "before fees"} · each</div>
            ${save > 1 ? `<div class="save">Save ${money0(save)} vs. box office</div>` : ""}
            ${state.qty > 1 ? `<div class="breakdown">${state.qty} tickets: ${money(shown * state.qty)}</div>` : ""}
            <div class="actions"><a class="btn ${isBest ? "" : "ghost"}" href="${esc(o.url)}" target="_blank" rel="noopener">${o.chance ? "Enter" : "View"} →</a></div>
          </div>
        </article>`;
    }).join("");

    const matches = target ? lows.filter((o) => o && o.total <= target).length : 0;

    return `
      <a class="back" href="#home">← All shows</a>
      <section class="detail-hero" style="${posterStyle(show)}">
        <div>
          <h1>${esc(show.title)}</h1>
          <div class="meta">${esc(show.theater)} · ${esc(show.type)} · ${esc(show.runtime)} · Sold by ${esc(show.official)}</div>
        </div>
        <div class="cheapest"><span>Lowest in the next ${DAYS_AHEAD} days${state.section !== "all" ? " · " + SECTIONS.find((x) => x.id === state.section).name : ""}</span><strong>${money0(overall.total)}</strong><span>all-in</span></div>
      </section>

      <section class="panel">
        <h3>Pick a date</h3>
        <div class="date-strip">
          ${DATES.map((dt, i) => {
            const lo = lows[i];
            if (!dt.perfs.length) return `<button class="date-chip dark" disabled><div class="dow">${fmtDow(dt.date)}</div><div class="day">${dt.date.getDate()}</div><div class="lo muted">Dark</div></button>`;
            const cls = ["date-chip", i === state.dateIdx ? "active" : "", lo && lo.total === cheapestVal ? "cheapest-day" : "", target && lo && lo.total <= target ? "alert-hit" : ""].join(" ");
            return `<button class="${cls}" data-date="${i}" aria-pressed="${i === state.dateIdx}"><div class="dow">${i === 0 ? "Today" : fmtDow(dt.date)}</div><div class="day">${dt.date.getDate()}</div><div class="lo">${lo ? money0(lo.total) : "—"}</div></button>`;
          }).join("")}
        </div>
        <div class="time-row">
          ${dateObj.perfs.map((p, i) => `<button class="pill ${i === state.perfIdx ? "active" : ""}" data-perf="${i}">${p.time}${p.kind === "mat" ? " · Matinee" : ""}</button>`).join("")}
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
            <h3>Seat map · ${esc(show.theater)}</h3>
            ${seatMap(all, show)}
            <div class="legend">Greener = cheaper. Tap a section to filter.</div>
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
      </section>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Show</th><th>Digital lottery</th><th>Rush</th></tr></thead>
          <tbody>
            ${rows.map((s) => `
              <tr>
                <td class="show-name"><a href="#show-${s.slug}">${esc(s.title)}</a><div class="muted" style="font-size:13px">${esc(s.theater)}</div></td>
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
    const app = $("#app");
    let nav = "home";
    if (h.startsWith("show-")) {
      const slug = h.slice(5);
      if (slug !== currentSlug) { state.dateIdx = null; state.perfIdx = 0; state.section = "all"; currentSlug = slug; }
      app.innerHTML = viewShow(slug);
      document.title = (SHOWS.find((s) => s.slug === slug)?.title || "Show") + " tickets — TheaterMax";
    } else if (h === "lottery") {
      nav = "lottery"; app.innerHTML = viewLottery(); document.title = "Lottery & Rush — TheaterMax";
    } else if (h === "guide") {
      nav = "guide"; app.innerHTML = viewGuide(); document.title = "Discount Guide — TheaterMax";
    } else {
      app.innerHTML = viewHome(); renderGrid(); document.title = "TheaterMax — Compare theater ticket prices";
    }
    document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
  }
  function rerenderShow() {
    const y = window.scrollY; $("#app").innerHTML = viewShow(currentSlug); window.scrollTo(0, y);
    const active = $(".date-chip.active"); if (active) active.parentElement.scrollLeft = active.offsetLeft - 40;
  }

  document.addEventListener("click", (e) => {
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
