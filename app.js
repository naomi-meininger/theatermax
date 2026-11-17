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
  const TDF = (window.TM_TDF && window.TM_TDF.shows) || {};
  // TKTS Live boards (TDF, hourly in booth hours): which of our shows are on today's board.
  const TKTS_LIVE = window.TM_TKTS || { boards: [] };
  const tktsNorm = (t) => String(t || "").toLowerCase().replace(/:\s*(a new musical|the musical|a musical|the play).*$/, "").replace(/&/g, "and").replace(/\bny\b/g, "new york").replace(/[^a-z0-9]+/g, " ").replace(/^the /, "").trim();
  const nyToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  function tktsBoardsFor(show) {
    const tdfPath = window.TM_TDF && window.TM_TDF.ids && window.TM_TDF.ids[show.slug];
    const id = tdfPath && (tdfPath.match(/\/shows\/(\d+)\//) || [])[1];
    const key = tktsNorm(show.title);
    return (TKTS_LIVE.boards || []).filter((b) => b.shows.some((x) => (id && x.tdfId === id) || tktsNorm(x.title) === key));
  }
  const recentTkts = (show) => Object.values(TKTS_LIVE.recent || {}).find((x) => tktsMatch(show, x)) || null;
  const tktsMatch = (show, x) => {
    const tdfPath = window.TM_TDF && window.TM_TDF.ids && window.TM_TDF.ids[show.slug];
    const id = tdfPath && (tdfPath.match(/\/shows\/(\d+)\//) || [])[1];
    return (id && x.tdfId === id) || tktsNorm(x.title) === tktsNorm(show.title);
  };
  const BOOTH = { "times-square": "Times Square", "lincoln-center": "Lincoln Center" };

  // TodayTix: real prices (fees included, 2 seats together) from TodayTix's official MCP server, daily.
  const TT = window.TM_TODAYTIX || { shows: {} };
  // TodayTix prices are fetched for parties of 1, 2 and 4 seats together. Use the party size
  // chosen on the page (3 uses the 4-seat price; more than 4 has no TodayTix price).
  const ttQty = () => (state.qty <= 2 ? state.qty : state.qty <= 4 ? 4 : null);
  const ttFor = (show, perf) => {
    const t = TT.shows && TT.shows[show.slug], q = ttQty();
    if (!t || !q) return null;
    const perfs = t.byQty ? t.byQty[q] : (q === 2 ? t.perfs : null);
    return perfs && perfs[perf.key] ? { ...perfs[perf.key], showUrl: t.url, qty: q } : null;
  };
  const hasTT = (show) => !!(TT.shows && TT.shows[show.slug]);
  // Show images: each show's own share image (og:image), hotlinked from its page.
  const IMAGES = Object.fromEntries(Object.entries((window.TM_SCHEDULES && window.TM_SCHEDULES.images) || {}).filter(([, u]) => !/\/fallback\//.test(u)));
  const dollars = (str) => (String(str || "").match(/\d[\d,]*(?:\.\d+)?/g) || []).map((x) => +x.replace(/,/g, ""));
  // TKTS + TDF links for a show, using what TDF's own show page says (weekly) when we have it.
  function tdfLinks(show) {
    const t = TDF[show.slug], a = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${label} ↗</a>`;
    const TKTS = "https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/";
    if (!t) return a(TKTS, "TKTS Live (same-day booth)") + " · " + a("https://www.tdf.org/on-stage/show-finder/", "TDF member tickets");
    const tkts = t.tkts && t.tkts !== "N/a" ? ` (TDF says: ${esc(t.tkts.toLowerCase())} listed)` : "";
    const member = t.memberAvailable ? `TDF member tickets${t.memberPrice ? " " + esc(t.memberPrice) : ""}` : "TDF page (no member tickets right now)";
    return a(TKTS, "TKTS Live" + tkts) + " · " + a(t.url, member);
  }
  // understudies.org show pages (confirmed paths); otherwise jump to its top search result.
  const UNDERSTUDIES = { "wicked": "wicked-nyc", "the-lion-king": "the-lion-king-nyc", "aladdin-broadway": "aladdin" };
  const understudyUrl = (s) => UNDERSTUDIES[s.slug] ? "https://understudies.org/show/" + UNDERSTUDIES[s.slug]
    : "https://www.google.com/search?btnI=1&q=" + encodeURIComponent("site:understudies.org/show " + s.title.replace(/\s*\((Encores!)\)/, ""));
  const SHOWSCORE = window.TM_SHOWSCORE || {};
  // Show-Score page for a show: a confirmed URL, or DuckDuckGo's "jump to first result" on show-score.com.
  const showScoreUrl = (s) => SHOWSCORE[s.slug]
    ? "https://www.show-score.com" + SHOWSCORE[s.slug]
    : "https://www.google.com/search?btnI=1&q=" + encodeURIComponent("site:show-score.com " + s.title.replace(/\s*\((Encores!)\)/, ""));
  const RUSH = window.TM_RUSH || null; // weekly from bwayrush.com (data/rush.js)
  const cheapest = (deals, type) => deals.filter((d) => d.type === type && d.price != null).sort((a, b) => a.price - b.price)[0] || null;
  const RUN_DATES = window.TM_SCHEDULE || {};

  // ---- run status: "playing" | "previews" | "upcoming" | "closed" ----
  const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  function parseDay(str) { // "YYYY", "YYYY-MM" or "YYYY-MM-DD" → { date, precision }
    if (!str) return null;
    const [y, m, d] = String(str).split("-").map(Number);
    return { date: new Date(y, (m || 1) - 1, d || 1), precision: d ? "day" : m ? "month" : "year" };
  }
  // "Tue, Nov 17"
  const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  function fmtRunDate(p) {
    if (!p) return "";
    const sameYear = p.date.getFullYear() === TODAY.getFullYear();
    if (p.precision === "year") return String(p.date.getFullYear());
    if (p.precision === "month") return p.date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return p.date.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  }
  function runInfo(slug, onSale, ratingCount, scene) {
    // Dates entered by hand win; otherwise Broadway.com's "Show Dates" (daily), then TDF's (weekly).
    const auto = (window.TM_SCHEDULES && window.TM_SCHEDULES.runs || {})[slug]
      || (() => { const t = ((window.TM_TDF || {}).shows || {})[slug]; return t && (t.opening || t.previews) ? { previews: t.previews, opening: t.opening, closing: t.closing } : null; })();
    const sc = RUN_DATES[slug] || (auto && Object.fromEntries(Object.entries(auto).filter(([, v]) => v)));
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
    const wk = fmtDay(s.opening.date);
    if (d === 0) return { short: "Opening night tonight!", long: `It's opening night! ${esc(s.title)} officially opens tonight. Break a leg!`, tonight: true };
    if (d === 1) return { short: "Opens tomorrow!", long: `Opening night is tomorrow, ${day}! Catch one of the last previews or be there for the big night.` };
    return { short: `Opens ${wk}!`, long: `Opening night is ${day}, just ${d} days away! Previews are a great way to see it early, often for less.` };
  }
  // ---- first preview within a week (only real, announced first-preview dates) ----
  // No previews when the "first preview" is opening night itself (common for opera, ballet, Encores!).
  const noPreviews = (s) => !!(s.previews && s.opening && s.opening.precision === "day" && dayKey(s.previews.date) === dayKey(s.opening.date));
  function daysToPreview(s) {
    if (!s.previews || s.previews.assumed || s.previews.precision !== "day" || noPreviews(s)) return null;
    const d = Math.round((s.previews.date - TODAY) / 864e5);
    return d >= 0 && d <= 7 ? d : null;
  }
  function previewNote(s) {
    const d = daysToPreview(s);
    if (d === null) return null;
    return { short: d === 0 ? "First preview tonight!" : `First preview ${fmtDay(s.previews.date)}!`,
      long: d === 0 ? `Tonight is the very first preview of ${esc(s.title)}!` : `The first preview is ${fmtDay(s.previews.date)}, ${d === 1 ? "tomorrow" : `in ${d} days`}. Be in the first audience ever to see it.` };
  }
  // Short run-date notes for anything happening within a month: first preview, opening, closing.
  function runNotes(s) {
    const out = [], within = (dt) => { const d = Math.round((dt - TODAY) / 864e5); return d >= 0 && d <= 31; };
    if (s.previews && !s.previews.assumed && !noPreviews(s) && s.previews.precision === "day" && within(s.previews.date)) out.push(`🎭 First preview ${fmtDay(s.previews.date)}`);
    if (s.opening && s.opening.precision === "day" && within(s.opening.date)) out.push(`🎉 Opens ${fmtDay(s.opening.date)}`);
    if (s.closing && s.closing.precision === "day" && within(s.closing.date)) out.push(`⏳ Closes ${fmtDay(s.closing.date)}`);
    // Not started yet and more than a month out: still say so, with the dates we know.
    if (!out.length && s.status === "upcoming") {
      const start = s.previews && !s.previews.assumed ? s.previews : s.opening;
      const limited = s.closing && start && +start.date === +(s.opening && s.opening.date) ? `–${fmtRunDate(s.closing)}` : "";
      out.push(start ? `🗓 Upcoming · ${s.previews && !s.previews.assumed && s.opening && s.previews.date < s.opening.date ? "previews from" : "plays"} ${fmtRunDate(start)}${limited}` : "🗓 Upcoming · dates TBA");
    }
    return out;
  }
  // "First preview Nov 16 · Opening Nov 30 · Closing Dec 30" for a show's page.
  function runLine(s) {
    const part = [];
    if (s.previews && !s.previews.assumed && !(s.opening && +s.previews.date === +s.opening.date)) part.push(`${s.previews.date <= TODAY ? "Previews began" : "First preview"} ${fmtRunDate(s.previews)}`);
    if (s.opening) part.push(`${s.status === "playing" || s.opening.date <= TODAY ? "Opened" : "Opening"} ${fmtRunDate(s.opening)}`);
    if (s.closing) part.push(`${s.status === "closed" ? "Closed" : "Closing"} ${fmtRunDate(s.closing)}`);
    else if (s.status === "playing" && !s.guessed) part.push("Open-ended run");
    return part.join(" · ");
  }
  // ---- long-running: open 5+ years ----
  const isLongRunning = (s) => s.status === "playing" && !!s.opening && s.opening.precision === "day"
    && (TODAY - s.opening.date) / (365.25 * 864e5) >= 5;
  const yearsRunning = (s) => Math.floor((TODAY - s.opening.date) / (365.25 * 864e5));

  // ---- recently announced: news in the last 45 days (data/announced.js), or first seen on
  //      Broadway.com's list in the last 30 days (daily scraper). Returns the date or null.
  const ANNOUNCED = window.TM_ANNOUNCED || {};
  function announcedOn(s) {
    if (s.status === "closed" || s.status === "playing") return null;
    const a = ANNOUNCED[s.slug], days = (iso) => (TODAY - new Date(iso + "T00:00:00")) / 864e5;
    if (a && days(a.announced) <= 45) return { date: a.announced, note: a.note, source: a.source };
    if (s.firstSeen && days(s.firstSeen) <= 30) return { date: s.firstSeen, note: null, source: null, listed: true };
    return null;
  }

  // Tonight's board: the cheapest real price for tonight's performances, like a TKTS board.
  function tonightBoard(inScene) {
    const today = (window.__TM_DATES_ALL || [])[0];
    if (!today) return "";
    const n = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })), nowMin = n.getHours() * 60 + n.getMinutes();
    const rows = SHOWS.filter((s) => s.onSale && inScene(s) && perfsFor(s, today).some((p) => toMinutes(p.time) > nowMin)).map((s) => {
      const best = lowestForDate(s, today, { noMember: true });
      return best ? { s, best } : null;
    }).filter(Boolean).sort((a, b) => a.best.total - b.best.total).slice(0, 8);
    if (!rows.length) return "";
    return `<aside class="tonight" aria-label="Cheapest seats tonight">
      <div class="tonight-head"><b>Tonight</b><span>${today.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span></div>
      <ol>${rows.map(({ s, best }) => `<li><a href="#show-${esc(s.slug)}"><span class="t-title">${esc(s.title)}</span><span class="t-src">${esc(best.seller)}</span><span class="t-price">${money0(best.total)}</span></a></li>`).join("")}</ol>
      <p>Lowest real price per ticket, fees in, for tonight's shows.</p>
    </aside>`;
  }

  // "📣 Recently announced" strip on the home / Broadway / Off-Broadway pages.
  function announcedStrip(inScene) {
    const list = SHOWS.filter((s) => inScene(s) && announcedOn(s))
      .sort((a, b) => announcedOn(b).date.localeCompare(announcedOn(a).date)).slice(0, 8);
    if (!list.length) return "";
    const fmtA = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `<section class="announced" aria-labelledby="ann-h">
      <div class="announced-head"><h2 id="ann-h">📣 Recently announced</h2><button class="linkish" data-quickstatus="new">See all →</button></div>
      <div class="announced-row">${list.map((s) => {
        const a = announcedOn(s);
        const when = s.previews && !s.previews.assumed ? `Previews ${fmtRunDate(s.previews)}` : s.opening ? `Opens ${fmtRunDate(s.opening)}` : "Dates TBA";
        return `<a class="ann-card" href="#show-${s.slug}">
          <span class="ann-when">${a.listed ? "New listing" : "Announced"} ${fmtA(a.date)}</span>
          <strong>${esc(s.title)}</strong>
          <span class="muted">${esc([s.theater, sceneLabel(s)].filter(Boolean).join(" · "))}</span>
          <span class="ann-run">${when}</span></a>`;
      }).join("")}</div></section>`;
  }

  // ---- big anniversaries (every 5 years since opening night) ----
  // "Turns 30 on Sat, Nov 14" for the 30 days before; "Celebrating 30 years" for the year after.
  function anniversaryNote(s) {
    if (!s.opening || s.opening.precision !== "day" || s.status !== "playing") return null;
    const o = s.opening.date, label = sceneKey(s) === "broadway" ? " on Broadway" : "";
    let years = TODAY.getFullYear() - o.getFullYear();
    let next = new Date(TODAY.getFullYear(), o.getMonth(), o.getDate());
    if (next < TODAY) { next = new Date(TODAY.getFullYear() + 1, o.getMonth(), o.getDate()); years += 1; }
    const daysTo = Math.round((next - TODAY) / 864e5), done = years - 1;   // `years` = the one coming up
    if (years >= 5 && years % 5 === 0 && daysTo <= 30) {
      const today = daysTo === 0;
      return { years, date: next, soon: true, today, short: today ? `${years} years today!` : `Turns ${years} ${fmtDay(next)}`,
        long: today ? `Happy ${years}th anniversary! Opened${label} ${fmtRunDate(s.opening)}.` : `Celebrates ${years} years${label} on ${fmtDay(next)} (opened ${fmtRunDate(s.opening)}).` };
    }
    if (done >= 5 && done % 5 === 0) return { years: done, short: `Celebrating ${done} years`, long: `Celebrating ${done} years${label}: opened ${fmtRunDate(s.opening)}.` };
    return null;
  }
  // "This week" banner: first previews, opening nights and final performances in the next 7 days.
  function thisWeekBanner(filter = () => true) {
    const items = [];
    SHOWS.filter((s) => s.status !== "closed" && filter(s)).forEach((s) => {
      if (daysToPreview(s) !== null) items.push({ d: s.previews.date, html: `🎭 <b>First preview</b> <a href="#show-${s.slug}">${esc(s.title)}</a> · ${fmtDay(s.previews.date)}` });
      if (daysToOpening(s) !== null) items.push({ d: s.opening.date, html: `🎉 <b>Opening night</b> <a href="#show-${s.slug}">${esc(s.title)}</a> · ${fmtDay(s.opening.date)}` });
      const left = daysLeft(s);
      const ann = anniversaryNote(s);
      if (ann && ann.soon && ann.date - TODAY <= 7 * 864e5) items.push({ d: ann.date, html: `🎂 <b>${ann.years} years</b> <a href="#show-${s.slug}">${esc(s.title)}</a> · ${ann.today ? "today!" : fmtDay(ann.date)}` });
      if (left !== null && left <= 7) items.push({ d: s.closing.date, html: `⏳ <b>Final performance</b> <a href="#show-${s.slug}">${esc(s.title)}</a> · ${fmtDay(s.closing.date)}` });
    });
    if (!items.length) return "";
    items.sort((a, b) => a.d - b.d);
    return `<section class="week-banner" aria-label="This week">${confetti()}<div class="wb-inner"><span class="wb-title">This week</span><ul>${items.map((i) => `<li>${i.html}</li>`).join("")}</ul></div></section>`;
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
  const AVFMS = "https://aviewfrommyseat.com/venue/";
  const plus = (t) => encodeURIComponent(t).replace(/%20/g, "+").replace(/%2C/gi, ",");
  const SEATVIEWS = window.TM_SEATVIEWS || {};
  const avfmsName = (theater) => (SEATVIEWS[theater] && SEATVIEWS[theater].venue) || theater;
  const seatViewUrl = (theater) => AVFMS + plus(avfmsName(theater)) + "/sections/";
  // Link for one of our sections (orch / mezz / balc). Goes to the real A View From My Seat
  // section page when we've mapped that theater; otherwise to the theater overview, labeled as such.
  // Level page, e.g. /venue/Shubert+Theatre/level/2/Mezzanine/ (photos from the whole level).
  function sectionView(theater, secId) {
    const map = SEATVIEWS[theater];
    if (secId === "box") return map && map.box
      ? { url: `${AVFMS}${plus(avfmsName(theater))}/${plus(map.box)}/`, label: "📷 Views from the boxes", name: "Box", exact: true }
      : { url: seatViewUrl(theater), label: "📷 Seat views at this theater", exact: false };
    const lvl = map && (secId === "rmezz" ? map.rmezz || map.balc : map[secId]);
    return lvl
      ? { url: `${AVFMS}${plus(avfmsName(theater))}/level/${lvl[0]}/${plus(lvl[1])}/`, label: `📷 Views from the ${lvl[1]}`, name: lvl[1], exact: true }
      : { url: seatViewUrl(theater), label: "📷 Seat views at this theater", exact: false };
  }
  const PALETTES = [
    ["#1b1b1b", "#c9a227"], ["#123d2a", "#7fd36b"], ["#7a2e0e", "#f2a33a"], ["#3a1f14", "#d98f3e"],
    ["#111111", "#e23b3b"], ["#1d2d6b", "#e6b54a"], ["#0e0e0e", "#d6d6d6"], ["#5c0b1f", "#ff4f6d"],
    ["#0d2a3a", "#d4b26a"], ["#1a0f2e", "#b48cff"], ["#0f3b3a", "#9ee6d4"], ["#2b0f0f", "#f0e6d2"],
  ];

  // Build the show list from Broadway.com's live list (data/live-shows.js) + our extras.
  // Seat-level pricing is still sample data generated in buildOffers().
  const EXTRA_SHOWS = (window.TM_EXTRA_SHOWS || []).map((x) => ({ ...x, url: x.tickets, fromPrice: null, ratingCount: null, manual: true }));
  const PROGRAMS = window.TM_PROGRAMS || [];
  // Program deals (LincTix, Hiptix, Access Club…) attached to the shows they currently cover.
  const programDeals = (slug) => PROGRAMS.filter((p) => (p.slugs || []).includes(slug)).flatMap((p) => p.deals.map((d) => ({
    label: `${d.price} ${d.name}`, url: p.url, type: /student/i.test(d.name) ? "student" : "young", platform: p.company,
    price: /^\$[\d.]+$/.test(d.price) ? parseFloat(d.price.slice(1)) : null, program: true })));
  // Undo any HTML entities left in scraped titles (e.g. "It&#x27;s" → "It's").
  const unent = (t) => typeof t === "string" ? t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'") : t;
  // Who sells a theater's tickets first-hand. Shubert houses → Telecharge; Nederlander → Broadway Direct;
  // Jujamcyn (now ATG) → SeatGeek; ATG's Hudson & Lyric → ATG Tickets; Disney's New Amsterdam → Ticketmaster;
  // nonprofits sell through their own box office.
  const OFFICIAL_BY_THEATER = {
    Telecharge: ["Ambassador", "Ethel Barrymore", "Belasco", "Booth", "Broadhurst", "Broadway Theatre", "John Golden", "Imperial", "Bernard B. Jacobs",
      "Longacre", "Lyceum", "Majestic", "Music Box", "Gerald Schoenfeld", "Shubert Theatre", "Winter Garden", "James Earl Jones", "Circle in the Square",
      "New World Stages", "Stage 42"],
    "Broadway Direct": ["Lena Horne", "Gershwin", "Lunt-Fontanne", "Marquis", "Minskoff", "Nederlander Theatre", "Neil Simon", "Palace", "Richard Rodgers", "Stephen Sondheim"],
    "SeatGeek (official)": ["Al Hirschfeld", "August Wilson", "Eugene O'Neill", "St. James", "Walter Kerr"],
    "ATG Tickets": ["Hudson Theatre", "Lyric Theatre"],
    Ticketmaster: ["New Amsterdam"],
    Roundabout: ["American Airlines", "Studio 54", "Todd Haimes"],
    "Lincoln Center Theater": ["Vivian Beaumont", "Mitzi E. Newhouse", "Claire Tow"],
    "Manhattan Theatre Club": ["Samuel J. Friedman", "New York City Center Stage"],
    "Second Stage": ["Hayes Theater", "Tony Kiser"],
    "New York City Center": ["New York City Center"],
    "The Met": ["Metropolitan Opera House"],
    "NYC Ballet": ["David H. Koch"],
  };
  // Shows sold by their producing company rather than the theater's usual seller.
  const OFFICIAL_BY_SHOW = { "the-visitors": "Second Stage" };
  const INFO_THEATER = (slug) => (((window.TM_SCHEDULES && window.TM_SCHEDULES.info) || {})[slug] || {}).theater || null;
  function officialFor(theater) {
    if (!theater) return "Box office";
    for (const [seller, list] of Object.entries(OFFICIAL_BY_THEATER)) if (list.some((n) => theater.startsWith(n))) return seller;
    return "Box office";
  }
  const SHOWS = [...(LIVE ? LIVE.shows : []).filter((l) => !/^(find-by-date|tickets|calendar|gift-cards?)$/.test(l.slug))
    .map((l) => ({ ...l, title: String(l.title).replace(/\s+from\s+\$[\d,.]+\s*$/i, "") }))
    .filter((l, i, arr) => { const off = arr.findIndex((x) => x.slug === l.slug && x.scene === "off"); return i === (off >= 0 ? off : arr.findIndex((x) => x.slug === l.slug)); }), ...EXTRA_SHOWS].map((l) => ({ ...l, title: unent(l.title) })).map((l, i, arr) => {
    const x = EXTRAS[l.slug] || {};
    const h = hash(l.slug);
    const popularity = l.ratingCount ? Math.min(1, l.ratingCount / 1000) : 0.3;
    return {
      slug: l.slug, title: l.title, bdcUrl: l.url, bdcFrom: l.fromPrice, ratingCount: l.ratingCount,
      onSale: l.fromPrice !== null,
      theater: x.theater || THEATERS[l.slug] || l.theater || INFO_THEATER(l.slug) || null,
      type: x.type || (PREVIEWS[l.slug] || {}).type || l.type || (PLAYS.has(l.slug) ? "Play" : null),
      blurb: (PREVIEWS[l.slug] || {}).blurb || l.blurb || null,
      critics: (PREVIEWS[l.slug] || {}).critics || null,
      reddit: (PREVIEWS[l.slug] || {}).reddit || null,
      scene: l.scene || "broadway",
      firstSeen: l.firstSeen || null,
      // (manual shows like City Center sell tickets on their own site)
      ...runInfo(l.slug, l.fromPrice !== null, l.ratingCount, l.scene || "broadway"),
      // Sample-pricing inputs: box-office orchestra price roughly 1.8x the cheapest listed seat.
      basePrice: (l.fromPrice || 80) * 1.8,
      demand: Math.min(0.95, 0.25 + popularity * 0.5 + (1 - i / arr.length) * 0.15 + ((h % 100) / 100) * 0.1),
      // Official (primary) seller is set by who runs the theater — see OFFICIAL_BY_THEATER.
      official: x.official || OFFICIAL_BY_SHOW[l.slug] || officialFor(x.theater || THEATERS[l.slug] || l.theater || INFO_THEATER(l.slug)),
      colors: PALETTES[h % PALETTES.length],
      // Real deals from bwayrush when we have them; the old sample values only if that file is missing.
      deals: [...(RUSH ? ((RUSH.shows[l.slug] || {}).deals || []) : []),
        ...programDeals(l.slug).filter((d) => !((RUSH && RUSH.shows[l.slug]) || { deals: [] }).deals.some((x) => x.label.toLowerCase().includes(d.label.split(" ").slice(1).join(" ").toLowerCase())))],
      tickets: l.tickets || null, manual: !!l.manual,
      lottery: RUSH ? cheapest((RUSH.shows[l.slug] || {}).deals || [], "lottery") : x.lottery || null,
      rush: RUSH ? cheapest((RUSH.shows[l.slug] || {}).deals || [], "rush") : x.rush || null,
    };
  });

  // "Last updated" note. Stale = the daily scrape failed, or the list is over ~36 hours old.
  function freshness(scene) {
    if (!LIVE) return { stale: true, text: "Live show list unavailable." };
    const fmt = fmtNY;
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
  // Box seats: only for theaters that have boxes (mapped in data/seatviews.js). Often a partial
  // view, so usually priced between orchestra and mezzanine.
  const BOX_SECTION = { id: "box", name: "Box", mult: 0.72, rows: "ABCD" };
  const STAGE_SECTION = { id: "stage", name: "Stage seating", mult: 1.1, rows: "ABC" };
  // Two-level theaters split the mezzanine into front and rear instead of having a balcony.
  const RMEZZ_SECTION = { id: "rmezz", name: "Rear Mezzanine", mult: 0.6, rows: "FGHJKLMN" };
  const FMEZZ = { ...SECTIONS[1], name: "Front Mezzanine", rows: "ABCDE" };
  const ALL_SECTIONS = [SECTIONS[0], SECTIONS[1], RMEZZ_SECTION, SECTIONS[2], BOX_SECTION, STAGE_SECTION];
  const withFrontMezz = (list) => list.some((x) => x.id === "rmezz") ? list.map((x) => (x.id === "mezz" ? FMEZZ : x)) : list;
  // Shows with seating a ticket site doesn't list (reported by people who've been).
  // Seating a ticket site doesn't list separately (reported by people who've been).
  // Each entry: section ids, plus optional per-show names and seat-view links.
  const SPECIAL_SEATING = {
    "slam-frank": ["orch", "stage"],
    "just-in-time": ["orch", "stage"],
  };
  const SPECIAL_NAMES = {
    "just-in-time": { stage: { name: "Table seating (onstage)", view: "https://aviewfrommyseat.com/venue/Circle+in+the+Square+Theatre/level/2/Just+In+Time+Table+Seating/" } },
  };
  // Sections a show really sells: Broadway.com's per-performance "Pricing by Section" and
  // TodayTix's section prices, combined. Falls back to the theater's levels.
  const seenSections = (show) => {
    const ids = new Set(SPECIAL_SEATING[show.slug] || []);
    const cal = (window.TM_SCHEDULES && window.TM_SCHEDULES.shows || {})[show.slug];
    if (cal) for (const ps of Object.values(cal.days || {})) for (const p of ps) Object.keys(p.secs || {}).forEach((k) => ids.add(k));
    const tt = (window.TM_TODAYTIX && window.TM_TODAYTIX.shows || {})[show.slug];
    if (tt) for (const p of Object.values(tt.perfs || {})) Object.keys(p.secs || {}).forEach((k) => ids.add(k));
    return ids;
  };
  const SECTION_CACHE = new Map();
  const sectionsFor = (show) => {
    if (!show) return SECTIONS;
    if (SECTION_CACHE.has(show.slug)) return SECTION_CACHE.get(show.slug);
    const seen = seenSections(show);
    const named = SPECIAL_NAMES[show.slug] || {};
    const res = withFrontMezz(seen.size ? ALL_SECTIONS.filter((x) => seen.has(x.id)) : sectionsByTheater(show))
      .map((x) => (named[x.id] ? { ...x, name: named[x.id].name, view: named[x.id].view } : x));
    SECTION_CACHE.set(show.slug, res);
    return res;
  };
  // Seating order: orchestra up, then special seating (boxes, stage/table seats) last.
  const SEC_ORDER = ["orch", "mezz", "rmezz", "balc", "box", "stage"];
  const secRank = (show, sec) => { const i = SEC_ORDER.indexOf(sec && sec.id); return i < 0 ? 99 : i; };
  const sectionsByTheater = (show) => {
    const map = show && show.theater && (window.TM_SEATVIEWS || {})[show.theater];
    // Off-Broadway houses without a mapped seating chart are almost all one level.
    if (!map) return show && show.scene === "off" ? SECTIONS.slice(0, 1) : SECTIONS;
    // Two-level theaters (no separate balcony): rear mezzanine instead of a balcony.
    if (!map.mezz) return [SECTIONS[0], ...(map.box ? [BOX_SECTION] : [])];
    const twoLevel = map.balc && map.mezz && map.balc[0] === map.mezz[0];
    return [...(twoLevel ? [SECTIONS[0], SECTIONS[1], RMEZZ_SECTION] : SECTIONS), ...(map.box ? [BOX_SECTION] : [])];
  };

  // Know before you go: running time, address, age guidance and advisories (from the show's
  // Broadway.com page, daily), plus the official seller's page for box office hours & accessibility.
  function infoLine(show) {
    const inf = ((window.TM_SCHEDULES && window.TM_SCHEDULES.info) || {})[show.slug] || {};
    const bits = [
      inf.runtime ? `⏱ ${esc(inf.runtime)}` : null,
      inf.address ? `📍 <a href="https://www.google.com/maps/search/${encodeURIComponent((show.theater ? show.theater + ", " : "") + inf.address + ", New York, NY")}" target="_blank" rel="noopener">${esc(inf.address)}</a>` : null,
      inf.age ? `👪 ${esc(inf.age)}` : null,
      inf.advisories ? `⚠️ ${esc(inf.advisories.join(", "))}` : null,
    ].filter(Boolean);
    const off = show.official && show.official !== "Box office" ? `<a href="${esc(showLink(show.official, show))}" target="_blank" rel="noopener">Box office hours &amp; accessibility on ${esc(show.official)} ↗</a>` : null;
    if (!bits.length && !off) return "";
    return `<div class="meta know-line">${[...bits, off].filter(Boolean).join(" · ")}</div>`;
  }

  // Critic score: Broadway Scorecard's official badge (their terms allow one show's badge per
  // page, loaded live from their site, with the "CriticScore™ by Broadway Scorecard" credit).
  const BSC_SLUGS = { "two-strangers-carry-a-cake-across-new-york": "two-strangers" };
  const bscSlug = (s) => BSC_SLUGS[s.slug] || s.slug.replace(/-broadway$/, "");
  const bscUrl = (s) => `https://broadwayscorecard.com/show/${bscSlug(s)}`;

  // Critics' review roundup (BroadwayWorld publishes one for most openings).
  const roundupUrl = (s) => "https://www.google.com/search?btnI=1&q=" + encodeURIComponent(`site:broadwayworld.com "Review Roundup" ${s.title}`);

  // Link straight to the show on each seller's site: a known show URL when we have one
  // (TodayTix ids from its official feed), otherwise DuckDuckGo's "jump to first result" on that site.
  const SELLER_SITE = { TodayTix: "todaytix.com/nyc/shows", SeatGeek: "seatgeek.com", "SeatGeek (official)": "seatgeek.com", Telecharge: "telecharge.com",
    "Broadway Direct": "broadwaydirect.com/show", "ATG Tickets": "atgtickets.com", Ticketmaster: "ticketmaster.com", Roundabout: "roundabouttheatre.org",
    "Lincoln Center Theater": "lct.org", "Manhattan Theatre Club": "manhattantheatreclub.com", "Second Stage": "2st.com", "New York City Center": "nycitycenter.org",
    "The Met": "metopera.org", "NYC Ballet": "nycballet.com" };
  function showLink(seller, show) {
    const tt = window.TM_TODAYTIX && window.TM_TODAYTIX.ids && window.TM_TODAYTIX.ids[show.slug];
    if (seller === "TodayTix" && tt && tt.url) return tt.url;
    const name = show.title.replace(/\s*\((The Met|Encores!|NYCB)\)\s*/g, " ").trim();
    if (seller === "Box office") return show.tickets || "https://www.google.com/search?btnI=1&q=" + encodeURIComponent("" + name + " official tickets");
    if (show.tickets && /^(The Met|NYC Ballet|New York City Center)$/.test(seller)) return show.tickets;
    // Telecharge show pages: telecharge.com/<Title-With-Dashes>-Tickets
    if (seller === "Telecharge") return "https://www.telecharge.com/" + name.replace(/:\s.*$/, "").replace(/[()’'".,!?:]/g, "").replace(/&/g, "and").trim().replace(/\s+/g, "-") + "-Tickets";
    if (seller === "SeatGeek" || seller === "SeatGeek (official)") return "https://seatgeek.com/search?search=" + encodeURIComponent(name.replace(/:\s.*$/, ""));
    // Broadway Direct show pages use the same name slug as Broadway.com (broadwaydirect.com/show/wicked/).
    if (seller === "Broadway Direct" && show.bdcUrl && /broadway\.com\/shows\//.test(show.bdcUrl)) return "https://broadwaydirect.com/show/" + show.slug.replace(/-broadway$/, "") + "/";
    const site = SELLER_SITE[seller];
    return site ? "https://www.google.com/search?btnI=1&q=" + encodeURIComponent(`site:${site} ${name}`) : OFFICIAL_URL[seller] || "#";
  }
  const OFFICIAL_URL = {
    Telecharge: "https://www.telecharge.com",
    "Broadway Direct": "https://broadwaydirect.com",
    "SeatGeek (official)": "https://seatgeek.com/broadway",
    "ATG Tickets": "https://www.atgtickets.com/broadway/",
    Ticketmaster: "https://www.ticketmaster.com",
    "Roundabout": "https://www.roundabouttheatre.org",
    "Lincoln Center Theater": "https://www.lct.org",
    "Manhattan Theatre Club": "https://www.manhattantheatreclub.com",
    "Second Stage": "https://2st.com",
    "New York City Center": "https://www.nycitycenter.org",
    "The Met": "https://www.metopera.org/season/tickets/",
    "NYC Ballet": "https://www.nycballet.com",
    "Box office": "https://www.broadway.com",
  };

  const state = {
    dateIdx: null, perfIdx: 0, section: "all", qty: 2,
    fees: true, hideMember: false, sort: "total",
    homeQuery: "", homeSort: "price", group: "all",
    f: { scene: "all", type: "all", status: "all" },
  };

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(n % 1 === 0 ? 0 : 2);
  const money0 = (n) => "$" + Math.round(n);
  // Timestamps in New York time with the zone label, e.g. "Nov 13, 10:58 PM EST" (EDT in summer).
  const fmtNY = (iso) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

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

  function getDates(start) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const from = start && start > today ? start : today, skip = Math.round((from - today) / 864e5);
    const out = [];
    for (let j = 0; j < DAYS_AHEAD; j++) {
      const i = skip + j;
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
  window.__TM_DATES_ALL = DATES;
  // A show that hasn't started yet but already sells tickets: compare prices for its first
  // two weeks of performances instead of the next two weeks (when it isn't playing).
  const DATES_CACHE = {};
  function datesFor(show) {
    if (DATES_CACHE[show.slug]) return DATES_CACHE[show.slug];
    let out = DATES;
    const playsSoon = DATES.some((dt) => performsOn(show, dt.date) && perfsFor(show, dt).length);
    if (!playsSoon && show.onSale) {
      const cal = CALENDARS[show.slug];
      const day = (p) => p && p.precision === "day" && !p.assumed ? p.date : null;
      const first = cal ? new Date(cal.from + "T00:00:00") : day(show.previews) || day(show.opening);
      if (first && first > TODAY) out = getDates(first);
    }
    return (DATES_CACHE[show.slug] = out);
  }
  const datesShifted = (show) => datesFor(show) !== DATES;
  const CALENDARS = (window.TM_SCHEDULES && window.TM_SCHEDULES.shows) || {};
  const hasCalendar = (show) => !!CALENDARS[show.slug];

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
    // Real calendar from Broadway.com (daily): exact dates & curtain times, holiday weeks included.
    const cal = CALENDARS[show.slug], k = dayKey(dt.date);
    // Between today and the calendar's first date there are no performances (the calendar only
    // starts at the next one), so those days are dark rather than guessed from a standard week.
    if (cal && k <= cal.to && (k >= cal.from || k >= dayKey(TODAY))) {
      return (cal.days[k] || []).map(({ t, from, secs, ev }) => {
        const mins = toMinutes(t), dow = dt.date.getDay();
        const kind = mins < 17 * 60 ? "mat" : (dow === 5 || dow === 6) ? "peak" : "eve";
        return { time: t, kind, mult: TIME_MULT[kind], dayOffset: dt.offset, key: `${k} ${t}`, calFrom: from, calSecs: secs || null, calEv: ev || null, special: keyDateLabel(show, dt.date) };
      }).concat(!(cal.days[k] || []).length && keyDateLabel(show, dt.date)
        ? [{ time: "7:00 PM", kind: "eve", mult: TIME_MULT.eve, dayOffset: dt.offset, key: k + " 7:00 PM", special: keyDateLabel(show, dt.date), approx: true }] : []);
    }
    // Opening night / first preview / final show always happens, even on a usually-dark day.
    const special = keyDateLabel(show, dt.date);
    if (special && !dt.perfs.length) {
      return [{ time: "7:00 PM", kind: "eve", mult: TIME_MULT.eve, dayOffset: dt.offset, key: dt.date.toISOString().slice(0, 10) + " 7:00 PM", special, approx: true }];
    }
    return special ? dt.perfs.map((p) => ({ ...p, special })) : dt.perfs;
  }
  function keyDateLabel(show, date) {
    const same = (p) => p && p.precision === "day" && !p.assumed && dayKey(p.date) === dayKey(date);
    return same(show.opening) ? "Opening night" : same(show.previews) ? "First preview" : same(show.closing) ? "Final show" : null;
  }

  // ---------- verified discount codes (data/codes.js) ----------
  const CODES = window.TM_CODES || {};
  const validCodes = (show) => (CODES[show.slug] || []).filter((c) => { const e = parseDay(c.expires); return e && e.date >= TODAY; });

  // ---------- seller groups (tabs on the show page) ----------
  const GROUPS = [
    ["all", "All"], ["official", "Official sellers"], ["codes", "Discount codes"], ["apps", "Discount apps"], ["sites", "Ticket sites"],
    ["resale", "Resale"], ["sameday", "Same-day & lottery"], ["members", "Memberships"],
  ];
  function groupOf(o) {
    if (o.code) return "codes";
    if (o.seller === "TDF") return "members";
    if (o.boxOffice) return "official";
    if (o.chance || o.inPerson) return "sameday";
    if (o.member) return "members";
    if (o.seller === "SeatGeek") return "resale";
    if (o.seller === "TodayTix" || o.seller === "Theatr") return "apps";
    if (o.seller === "Broadway.com") return "sites";
    if (o.tag === "official") return "official";
    return "resale";
  }

  // ---------- offers (sample generator) ----------
  const cache = new Map();
  function buildOffers(show, perf) {
    const ck = show.slug + "|" + perf.key + "|" + ttQty();
    if (cache.has(ck)) return cache.get(ck);
    const r = rng(hash(ck));
    const d = show.demand;
    const near = perf.dayOffset;
    const offers = [];
    const row = (sec) => sec.rows[Math.floor(r() * sec.rows.length)];
    const face = (sec) => Math.round(show.basePrice * sec.mult * perf.mult * (0.95 + r() * 0.1));
    const officialFee = (p) => show.official === "Telecharge" ? 14.5 : Math.round(p * 0.18 * 100) / 100;
    const faces = {};

    sectionsFor(show).forEach((sec) => {
      const p = face(sec); faces[sec.id] = p;
      offers.push({ seller: show.official === "Box office" ? (show.theater ? `${show.theater} (official)` : "Theater's official site") : show.official, kind: "Official · online, plus fees", sec, row: row(sec), price: p, fee: officialFee(p), url: showLink(show.official, show), tag: "official", officialRow: true });
    });

    // Discount codes: only VERIFIED codes from data/codes.js (never invented). Expired ones are skipped.
    // With per-section prices (`sections` in data/codes.js) a code becomes one offer per section,
    // so it lines up against every other seller in that section. Without them it stays one
    // "section not listed" offer, and it's never counted as the cheapest in any one section.
    // The code is redeemed at the show's official seller (Playbill/BroadwayBox only publish it),
    // so the row is that seller, and the View link goes there.
    const codeSeller = show.official === "Box office" ? (show.theater ? `${show.theater} box office` : "Theater box office") : show.official;
    validCodes(show).forEach((c) => {
      const secs = sectionsFor(show);
      const valid = `valid through ${fmtRunDate(parseDay(c.expires))}`;
      const perSec = (c.sections || []).map((x) => ({ ...x, sec: secs.find((y) => y.id === x.sec) })).filter((x) => x.sec);
      if (perSec.length) {
        perSec.forEach((x) => offers.push({ seller: codeSeller, kind: `Discount code from ${c.source}`, sec: x.sec, row: null, price: x.from,
          fee: c.feesIncl ? 0 : officialFee(x.from), feeEstimated: !c.feesIncl, url: showLink(show.official, show), code: c, tag: "official", verified: true,
          note: [x.to ? `${money0(x.from)}–${money0(x.to)}` : null, x.regular ? `regularly ${x.regular}` : null, valid, c.details || null].filter(Boolean).join(" · ") }));
        return;
      }
      offers.push({ seller: codeSeller, kind: `Discount code from ${c.source}`, sec: null, row: null, price: c.from, fee: c.feesIncl ? 0 : officialFee(c.from), feeEstimated: !c.feesIncl,
        url: showLink(show.official, show), code: c, tag: "official", verified: true, secUnknown: true,
        note: [c.to ? `${money0(c.from)}–${money0(c.to)} across the house` : null, c.regular ? `regularly ${c.regular}` : null, valid, "the offer doesn't say which sections get which price", c.details || null].filter(Boolean).join(" · ") });
    });

    // TodayTix
    sectionsFor(show).filter(() => r() > 0.35).forEach((sec) => {
      const p = Math.round(faces[sec.id] * (0.8 + d * 0.18 + r() * 0.08));
      offers.push({ seller: "TodayTix", kind: "Discount app", sec, row: row(sec), price: p, fee: 12, url: showLink("TodayTix", show) });
    });

    // SeatGeek (official + verified resale)
    sectionsFor(show).forEach((sec) => {
      const lastMinute = near < 2 ? -0.12 : 0;
      const p = Math.round(faces[sec.id] * (0.78 + d * 0.5 + lastMinute + r() * 0.15));
      offers.push({ seller: "SeatGeek", kind: "Verified resale", sec, row: row(sec), price: p, fee: Math.round(p * 0.22 * 100) / 100, url: showLink("SeatGeek", show) });
    });

    // (No TKTS / TDF / Theatr rows: their availability isn't public per show, so we link to them
    //  in "Also check" instead of inventing prices.)

    // Lottery & rush — cheap, but not guaranteed
    if (show.lottery && near <= 2) {
      const d = show.lottery;
      offers.push({ seller: `${d.platform || "Digital"} lottery`, kind: `${d.channel || "Digital"} lottery`, sec: null, row: null, price: d.price, fee: 0, url: d.url || "https://bwayrush.com/",
        note: `Enter on ${d.platform && d.platform !== "Show website" ? d.platform : "the show's site"}, usually 1–2 days before · winners drawn at random`, chance: true, max: 2 });
    }
    if (show.rush && near === 0) {
      const d = show.rush;
      offers.push({ seller: `${d.channel || ""} rush`.trim().replace(/^./, (c) => c.toUpperCase()), kind: d.platform ? `Rush · ${d.platform}` : "Rush", sec: null, row: null, price: d.price, fee: 0, url: d.url || "https://bwayrush.com/",
        note: (d.channel === "In-person" ? "Buy at the box office when it opens, usually 10 AM (12 PM Sun)" : d.channel === "Mobile" ? "Buy in the TodayTix app on the day" : `Buy online${d.platform && d.platform !== "Show website" ? " on " + d.platform : ""} on the day`) + " · first come, first served", chance: true, max: 2 });
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
        result.push({ seller: "Ticketmaster", kind: show.official === "Ticketmaster" ? "Face-value tickets" : "Ticketmaster listing", sec: null, row: null, price: tm.min, fee, feeEstimated: true, url: tm.url, live: "ticketmaster", ...(show.official === "Ticketmaster" ? { tag: "official", officialRow: true } : {}),
          note: `Face value ${money0(tm.min)}–${money0(tm.max)} · fees estimated (~18%)` });
      }
    }
    // Broadway.com: its own lowest price for this exact performance, from its daily calendar (real).
    const bdcEvent = perf.calEv ? "https://www.broadway.com" + perf.calEv : (show.bdcUrl || "https://www.broadway.com/").replace(/\/?$/, "/") + "schedule/";
    const bdcSecs = perf.calSecs ? Object.entries(perf.calSecs).map(([id, v]) => [sectionsFor(show).find((x) => x.id === id), v]).filter(([sec]) => sec) : [];
    if (bdcSecs.length) {
      bdcSecs.forEach(([sec, v]) => result.push({ seller: "Broadway.com", kind: "Ticket site", sec, row: null, price: v.lo, fee: 0, live: "broadwaycom", url: bdcEvent,
        note: `Broadway.com's ${sec.name.toLowerCase()} prices for this performance: ${money0(v.lo)}–${money0(v.hi)} (its "Pricing by Section", this morning)` }));
    } else if (perf.calFrom) {
      result.push({ seller: "Broadway.com", kind: "Ticket site · cheapest seat", sec: null, row: null, price: perf.calFrom, fee: 0, live: "broadwaycom", url: bdcEvent,
        note: "Broadway.com's lowest listed price for this performance, as of this morning · section shown at checkout" });
    }
    // TodayTix real prices replace the TodayTix sample rows: one row per section, fees included.
    const tt = ttFor(show, perf);
    const inTTWindow = TT.window && perf.key.slice(0, 10) >= TT.window.from && perf.key.slice(0, 10) <= TT.window.to;
    if (tt || (hasTT(show) && inTTWindow)) result = result.filter((o) => o.seller !== "TodayTix");
    if (tt) {
      const secs = sectionsFor(show);
      const rows = Object.entries(tt.secs || {}).map(([id, p]) => [secs.find((x) => x.id === id), p]).filter(([sec]) => sec);
      const url = (sec) => (tt.best && tt.best.url && tt.best.sec === sec.id ? tt.best.url : tt.showUrl) || "https://www.todaytix.com/nyc";
      (rows.length ? rows : [[null, tt.low]]).forEach(([sec, p]) => result.push({ seller: "TodayTix", kind: tt.deal ? "Discount app · sale on" : "Discount app",
        sec, row: sec && tt.best && tt.best.sec === sec.id ? tt.best.row : null, price: p, fee: 0, url: sec ? url(sec) : tt.showUrl, live: "todaytix",
        note: `Cheapest ${tt.qty === 1 ? "single seat" : tt.qty + " seats together"}${sec ? " in this section" : ""}${state.qty === 3 ? " (TodayTix price for 4; 3 is usually the same or less)" : ""} · fees included${tt.high ? ` · prices up to ${money0(tt.high)}` : ""}` }));
    }
    // TDF member tickets: TDF's public pages give the member price range ($11–$60) but only members
    // can see which shows have tickets on a given night, so this is "if offered", never "Best deal".
    const tdf = TDF[show.slug];
    if (tdf) {
      const exact = tdf.memberAvailable && dollars(tdf.memberPrice).length ? dollars(tdf.memberPrice)[0] : null;
      result.push({ seller: "TDF", kind: exact ? "Member tickets" : "Member tickets · if offered", sec: null, row: null, price: exact || 60, fee: 0, url: tdf.url,
        member: true, chance: !exact, estimate: !exact,
        note: exact ? `TDF lists member tickets at ${tdf.memberPrice} · membership required`
          : "TDF members pay $11–$60 when a show offers member tickets (members-only listings, so not guaranteed) · membership required; students, teachers, artists, retirees and others qualify" });
    }
    // TKTS: on today's board (TKTS Live) → a real same-day option; otherwise, if TDF says it's
    // often there or it was on a recent board, an "often at TKTS" possibility like lottery/rush.
    // TKTS doesn't post prices online, so the price is an estimate (~40% off) and never "Best deal".
    const boards = tktsBoardsFor(show);
    const freq = tdf && tdf.tkts && /frequently|sometimes|occasionally/i.test(tdf.tkts) ? tdf.tkts.toLowerCase() : null;
    const box = result.find((o) => o.officialRow && o.sec && o.sec.id === "orch") || result.find((o) => o.officialRow);
    const TKTS_URL = "https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/";
    // A board updated today lists today's performances (and "tomorrow" boards, tomorrow's matinees)
    // with % off, the price range and the curtain time. Match it to this exact performance.
    const today = nyToday(), tomorrow = new Date(Date.parse(today + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
    const perfDay = perf.key.slice(0, 10), perfTime = perf.key.slice(11);
    const listings = boards.filter((b) => b.day === today && b.status === "open")
      .flatMap((b) => b.shows.filter((x) => tktsMatch(show, x) && x.lo != null && (!x.time || x.time === perfTime)
        && perfDay === (/^tomorrow/.test(b.kind) ? tomorrow : today)).map((x) => ({ ...x, booth: BOOTH[b.booth] || b.booth, updated: b.updated })));
    if (listings.length) {
      const best = listings.slice().sort((a, b) => a.lo - b.lo)[0];
      const where = [...new Set(listings.map((x) => x.booth))].join(" & ");
      result.push({ seller: "TKTS", kind: `On today's board · ${where}`, sec: null, row: null, price: best.lo, fee: 0, url: TKTS_URL, live: "tkts",
        note: `${best.pct ? best.pct + "% off · " : ""}${money0(best.lo)}–${money0(best.hi)} on the board (updated ${best.updated.replace(/^\w+, /, "")}) · buy at the ${where} booth while they last${(() => {
          const closed = boards.filter((b) => b.day === today && b.status === "closed" && !listings.some((x) => x.booth === (BOOTH[b.booth] || b.booth))).map((b) => BOOTH[b.booth] || b.booth);
          return closed.length ? ` · the ${[...new Set(closed)].join(" & ")} booth has closed for today` : "";
        })()}` });
    } else if (box && (freq || boards.length || recentTkts(show))) {
      result.push({ seller: "TKTS", kind: "Same-day booth · often listed", sec: null, row: null, price: Math.round(box.price * 0.6), fee: 0, url: TKTS_URL, chance: true, estimate: true,
        note: `${freq ? `TDF says this show is ${freq} at TKTS` : recentTkts(show) ? `Was on the TKTS board ${fmtRunDate({ date: new Date(recentTkts(show).last + "T12:00:00"), precision: "day" })}` : "Was on a recent TKTS board"} · if it's on the board that day, usually 20–50% off · price is our estimate · check TKTS Live that morning` });
    }
    // Box office = the official seller's price minus its fees, always $0 fees (same tickets,
    // bought in person), one per official row. Sometimes it also has seats not listed online.
    result = result.filter((o) => !o.boxOffice);
    result.filter((o) => o.officialRow).forEach((o) => result.push({
      seller: "Box office", kind: "Official · in person, no fees", sec: o.sec, row: null,
      price: Math.round((o.feesIncluded ? o.price - o.fee : o.price) * 100) / 100, fee: 0,
      url: o.url, tag: "official", inPerson: true, boxOffice: true, sample: o.sample, live: o.live,
      note: `${show.official === "Box office" ? "Official" : show.official} price without its online fees, bought at the ${show.theater || "theater"} box office · sometimes has seats that aren't listed online` }));
    result.forEach((o) => { o.total = Math.round((o.price + o.fee) * 100) / 100; if (!o.live && !o.chance && !o.verified) o.sample = true; o.group = groupOf(o); });
    offers.length = 0; offers.push(...result);
    cache.set(ck, offers);
    return offers;
  }

  // Lowest guaranteed (non-lottery) all-in price
  function lowest(offers, opts = {}) {
    let best = null;
    offers.forEach((o) => {
      if (o.chance || o.estimate || o.sample) return;
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
    datesFor(show).forEach((dt) => {
      const b = lowestForDate(show, dt, { noMember: true });
      if (b && (!best || b.total < best.total)) { best = b; bestDate = dt; }
    });
    return { best, bestDate };
  }
  function officialLowest(show) {
    let best = null;
    datesFor(show).filter((dt) => performsOn(show, dt.date)).forEach((dt) => perfsFor(show, dt).forEach((p) => {
      buildOffers(show, p).forEach((o) => { if (o.officialRow && (!best || o.total < best.total)) best = o; });
    }));
    return best;
  }

  const fmtDow = (d) => d.toLocaleDateString("en-US", { weekday: "short" });

  // ---- major holidays: a small icon on the date, like opening and final nights ----
  const nthWeekday = (y, m, dow, n) => { const d = new Date(y, m, 1); d.setDate(1 + ((dow - d.getDay() + 7) % 7) + (n - 1) * 7); return d; };
  const lastWeekday = (y, m, dow) => { const d = new Date(y, m + 1, 0); d.setDate(d.getDate() - ((d.getDay() - dow + 7) % 7)); return d; };
  const easter = (y) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da); };
  const HOLIDAY_CACHE = {};
  function holidayOn(date) {
    const y = date.getFullYear();
    if (!HOLIDAY_CACHE[y]) {
      const list = [
        [new Date(y, 0, 1), "🎉", "New Year's Day"], [new Date(y, 1, 14), "💝", "Valentine's Day"], [easter(y), "🐣", "Easter"],
        [nthWeekday(y, 4, 0, 2), "💐", "Mother's Day"], [lastWeekday(y, 4, 1), "🇺🇸", "Memorial Day"], [nthWeekday(y, 5, 0, 3), "👔", "Father's Day"],
        [new Date(y, 6, 4), "🎆", "Fourth of July"], [nthWeekday(y, 8, 1, 1), "🛠️", "Labor Day"], [new Date(y, 9, 31), "🎃", "Halloween"],
        [nthWeekday(y, 10, 4, 4), "🦃", "Thanksgiving"], [new Date(y, 11, 24), "🎄", "Christmas Eve"], [new Date(y, 11, 25), "🎄", "Christmas"],
        [new Date(y, 11, 31), "🥂", "New Year's Eve"],
      ];
      HOLIDAY_CACHE[y] = Object.fromEntries(list.map(([d, icon, name]) => [dayKey(d), { icon, name }]));
    }
    return HOLIDAY_CACHE[y][dayKey(date)] || null;
  }
  const fmtLong = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const posterStyle = (s) => `background: linear-gradient(150deg, ${s.colors[0]} 0%, ${s.colors[0]} 45%, ${s.colors[1]} 160%); color: ${s.colors[1]};`;

  // Opera & ballet: link straight to the production on TodayTix when TodayTix sells it.
  window.__TM_SHOWS = SHOWS; // handy for debugging in the browser console
  // Opera & ballet sell on the company's own site; TodayTix also sells many of them.
  SHOWS.forEach((s) => { if (s.scene === "arts") { s.officialTickets = s.tickets; const id = TT.ids && TT.ids[s.slug]; if (id && id.url) s.todaytixUrl = id.url; } });

  // ---------- views ----------
  // ---------- filters ----------
  const typeOf = (s) => s.type || "Other";
  // Where a show sits: Broadway, Off-Broadway, or opera & ballet (Lincoln Center etc.).
  const sceneKey = (s) => (s.scene === "arts" ? "arts" : s.scene === "off" ? "off" : "broadway");
  const SCENE_LABEL = { broadway: "Broadway", off: "Off-Broadway", arts: "Opera & ballet" };
  const sceneLabel = (s) => SCENE_LABEL[sceneKey(s)];
  const FILTERS = {
    scene: [["all", "All"], ["broadway", "Broadway"], ["off", "Off-Broadway"], ["arts", "Opera & ballet"]],
    type: [["all", "All types"], ["Musical", "Musicals"], ["Play", "Plays"], ["Opera", "Opera"], ["Ballet", "Ballet & dance"], ["Special", "Specials"], ["Other", "Other"]],
    status: [["all", "Any time"], ["playing", "Now playing"], ["previews", "In previews"], ["upcoming", "Upcoming"], ["opening", "🎉 Opening this week"], ["closing", "⏳ Closing soon"], ["new", "📣 Recently announced"], ["longrun", "🏆 Long-running (5+ yrs)"], ["anniv", "🎂 Anniversary year"]],
  };
  const SCENE_HASH = { all: "#home", broadway: "#broadway", off: "#off-broadway", arts: "#opera-ballet" };
  function passes(s, f, skip) {
    if (s.status === "closed") return false;
    if (skip !== "scene" && f.scene !== "all" && f.scene !== sceneKey(s)) return false;
    if (skip !== "type" && f.type !== "all" && typeOf(s) !== f.type) return false;
    if (skip !== "status" && f.status === "closing" && !isClosingSoon(s)) return false;
    if (skip !== "status" && f.status === "opening" && !isOpeningSoon(s)) return false;
    if (skip !== "status" && f.status === "new" && !announcedOn(s)) return false;
    if (skip !== "status" && f.status === "longrun" && !isLongRunning(s)) return false;
    if (skip !== "status" && f.status === "anniv" && !anniversaryNote(s)) return false;
    if (skip !== "status" && f.status !== "all" && !["closing", "opening", "new", "longrun", "anniv"].includes(f.status) && s.status !== f.status) return false;
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
    const withLot = LIST.filter((s) => s.lottery || s.rush).length;
    const fresh = freshness(sc === "all" ? null : sc);
    const playing = LIST.filter((s) => s.status === "playing").length;
    const where = sc === "off" ? "off-Broadway" : sc === "broadway" ? "on Broadway" : sc === "arts" ? "operas & ballets" : "on & off Broadway, opera & ballet";

    return `
      <section class="hero ${sc !== "arts" ? "with-board" : ""}">
        ${sc !== "arts" ? tonightBoard((s) => sc === "all" || sceneKey(s) === sc) : ""}
        ${sc === "arts" ? `
        <p class="eyebrow">Lincoln Center & beyond</p>
        <h1>Opera &amp; <em>Ballet</em></h1>
        <p class="lede">The Met Opera and New York City Ballet, with their run dates and the cheap-seat programs (under-40 nights, $30 for 30, TDF). Each show lists where to buy: the company itself (box office and website) and TodayTix, with its live prices, when TodayTix sells it.</p>` :
        sc === "broadway" ? `
        <p class="eyebrow">41 theaters · 500+ seats each</p>
        <h1><em>Broadway</em></h1>
        <p class="lede">Broadway's theaters sit in and around Times Square and seat 500 or more. Each show below compares its official seller, the box office, discount codes, TodayTix, Broadway.com, resale, TKTS, lottery and rush, so you can see the cheapest seat in every section.</p>` :
        off ? `
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
          <div class="stat"><strong>${LIST.length}</strong><span>${sc === "arts" ? where : "shows " + where}</span>${sc === "all" ? `<span class="stat-split">${["broadway", "off", "arts"].map((k) => `${LIST.filter((x) => sceneKey(x) === k).length} ${SCENE_LABEL[k]}`).join(" · ")}</span>` : ""}</div>
          <div class="stat"><strong>${playing}</strong><span>playing now</span></div>
          <div class="stat"><strong>${SOURCES.length}</strong><span>ticket sources compared</span></div>
          <div class="stat"><strong>${withLot}</strong><span>with lottery or rush this week</span></div>
        </div>
        <p class="updated ${fresh.stale ? "stale" : ""}">${fresh.stale ? "⚠ " : "● "}${esc(fresh.text)}</p>
      </section>
      ${thisWeekBanner((s) => sc === "all" || sceneKey(s) === sc)}
      ${announcedStrip((s) => sc === "all" || sceneKey(s) === sc)}
      <div class="filters" id="filters"></div>
      <div class="section-head"><h2 id="grid-title"></h2><span class="muted" id="count"></span></div>
      <div class="grid" id="grid"></div>
      <nav class="pager" id="pager" aria-label="Pages"></nav>`;
  }

  function renderGrid() {
    const q = state.homeQuery.trim().toLowerCase();
    let list = SHOWS.filter((s) => passes(s, state.f)).map((s) => ({ s, real: realFrom(s) }))
      .filter(({ s }) => !q || s.title.toLowerCase().includes(q) || (s.theater || "").toLowerCase().includes(q));
    const tot = (x) => (x.s.onSale && x.real ? x.real.v : Infinity);
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
    const whereWord = { all: "", broadway: " on Broadway", off: " off-Broadway", arts: " · opera & ballet" }[f.scene];
    $("#grid-title").textContent = typeWord + whenWord + whereWord;
    $("#count").textContent = `${list.length} show${list.length === 1 ? "" : "s"}`;
    const grid = $("#grid");
    grid.classList.remove("grid-in"); void grid.offsetWidth; grid.classList.add("grid-in"); // replay the fade
    // 20 shows per page. Any change of filters / sort / search goes back to page 1.
    const sig = JSON.stringify([state.f, state.homeSort, q]);
    if (sig !== state.gridSig) { state.gridSig = sig; state.page = 1; }
    const PER = 20, pages = Math.max(1, Math.ceil(list.length / PER));
    state.page = Math.min(Math.max(1, state.page || 1), pages);
    const shown = list.slice((state.page - 1) * PER, state.page * PER);
    if (list.length > PER) $("#count").textContent = `${(state.page - 1) * PER + 1}–${(state.page - 1) * PER + shown.length} of ${list.length} shows`;
    const pager = $("#pager");
    if (pager) pager.innerHTML = pages > 1 ? `
      <button class="pg" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">← Prev</button>
      ${Array.from({ length: pages }, (_, i) => `<button class="pg ${i + 1 === state.page ? "active" : ""}" data-page="${i + 1}" ${i + 1 === state.page ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}
      <button class="pg" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="Next page">Next →</button>` : "";
    grid.innerHTML = list.length ? shown.map((x, i) => cardHtml(x, i)).join("") : `<div class="empty">No shows match${state.homeQuery ? ` “${esc(state.homeQuery)}” with` : ""} these filters. <a href="#home" data-clear>Clear filters</a></div>`;
  }

  // The lowest REAL price we know: Broadway.com's listed price, a live API price, or a verified code.
  function realFrom(s) {
    const c = [];
    if (s.bdcFrom != null) c.push({ v: s.bdcFrom, src: "Broadway.com" });
    validCodes(s).forEach((k) => c.push({ v: k.from, src: `code ${k.code}` }));
    const live = PRICES.shows && PRICES.shows[s.slug];
    if (live) Object.values(live).forEach((p) => { if (p.seatgeek) c.push({ v: p.seatgeek.low, src: "SeatGeek" }); if (p.ticketmaster) c.push({ v: p.ticketmaster.min, src: "Ticketmaster" }); });
    return c.sort((a, b) => a.v - b.v)[0] || null;
  }

  function cardHtml({ s }, i = 0) {
    const href = s.onSale || (s.scene === "arts" && (s.officialTickets || s.todaytixUrl)) ? `#show-${s.slug}` : s.bdcUrl;
    const ext = href.startsWith("#") ? "" : ` target="_blank" rel="noopener"`;
    return `
      <article class="show-card ${s.onSale ? "" : "soon"}" style="--i:${Math.min(i, 12)}">
        <a class="card-link" href="${esc(href)}"${ext}>
          <div class="poster ${IMAGES[s.slug] ? "has-img" : ""}" style="${posterStyle(s)}">
            ${IMAGES[s.slug] ? `<img class="poster-img" src="${esc(IMAGES[s.slug])}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ""}
            ${closingNote(s) ? `<div class="ribbon ${closingNote(s).urgent ? "urgent" : ""}">⏳ ${closingNote(s).short}</div>`
              : openingNote(s) ? `<div class="ribbon opening">🎉 ${openingNote(s).short}</div>`
              : previewNote(s) ? `<div class="ribbon preview">🎭 ${previewNote(s).short}</div>`
              : anniversaryNote(s) ? `<div class="ribbon anniv">🎂 ${anniversaryNote(s).short}</div>` : ""}
            <div class="p-title ${s.title.length > 30 ? "xlong" : s.title.length > 16 ? "long" : ""}">${esc(s.title)}</div>
            <div class="p-theater">${esc(s.theater || sceneLabel(s))}</div>
          </div>
          <div class="body">
            <div class="price-line">${false
              ? ""
              : s.onSale && realFrom(s)
              ? `<span class="from">from <strong>${money0(realFrom(s).v)}</strong></span>
                 <span class="muted" style="font-size:12px">${esc(realFrom(s).src)}</span>`
              : s.tickets ? `<span class="from">Tickets on ${esc(new URL(s.tickets).hostname.replace(/^www\./, ""))}</span>`
              : `<span class="from">Tickets not on sale yet</span>`}</div>
            <div class="badges">
              ${statusBadge(s, false)}
              ${s.type ? `<span class="badge">${esc(s.type)}</span>` : ""}
              ${validCodes(s).length ? `<span class="badge green">Code ${esc(validCodes(s)[0].code)}</span>` : ""}
              ${s.critics ? `<span class="badge ${s.critics.score >= 70 ? "green" : "gold"}">Critics ${s.critics.score}%</span>` : ""}
              ${s.lottery ? `<span class="badge gold">Lottery ${money0(s.lottery.price)}</span>` : ""}
              ${s.rush ? `<span class="badge green">Rush ${money0(s.rush.price)}</span>` : ""}
              ${s.onSale && s.demand > 0.85 ? `<span class="badge red">Selling fast</span>` : ""}
            </div>
          </div>
        </a>
        <div class="card-actions">
          <button class="preview-btn" data-preview="${esc(s.slug)}">Preview</button>
          <a href="${esc(href)}"${ext}>${s.onSale || href.startsWith("#") ? "Compare prices →" : s.tickets ? "Get tickets ↗" : "Broadway.com ↗"}</a>
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
          <div class="meta">${[s.type, s.theater || sceneLabel(s)].filter(Boolean).map(esc).join(" · ")}</div>
          <div class="pv-status">${statusBadge(s, true)}${s.status === "playing" && s.opening && s.opening.precision === "day" ? `<span>Opened ${fmtRunDate(s.opening)}</span>` : ""}${s.closing && s.status !== "closed" ? `<span>Final show ${fmtRunDate(s.closing)}</span>` : s.status === "playing" && !s.guessed ? `<span>Open-ended run</span>` : ""}${s.guessed ? `<span title="We don't have this show's dates yet, so the status is estimated from its listing.">Status estimated</span>` : ""}</div>
        </div>
        <div class="modal-body">
          ${closingNote(s) ? `<div class="closing-note ${closingNote(s).urgent ? "urgent" : ""}">⏳ ${closingNote(s).long}</div>` : ""}
          ${openingNote(s) ? `<div class="opening-note">${confetti()}<span class="on-text">🎉 ${openingNote(s).long}</span></div>` : ""}
          ${previewNote(s) ? `<div class="opening-note preview-note">${confetti()}<span class="on-text">🎭 ${previewNote(s).long}</span></div>` : ""}
          ${anniversaryNote(s) ? `<div class="opening-note anniv-note">${confetti()}<span class="on-text">🎂 ${anniversaryNote(s).long}</span></div>` : ""}
          ${s.blurb
            ? `<p class="pv-blurb">${esc(s.blurb)}</p>`
            : `<p class="pv-blurb muted">We haven't written a description for this show yet. <a href="${esc(s.bdcUrl)}" target="_blank" rel="noopener">Read about it ${s.tickets ? "on the venue's site" : "on Broadway.com"} ↗</a></p>`}

          <div class="pv-facts">
            <div><span>Lowest listed price</span><strong>${s.bdcFrom != null ? money(s.bdcFrom) : s.tickets ? "See site" : "Not on sale"}</strong><em>${s.tickets ? "venue box office" : "Broadway.com"}</em></div>
            <div><span>Audience reviews</span><strong>${s.ratingCount ? s.ratingCount.toLocaleString() : "—"}</strong><em>on Broadway.com</em></div>
            <div><span>Critics</span>${c ? `<strong>${c.score}%</strong><em>avg. rating</em>` : s.opening && s.opening.date <= TODAY ? `
              <span class="bsc">
                <a href="${esc(bscUrl(s))}" target="_blank" rel="noopener"><img class="bsc-badge" src="https://broadwayscorecard.com/api/badge/${esc(bscSlug(s))}" alt="CriticScore for ${esc(s.title)}" onerror="this.closest('.bsc').classList.add('bsc-none')"></a>
                <a class="bsc-attr" href="${esc(bscUrl(s))}" target="_blank" rel="noopener">CriticScore™ by Broadway Scorecard</a>
              </span>
              <em><a href="${esc(roundupUrl(s))}" target="_blank" rel="noopener">Review roundup ↗</a></em>` : `<strong>—</strong><em>reviews after opening</em>`}</div>
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
            <a href="${esc(showScoreUrl(s))}" target="_blank" rel="noopener">⭐ Audience scores on Show-Score ↗</a>
            ${(s.reddit || []).map((t) => `<a class="reddit-thread" href="${esc(t.url)}" target="_blank" rel="noopener">💬 r/Broadway: “${esc(t.title)}” ↗</a>`).join("")}
            <a href="https://www.reddit.com/r/Broadway/search/?q=${encodeURIComponent('"' + s.title.replace(/[:(].*$/, "").trim() + '"')}&restrict_sr=1&sort=relevance" target="_blank" rel="noopener">${s.reddit && s.reddit.length ? "More on r/Broadway ↗" : "What theatergoers say on r/Broadway ↗"}</a>
            ${s.theater ? `<a href="${esc(seatViewUrl(s.theater))}" target="_blank" rel="noopener">📷 Seat views at ${esc(s.theater)} ↗</a>` : ""}
          </div>
        </div>
        <div class="modal-foot">
          ${s.onSale ? `<a class="btn" href="#show-${esc(s.slug)}" data-close>Compare prices</a>` : `<a class="btn" href="${esc(s.bdcUrl)}" target="_blank" rel="noopener">${s.tickets ? "Get tickets ↗" : "Get notified on Broadway.com ↗"}</a>`}
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
    const root = $("#modal-root"); if (root.hidden || root.classList.contains("closing")) return;
    const finish = () => {
      root.classList.remove("closing"); root.hidden = true; root.innerHTML = ""; document.body.classList.remove("modal-open");
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };
    if (reduceMotion()) return finish();
    root.classList.add("closing");
    setTimeout(finish, 180);
  }

  function seatMap(offers, show) {
    const lo = {};
    const SECS = sectionsFor(show);
    SECS.forEach((s) => { lo[s.id] = lowest(offers, { section: s.id, noMember: state.hideMember }); });
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
      { id: "rmezz", d: "M25,240 Q200,302 375,240 L375,280 Q200,350 25,280 Z", ty: 291 },
    ];
    // Boxes sit along the side walls, near the stage.
    const boxG = SECS.some((x) => x.id === "box") ? (() => {
      const o = lo.box, sel = state.section === "box", dim = state.section !== "all" && !sel;
      const fill = o ? shade(o.total) : "#ddd", stroke = sel ? "#16130f" : "#fffdf8", sw = sel ? 3 : 2;
      return `<g class="sec" data-sec="box" tabindex="0" role="button" aria-label="Box${o ? ", from " + money0(o.total) : ""}" opacity="${dim ? 0.35 : 1}">
        <rect x="8" y="66" width="44" height="58" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
        <rect x="348" y="66" width="44" height="58" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
        <text x="30" y="90" text-anchor="middle" font-size="10" font-weight="700" fill="#16130f">BOX</text>
        <text x="30" y="106" text-anchor="middle" font-size="10" fill="#16130f">${o ? money0(o.total) : "—"}</text>
        <text x="370" y="90" text-anchor="middle" font-size="10" font-weight="700" fill="#16130f">BOX</text>
        <text x="370" y="106" text-anchor="middle" font-size="10" fill="#16130f">${o ? money0(o.total) : "—"}</text></g>`;
    })() : "";
    // Stage / onstage table seating: a band right at the stage.
    const stageSec = SECS.find((x) => x.id === "stage");
    const stageG = stageSec ? (() => {
      const o = lo.stage, sel = state.section === "stage", dim = state.section !== "all" && !sel;
      return `<g class="sec" data-sec="stage" tabindex="0" role="button" aria-label="${esc(stageSec.name)}${o ? ", from " + money0(o.total) : ""}" opacity="${dim ? 0.35 : 1}">
        <rect x="112" y="60" width="176" height="30" rx="8" fill="${o ? shade(o.total) : "#ddd"}" stroke="${sel ? "#16130f" : "#fffdf8"}" stroke-width="${sel ? 3 : 2}"/>
        <text x="200" y="73" text-anchor="middle" font-size="9" font-weight="700" fill="#16130f">${esc(stageSec.name.toUpperCase())}</text>
        <text x="200" y="85" text-anchor="middle" font-size="10" fill="#16130f">${o ? "from " + money0(o.total) : "—"}</text></g>`;
    })() : "";
    return `
      <svg viewBox="0 0 400 340" role="img" aria-label="Seat map${show.theater ? " of " + esc(show.theater) : ""} with lowest price per section">
        <rect x="120" y="20" width="160" height="38" rx="6" fill="#16130f"/>
        <text x="200" y="45" text-anchor="middle" fill="#f6f1e7" font-size="13" font-weight="700" letter-spacing="3">STAGE</text>
        ${stageG}
        ${arcs.filter((a) => SECS.some((s) => s.id === a.id)).map((a) => {
          const sec = SECS.find((s) => s.id === a.id); const o = lo[a.id];
          const sel = state.section === a.id; const dim = state.section !== "all" && !sel;
          return `<g class="sec" data-sec="${a.id}" tabindex="0" role="button" aria-label="${sec.name}${o ? ", from " + money0(o.total) : ""}" opacity="${dim ? 0.35 : 1}">
            <path d="${a.d}" fill="${o ? shade(o.total) : "#ddd"}" stroke="${sel ? "#16130f" : "#fffdf8"}" stroke-width="${sel ? 3 : 2}"/>
            <text x="200" y="${a.ty - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#16130f">${sec.name.toUpperCase()}</text>
            <text x="200" y="${a.ty + 10}" text-anchor="middle" font-size="13" fill="#16130f">${o ? "from " + money0(o.total) : "—"}</text>
          </g>`;
        }).join("")}
        ${boxG}
      </svg>`;
  }

  // Where to buy an opera / ballet: the company (official) and TodayTix (real prices when loaded).
  function artsTickets(show) {
    const company = { "Metropolitan Opera House": "The Met", "David H. Koch Theater": "New York City Ballet" }[show.theater] || show.theater || "the company";
    const tt = TT.shows && TT.shows[show.slug], perfs = tt && (tt.byQty ? tt.byQty[2] : tt.perfs);
    const lows = perfs ? Object.values(perfs).map((p) => p.low).filter((x) => x != null) : [];
    const ttLow = lows.length ? Math.min(...lows) : null;
    const rows = [
      show.officialTickets ? `<a class="buy-row" href="${esc(show.officialTickets)}" target="_blank" rel="noopener"><span><b>${esc(company)}</b> <span class="badge green">Official</span><br><span class="muted">Box office and the company's own website · no live price here</span></span><span class="btn ghost">Tickets ↗</span></a>` : "",
      show.todaytixUrl ? `<a class="buy-row" href="${esc(show.todaytixUrl)}" target="_blank" rel="noopener"><span><b>TodayTix</b> ${ttLow ? `<span class="badge live">● Live price</span>` : ""}<br><span class="muted">${ttLow ? `From ${money0(ttLow)} each for 2 seats together in the next two weeks · fees included` : "Prices on TodayTix"}</span></span><span class="btn ${ttLow ? "" : "ghost"}">${ttLow ? money0(ttLow) + " →" : "View ↗"}</span></a>` : "",
    ].join("");
    return `<section class="buy-box"><h2>Where to buy</h2>${rows}</section>`;
  }

  function viewShow(slug) {
    let DATES = window.__TM_DATES_ALL;
    const show = SHOWS.find((s) => s.slug === slug);
    if (!show) return `<a class="back" href="#home">← All shows</a><div class="empty">Show not found.</div>`;
    DATES = datesFor(show);
    const windowWord = datesShifted(show) ? "in its first 2 weeks of performances" : `in the next ${DAYS_AHEAD} days`;
    const backHref = SCENE_HASH[state.f.scene] || "#home";
    if (!show.onSale) {
      const run = [];
      if (show.previews && !show.previews.assumed && show.opening && show.previews.date < show.opening.date) run.push(`First preview ${fmtRunDate(show.previews)}`);
      if (show.opening) run.push(`${show.status === "playing" ? "Opened" : show.previews && show.opening && +show.previews.date === +show.opening.date ? "Plays" : "Opens"} ${fmtRunDate(show.opening)}`);
      if (show.closing) run.push(`${show.status === "closed" ? "Closed" : "Final performance"} ${fmtRunDate(show.closing)}`);
      const pv = PREVIEWS[show.slug] || {}, blurb = show.blurb || pv.blurb;
      return `<a class="back" href="${backHref}">← All shows</a><div class="detail-head"><h1>${esc(show.title)}</h1>
        <div class="muted">${[show.theater, show.type].filter(Boolean).map(esc).join(" · ")}</div>
        <div style="margin:8px 0">${statusBadge(show, true)}</div>
        ${run.length ? `<p><b>${run.join(" · ")}</b></p>` : ""}${blurb ? `<p>${esc(blurb)}</p>` : ""}</div>
        ${show.scene === "arts" && (show.officialTickets || show.todaytixUrl) ? artsTickets(show) : `<div class="empty"><b>${esc(show.title)}</b> ${show.tickets ? `sells tickets on its own site.` : `doesn't have tickets on sale yet.`} <a href="${esc(show.bdcUrl)}" target="_blank" rel="noopener">${show.tickets ? "Get tickets" : "See it on Broadway.com"} ↗</a></div>`}`;
    }

    // Today's performances that have already started are over: not selectable, no prices.
    const nowMin = (() => { const n = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); return n.getHours() * 60 + n.getMinutes(); })();
    const notOver = (dt, p) => dt.offset !== 0 || toMinutes(p.time) > nowMin;
    const upcoming = (dt) => perfsFor(show, dt).filter((p) => notOver(dt, p));
    const playable = (d) => upcoming(d).length && performsOn(show, d.date);
    const note = closingNote(show);
    const on = openingNote(show);
    const ann = anniversaryNote(show);
    const annBanner = ann ? `<div class="opening-note anniv-note big">${confetti()}<span class="on-text"><b>🎂 ${ann.soon ? (ann.today ? ann.short : "Big anniversary coming up!") : ann.short + "!"}</b><br>${ann.long}</span></div>` : "";
    const banner0 = note ? `<div class="closing-note big ${note.urgent ? "urgent" : ""}">⏳ ${note.long} <a href="#" data-date-first>See remaining dates ↓</a></div>`
      : previewNote(show) ? `<div class="opening-note preview-note big">${confetti()}<span class="on-text"><b>🎭 First preview coming up!</b><br>${previewNote(show).long}</span></div>`
      : on ? `<div class="opening-note big ${on.tonight ? "tonight" : ""}">${confetti()}<span class="on-text"><b>🎉 ${on.tonight ? "Opening night tonight!" : "Opening night is almost here!"}</b><br>${on.long}</span></div>` : "";
    const banner = banner0 + annBanner;
    if (!DATES.some(playable)) {
      // Only state dates we actually have: a real first-preview date, otherwise the opening date.
      const first = show.previews && show.previews.precision === "day" && !show.previews.assumed ? { label: "first performance", d: show.previews }
        : show.opening ? { label: "opening night", d: show.opening } : null;
      return `
        <a class="back" href="${backHref}">← ${{ all: "All shows", broadway: "Broadway", off: "Off-Broadway" }[state.f.scene]}</a>
        <section class="detail-hero" style="${posterStyle(show)}">
        <div>${IMAGES[show.slug] ? `<img class="hero-poster" src="${esc(IMAGES[show.slug])}" alt="${esc(show.title)} poster" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<h1>${esc(show.title)}</h1>
          ${runLine(show) ? `<div class="meta run-line">${runLine(show)}</div>` : ""}
          ${infoLine(show)}
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
    const dayPerfs = upcoming(dateObj);
    if (state.perfIdx >= dayPerfs.length) state.perfIdx = 0;
    const perf = dayPerfs[state.perfIdx];
    const alerts = store.get("tm-alerts", {});
    const target = alerts[slug];

    // date strip
    const lows = DATES.map((dt) => (upcoming(dt).length ? lowestForDate(show, dt, { noMember: state.hideMember, section: state.section }) : null));
    const cheapestVal = Math.min(...lows.filter(Boolean).map((o) => o.total));
    const overall = { total: cheapestVal };

    // offers
    const all = buildOffers(show, perf);
    const preGroup = all.filter((o) =>
      (state.section === "all" || !o.sec || o.sec.id === state.section) &&
      !(state.hideMember && o.member) &&
      !(o.max && state.qty > o.max));
    const groupCounts = preGroup.reduce((m, o) => ((m[o.group] = (m[o.group] || 0) + 1), m), { all: preGroup.length });
    if (state.group !== "all" && !groupCounts[state.group]) state.group = "all";
    let offers = preGroup.filter((o) => state.group === "all" || o.group === state.group);
    const key = state.fees ? "total" : "price";
    if (state.sort === "total") offers.sort((a, b) => a[key] - b[key]);
    if (state.sort === "section") offers.sort((a, b) => (a.sec ? secRank(show, a.sec) : 9) - (b.sec ? secRank(show, b.sec) : 9) || a[key] - b[key]);
    if (state.sort === "official") offers.sort((a, b) => (b.tag === "official") - (a.tag === "official") || a[key] - b[key]);
    // Sellers we have no live price for go last, without a made-up number.
    offers.sort((a, b) => (!!a.sample) - (!!b.sample));
    const bestDeal = lowest(offers, { noMember: false });
    const officialBySec = {};
    all.forEach((o) => { if (o.officialRow) officialBySec[o.sec.id] = o; });

    // Sellers without live prices: one row each (no made-up section, row or price).
    const seenNA = new Set();
    const shownOffers = offers.filter((o) => { if (!o.sample) return true; const k = o.seller + "|" + o.kind; if (seenNA.has(k)) return false; seenNA.add(k); return true; });
    const renderOffer = (o, group) => {
      const shown = state.fees ? o.total : o.price;
      // One card per seller: its other sections listed inside (filter by section to see them separately).
      const many = group && group.length > 1;
      const secList = many ? `<div class="sec-prices">${group.slice().sort((a, b) => secRank(show, a.sec) - secRank(show, b.sec)).map((g) =>
        `<button class="sec-price ${g === o ? "low" : ""}" data-section="${g.sec.id}" title="Show only ${esc(g.sec.name)}"><span>${esc(g.sec.name)}</span><b>${money0((state.fees ? g.total : g.price) * state.qty)}</b></button>`).join("")}</div>
        ${show.theater ? `<div class="sec-views">📷 Seat views: ${[...new Map(group.slice().sort((a, b) => secRank(show, a.sec) - secRank(show, b.sec)).map((g) => { const v = g.sec.view ? { url: g.sec.view } : sectionView(show.theater, g.sec.id); return [v.url, `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(g.sec.name)}</a>`]; })).values()].join(" · ")}</div>` : ""}` : "";
      const off = o.sec && officialBySec[o.sec.id];
      const save = off && o !== off && !off.sample ? off.total - o.total : 0;
      const isBest = bestDeal && o === bestDeal;
      return `
        <article class="offer ${isBest ? "best" : ""}" style="--i:${Math.min(offers.indexOf(o), 10)}">
          <div>
            <div class="seller">${esc(o.seller)}
              ${isBest ? `<span class="badge red">Best deal</span>` : ""}
              ${o.chance ? `<span class="badge gold">${/lottery/i.test(o.kind) ? "Lottery · not guaranteed" : o.seller === "TKTS" ? "Estimate · same day" : o.seller === "TDF" ? "Members · if offered" : "Rush · while they last"}</span>` : ""}
              ${o.member ? `<span class="badge">Members</span>` : ""}
              ${o.tag === "official" ? `<span class="badge green">Official</span>` : ""}
              ${o.verified ? `<span class="badge live">✓ Verified code</span>` : ""}
              ${o.live === "tkts" ? `<span class="badge live">● On today's TKTS board</span>` : o.live === "tdf" ? `<span class="badge live">From TDF</span>` : o.live ? `<span class="badge live">● Live price</span>` : o.sample ? `<span class="badge sample" title="We don't get live prices from this seller yet">No live price</span>` : ""}
            </div>
            <div class="kind">${esc(o.kind)}</div>
            ${o.code ? `<div class="code-box"><span class="code-label">Code</span><code>${esc(o.code.code)}</code><button class="copy-btn" data-copy="${esc(o.code.code)}">Copy</button> <a class="code-src" href="${esc(o.code.url)}" target="_blank" rel="noopener">${esc(o.code.source)} offer details ↗</a></div>` : ""}
            ${o.note && !many ? `<div class="note">${esc(o.note)}</div>` : ""}
            ${secList}
          </div>
          <div class="seat">${many ? `<b>${group.length} sections</b>From ${esc(o.sec.name)}` : o.sample ? `<b>All sections</b>` : o.sec ? `<b>${o.sec.name}</b>${o.row ? `Row ${o.row}` : o.code ? "Discounted seats" : ""}` : o.code ? `<b>Section not listed</b>Price varies by seat` : o.live ? `<b>Any section</b>Best available` : `<b>Seat assigned</b>Any section`}
            ${o.sec && show.theater && !o.sample && !many ? (() => { const v = o.sec.view ? { url: o.sec.view, label: `📷 Views from the ${o.sec.name.toLowerCase()}`, exact: true } : sectionView(show.theater, o.sec.id); return `<a class="seatview" href="${esc(v.url)}" target="_blank" rel="noopener" title="${v.exact ? "Audience photos from this section" : "Audience photos from all over the theater"}">${esc(v.label)}</a>`; })() : ""}</div>
          ${o.sample ? `<div class="price na">
            <div class="total na">Price not available right now</div>
            <div class="breakdown">We don't get live prices from ${esc(o.seller)}. Check its site for this performance.</div>
            <div class="actions"><a class="btn ghost" href="${esc(o.url)}" target="_blank" rel="noopener">Check price →</a></div>
          </div>` : `<div class="price">
            <div class="total">${money(shown * state.qty)}</div>
            ${state.qty > 1 ? `<div class="breakdown"><b>for ${state.qty} tickets</b> · ${money(shown)} each</div>` : ""}
            <div class="breakdown">${o.chance && o.seller !== "TKTS" ? "price set by the program · any fee shown at checkout" : o.code && o.code.feesIncl ? "from · fees included" : o.live === "seatgeek" || o.live === "todaytix" ? "all-in" : o.live === "broadwaycom" ? "as listed" : state.fees ? `${money(o.price)} + ${o.feeEstimated ? "~" : ""}${money(o.fee)} fees` : "before fees"} · each</div>
            ${save > 1 ? `<div class="save">Save ${money0(save * state.qty)} vs. the official site</div>` : ""}
            <div class="actions"><a class="btn ${isBest ? "" : "ghost"}" href="${esc(o.url)}" target="_blank" rel="noopener">${o.chance ? "Enter" : "View"} →</a></div>
          </div>`}
        </article>`;
    };
    // Sellers without live prices get their own section at the bottom.
    const naOffers = shownOffers.filter((o) => o.sample);
    // "All sections": group each seller's per-section rows into one card, led by its cheapest.
    const realOffers = shownOffers.filter((o) => !o.sample);
    const groups = new Map();
    realOffers.forEach((o) => {
      const k = state.section === "all" && o.sec && !o.chance ? [o.seller, o.kind, o.code ? o.code.code : ""].join("|") : Symbol();
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(o);
    });
    const lead = (g) => g.slice().sort((a, b) => a[key] - b[key])[0];
    const offerHtml = [...groups.values()].map((g) => renderOffer(lead(g), g)).join("") + (naOffers.length ? `
      <div class="na-section">
        <h3>No live prices right now</h3>
        <p class="muted">We can't get prices from these sellers yet. Tap through to check this performance on their site.</p>
      </div>${naOffers.map((o) => renderOffer(o)).join("")}` : "");

    const matches = target ? lows.filter((o) => o && o.total <= target).length : 0;

    return `
      <a class="back" href="${backHref}">← ${{ all: "All shows", broadway: "Broadway", off: "Off-Broadway" }[state.f.scene]}</a>
      <section class="detail-hero" style="${posterStyle(show)}">
        <div>
          ${IMAGES[show.slug] ? `<img class="hero-poster" src="${esc(IMAGES[show.slug])}" alt="${esc(show.title)} poster" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
          <h1>${esc(show.title)}</h1>
          ${runLine(show) ? `<div class="meta run-line">${runLine(show)}</div>` : ""}
          ${infoLine(show)}
          <div class="meta">${[show.theater, show.type].filter(Boolean).map(esc).join(" · ") || "Broadway"}${show.ratingCount ? ` · ${show.ratingCount.toLocaleString()} Broadway.com reviews` : ""}</div>
          <div class="meta"><a href="${esc(show.bdcUrl)}" target="_blank" rel="noopener" style="color:inherit">Broadway.com lists from <b>${money(show.bdcFrom)}</b> ↗</a> <span style="opacity:.75">· real price as of ${esc(freshness(show.scene).when)}</span></div>
        </div>
        <button class="preview-btn on-dark" data-preview="${esc(show.slug)}">Preview: about the show &amp; reviews</button>
        <div class="cheapest"><span>Lowest ${windowWord}${state.section !== "all" ? " · " + sectionsFor(show).find((x) => x.id === state.section).name : ""}</span><strong>${money0(overall.total * state.qty)}</strong><span>all-in${state.qty > 1 ? ` · ${state.qty} tickets (${money0(overall.total)} each)` : ""}</span></div>
      </section>
      ${banner}

      <section class="panel" id="dates">
        <h3>Pick a date</h3>
        <p class="muted cal-source">${hasLive(show) ? "Dates and curtain times from live ticket listings." : hasCalendar(show) ? `Real dates and curtain times from <a href="${esc(CALENDARS[show.slug].source)}" target="_blank" rel="noopener">Broadway.com's calendar ↗</a>, updated daily, holiday weeks included.` : "Typical weekly schedule. Holiday weeks and special performances can differ, so confirm the time with the seller."}</p>
        <div class="date-strip">
          ${DATES.map((dt, i) => {
            if (show.closing && show.closing.precision === "day" && dt.date > show.closing.date) return ""; // closed: hide later dates
            const lo = lows[i];
            if (perfsFor(show, dt).length && !upcoming(dt).length) {
              return `<button class="date-chip dark" disabled title="Today's performances have already started"><div class="dow">Today</div><div class="day">${dt.date.getDate()}</div><div class="lo muted">Ended</div></button>`;
            }
            if (!perfsFor(show, dt).length || !performsOn(show, dt.date)) {
              const why = !perfsFor(show, dt).length ? (hasLive(show) && inLiveWindow(dt.date) ? "—" : "Dark") : show.closing && dt.date > show.closing.date ? "Closed" : "—";
              return `<button class="date-chip dark" disabled title="${holidayOn(dt.date) ? holidayOn(dt.date).name + " · " : ""}${why === "Closed" ? "After the final performance" : why === "Dark" ? "No show this day" : "Before the first performance"}"><div class="dow">${fmtDow(dt.date)}${holidayOn(dt.date) ? ` <span class="hol" aria-label="${holidayOn(dt.date).name}">${holidayOn(dt.date).icon}</span>` : ""}</div><div class="day">${dt.date.getDate()}</div><div class="lo muted">${why}</div></button>`;
            }
            const isOpening = show.opening && show.opening.precision === "day" && dt.date.getTime() === show.opening.date.getTime();
            const isFinal = show.closing && show.closing.precision === "day" && dt.date.getTime() === show.closing.date.getTime();
            const cls = ["date-chip", isOpening ? "opening-day" : "", isFinal ? "final-day" : "", i === state.dateIdx ? "active" : "", lo && lo.total === cheapestVal ? "cheapest-day" : "", target && lo && lo.total <= target ? "alert-hit" : ""].join(" ");
            return `<button class="${cls} ${holidayOn(dt.date) ? "holiday" : ""}" data-date="${i}" aria-pressed="${i === state.dateIdx}"${isFinal ? ' title="Final performance"' : holidayOn(dt.date) ? ` title="${holidayOn(dt.date).name}"` : ""}>${isFinal ? `<div class="final-tag">Final show</div>` : holidayOn(dt.date) ? `<div class="final-tag hol-tag">${holidayOn(dt.date).icon} ${holidayOn(dt.date).name}</div>` : ""}<div class="dow">${dt.offset === 0 ? "Today" : fmtDow(dt.date)}</div><div class="day">${dt.date.getDate() === 1 || i === 0 ? dt.date.toLocaleDateString("en-US", { month: "short" }) + " " : ""}${dt.date.getDate()}</div><div class="lo">${lo ? money0(lo.total) : "—"}</div></button>`;
          }).join("")}
        </div>
        <div class="time-row">
          ${dayPerfs.map((p, i) => `<button class="pill ${i === state.perfIdx ? "active" : ""}" data-perf="${i}">${p.time}${p.approx ? "*" : ""}${p.kind === "mat" ? " · Matinee" : ""}${p.special ? ` · ${p.special}` : ""}</button>`).join("")}
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
                ${[{ id: "all", name: "All" }, ...sectionsFor(show)].map((s) => `<button class="pill ${state.section === s.id ? "active" : ""}" data-section="${s.id}">${s.name}</button>`).join("")}
              </div>
            </div>
            <div class="filter-group">
              <label class="toggle"><input type="checkbox" id="fees" ${state.fees ? "checked" : ""}/> Show prices with fees</label>
            </div>
          </div>
          <div class="panel seatmap">
            <h3>Seat map${show.theater ? " · " + esc(show.theater) : ""}</h3>
            ${seatMap(all, show)}
            <div class="legend">Greener = cheaper. Tap a section to filter.</div>
            ${show.theater && SEATVIEWS[show.theater] ? `<div class="level-links">${
                [...new Map(sectionsFor(show).map((sec) => { const v = sec.view ? { url: sec.view, label: `📷 ${sec.name}`, name: sec.name, exact: true } : sectionView(show.theater, sec.id); return [v.url, { sec, v }]; })).values()]
                  .map(({ sec, v }) => `<a class="btn ghost" href="${esc(v.url)}" target="_blank" rel="noopener" title="Audience photos from the whole ${esc(v.name)}">📷 ${esc(v.name)}${v.name !== sec.name ? ` <span class="lvl-note">(${sec.name.toLowerCase()})</span>` : ""}</a>`).join("")
              }</div>` : ""}
            ${show.theater ? `<a class="${SEATVIEWS[show.theater] ? "all-views" : "btn ghost seatview-btn"}" href="${esc(seatViewUrl(show.theater))}" target="_blank" rel="noopener">${SEATVIEWS[show.theater] ? "All sections at " + esc(show.theater) + " ↗" : "📷 See real seat views ↗"}</a>
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
            <h2>${fmtLong(dateObj.date)} · ${perf.time}${perf.special ? " · " + perf.special : ""}${holidayOn(dateObj.date) ? ` · ${holidayOn(dateObj.date).icon} ${holidayOn(dateObj.date).name}` : ""}</h2><p class="understudy-line">🎭 Who's on that night? <a href="${esc(understudyUrl(show))}" target="_blank" rel="noopener">Understudy reports on understudies.org ↗</a> <span class="muted">(community-reported; usually posted the day of)</span></p>${perf.approx ? `<p class="muted" style="margin-top:-6px">*Curtain time not confirmed for this special performance. Check with the seller.</p>` : ""}
            <select id="sort" aria-label="Sort offers">
              <option value="total" ${state.sort === "total" ? "selected" : ""}>Lowest price</option>
              <option value="section" ${state.sort === "section" ? "selected" : ""}>By section</option>
              <option value="official" ${state.sort === "official" ? "selected" : ""}>Official first</option>
            </select>
          </div>
          ${hasLive(show)
            ? `<p class="live-note">● Live prices from ${LIVE_SOURCES.map((k) => ({ seatgeek: "SeatGeek", ticketmaster: "Ticketmaster" }[k])).join(" & ")} · updated ${fmtNY(PRICES.updatedAt)}. Sellers we don't have live prices for are listed last, with a link to check.</p>`
            : `<p class="sample-note">${hasTT(show) ? "TodayTix prices are live (from TodayTix, updated daily) where it has this date. " : ""}Sellers we don't have live prices for are listed last as "price not available right now", with a link to check on their site.</p>`}
          <div class="group-tabs" role="tablist" aria-label="Seller type">
            ${GROUPS.filter(([g]) => g === "all" || groupCounts[g]).map(([g, label]) => `<button class="pill ${state.group === g ? "active" : ""}" role="tab" aria-selected="${state.group === g}" data-group="${g}">${label} <span class="n">${groupCounts[g] || 0}</span></button>`).join("")}
          </div>
          ${validCodes(show).length ? "" : `<p class="code-hint">No verified discount code for this show right now. Codes appear here once confirmed. Check <a href="https://playbill.com/discount" target="_blank" rel="noopener">Playbill Discounts ↗</a> or <a href="https://www.broadwaybox.com" target="_blank" rel="noopener">BroadwayBox ↗</a>.</p>`}
          ${(() => { const id = TT.ids && TT.ids[show.slug]; if (!id || !id.url) return "";
            const inWin = TT.window && perf.key.slice(0, 10) >= TT.window.from && perf.key.slice(0, 10) <= TT.window.to;
            if (ttFor(show, perf)) return "";
            return `<p class="also-check">🎟 <a href="${esc(id.url)}" target="_blank" rel="noopener">${esc(show.title)} on TodayTix ↗</a> <span class="muted">${inWin ? `${ttQty() && !(TT.shows[show.slug] && (TT.shows[show.slug].byQty ? TT.shows[show.slug].byQty[ttQty()] : ttQty() === 2)) ? `TodayTix prices for ${ttQty() === 1 ? "1 ticket" : ttQty() + " tickets"} aren't loaded for this show yet.` : ttQty() ? `TodayTix had no ${ttQty() === 1 ? "single seat" : ttQty() + " seats together"} for this performance when we checked (${fmtNY(TT.updatedAt)}). It may have some now.` : "We only load TodayTix prices for up to 4 tickets. Check TodayTix for bigger groups."}` : "TodayTix prices for this date aren't loaded yet. We load the next two weeks."}</span></p>`; })()}
          <p class="also-check">${all.some((o) => o.seller === "TDF" || o.seller === "TKTS") ? "More on TDF: " + tdfLinks(show) : `TDF (not in the prices above yet for this show): ${tdfLinks(show)}`}</p>
          <p class="also-check">Also check: <a href="https://apps.apple.com/us/app/theatr-app/id1580002886" target="_blank" rel="noopener">Theatr fan resale ↗</a> <span class="muted">(app-only, no public prices; resale capped at face value, plus Theatr fees)</span></p>
          <p class="muted" style="margin-top:-4px">${offers.filter((o) => !o.sample).length} prices from ${new Set(offers.filter((o) => !o.sample).map((o) => o.seller)).size} sources${offers.some((o) => o.sample) ? ` · ${new Set(offers.filter((o) => o.sample).map((o) => o.seller)).size} more without live prices` : ""}${offers.some((o) => o.chance) ? " · lottery, rush, TDF and “often at TKTS” shown but never picked as “Best deal”, since they aren't guaranteed" : ""}</p>
          ${state.section === "all" && state.group === "all" ? bySectionTable(show, preGroup) : ""}
          ${offerHtml || `<div class="empty">No offers match these filters. Try another section or fewer tickets.</div>`}
        </section>
      </div>`;
  }

  // "Cheapest by section": one row per section, so people compare where they'd actually sit.
  function bySectionTable(show, offers) {
    const key = state.fees ? "total" : "price";
    const rows = sectionsFor(show).map((sec) => {
      // Real prices first: when a section has any, sample estimates don't compete with them.
      const all = offers.filter((o) => !o.chance && !o.estimate && o.sec && o.sec.id === sec.id);
      const real = all.filter((o) => !o.sample);
      const inSec = real.sort((a, b) => a[key] - b[key]);
      if (!inSec.length) return `<tr><th scope="row"><button class="linkish" data-section="${sec.id}">${sec.name}</button></th><td class="muted" colspan="4">Price not available right now</td></tr>`;
      const best = inSec[0], box = inSec.find((o) => o.officialRow);
      const save = box && best !== box && !box.sample ? box[key] - best[key] : 0;
      return `<tr><th scope="row"><button class="linkish" data-section="${sec.id}">${sec.name}</button></th>
        <td class="bs-price">${money0(best[key] * state.qty)}${state.qty > 1 ? `<span class="bs-each">${money0(best[key])} each</span>` : ""}</td>
        <td>${esc(best.seller)}${best.code ? ` <code>${esc(best.code.code)}</code>` : ""}${best.sample ? ' <span class="badge sample">Sample</span>' : ""}</td>
        <td class="bs-save">${save > 1 ? `save ${money0(save * state.qty)}` : (best.officialRow || best.boxOffice) ? (best.boxOffice ? "box office, in person" : "official price is cheapest") : ""}</td>
        <td><a href="${esc(best.url)}" target="_blank" rel="noopener">View →</a></td></tr>`;
    }).join("");
    if (!rows) return "";
    const loose = offers.filter((o) => o.secUnknown);
    return `<div class="by-section panel">
      <h3>Cheapest by section <span class="muted">${state.fees ? "with fees" : "before fees"} · ${state.qty > 1 ? `${state.qty} tickets` : "1 ticket"}</span></h3>
      <table><tbody>${rows}</tbody></table>
      ${loose.length ? `<p class="muted bs-foot">${loose.map((o) => `<b>${esc(o.code.source)} code <code>${esc(o.code.code)}</code></b> (${o.code.to ? `${money0(o.code.from)}–${money0(o.code.to)}` : `from ${money0(o.code.from)}`})`).join(", ")} ${loose.length === 1 ? "isn't" : "aren't"} split by section because the offer doesn't say which seats get which price. Enter the code at checkout to see each section's price.</p>` : ""}
    </div>`;
  }

  // Split a program's shows into what's playing now vs. coming later.
  function programShows(p) {
    const shows = (p.slugs || []).map((sl) => SHOWS.find((x) => x.slug === sl)).filter((x) => x && x.status !== "closed");
    if (!shows.length) return "";
    const link = (x) => `<a href="#show-${x.slug}">${esc(x.title)}</a>`;
    const now = shows.filter((x) => x.status === "playing" || x.status === "previews");
    const later = shows.filter((x) => x.status === "upcoming");
    return `${now.length ? `<div class="program-shows">Now: ${now.map((x) => link(x) + (x.status === "previews" ? ' <span class="muted">(in previews)</span>' : "")).join(", ")}</div>` : ""}`
      + `${later.length ? `<div class="program-shows">Coming up: ${later.map((x) => link(x) + ((x.previews && !x.previews.assumed) || x.opening ? ` <span class="muted">(${x.previews && !x.previews.assumed && x.opening && x.previews.date < x.opening.date ? "previews " + fmtRunDate(x.previews) : (x.closing ? "plays " : "opens ") + fmtRunDate(x.opening) + (x.closing ? "–" + fmtRunDate(x.closing) : "")})</span>` : "")).join(", ")}</div>` : ""}`;
  }

  function programsSection(scene) {
    const ARTS = [["theater", "Theater"], ["opera", "Opera"], ["ballet", "Ballet"]];
    const list = PROGRAMS.filter((p) => scene === "all" || sceneKey(p) === scene);
    if (!list.length) return "";
    const srcs = window.TM_PROGRAMS_SOURCES || [];
    return `
      <div class="section-head"><h2>Student &amp; young-audience programs</h2><span class="muted">${list.length} companies</span></div>
      <p class="muted" style="margin-top:-6px">Cheap seats you sign up for once, usually free. Ages and prices from ${srcs.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join(", ")}. Confirm on each company's site.</p>
      ${ARTS.map(([art, label]) => {
        const g = list.filter((p) => p.art === art);
        if (!g.length) return "";
        return `<h3 class="art-head">${label}</h3><div class="program-grid">${g.map((p) => `
          <article class="program">
            <a class="program-co" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.company)} ↗</a>
            ${p.where ? `<div class="muted" style="font-size:12px">${esc(p.where)}</div>` : ""}
            ${programShows(p)}
            <ul>${p.deals.map((d) => `<li><b>${esc(d.price)}</b> <span class="pname">${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.name)} ↗</a>` : esc(d.name)}</span> <span class="badge">${esc(d.who)}</span><div class="muted" style="font-size:12px">${esc(d.how)}</div></li>`).join("")}</ul>
          </article>`).join("")}</div>`;
      }).join("")}`;
  }

  function viewLottery() {
    const lot = SOURCES.find((x) => x.id === "lottery");
    const scene = state.lotScene || "all";
    const inScene = (s) => scene === "all" || sceneKey(s) === scene;
    const current = SHOWS.filter((s) => s.status !== "closed");
    const fmt = (iso) => (iso ? fmtNY(iso) : "never");
    const stale = RUSH && (RUSH.status === "stale" || (Date.now() - new Date(RUSH.updatedAt)) / 864e5 > 9);

    const dealLink = (d) => `<a class="deal" href="${esc(d.url || "https://bwayrush.com/")}" target="_blank" rel="noopener">
        <b>${d.price != null ? money(d.price).replace(/\.00$/, "") : esc(d.label.split(" ")[0])}</b>
        <span>${esc([d.channel, d.platform].filter(Boolean).join(" · ") || d.label.replace(/^\S+\s*/, ""))}</span></a>`;
    const otherLabel = (d) => ({ student: "Student", young: d.label.replace(/^\S+\s*/, "").replace(/\+fee\s*/, "") || "Young audience", sro: "Standing room", special: d.label.replace(/^\S+\s*/, "") || "Special" }[d.type]);
    const cell = (deals) => deals.length ? deals.sort((a, b) => (a.price ?? 999) - (b.price ?? 999)).map(dealLink).join("") : `<span class="muted">—</span>`;
    const min = (s) => Math.min(...s.deals.filter((d) => d.price != null && (d.type === "lottery" || d.type === "rush")).map((d) => d.price), 999);

    const withData = current.filter((s) => s.deals.length && inScene(s)).sort((a, b) => min(a) - min(b) || a.title.localeCompare(b.title));
    const noData = current.filter((s) => !s.deals.length);
    const notesHtml = (s) => { const n = runNotes(s); return n.length ? `<div class="run-notes">${n.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""; };
    const sceneTag = (s) => `<span class="badge">${sceneLabel(s)}</span>`;

    const noDataGroup = (key, label) => {
      const list = noData.filter((s) => sceneKey(s) === key).sort((a, b) => a.title.localeCompare(b.title));
      if (!list.length || !(scene === "all" || scene === key)) return "";
      return `<div class="nodata-group"><h3>${label} <span class="muted">${list.length}</span></h3><ul class="nodata-list">${list.map((s) => `
        <li><a href="${s.onSale ? `#show-${s.slug}` : esc(s.bdcUrl)}"${s.onSale ? "" : ' target="_blank" rel="noopener"'}>${esc(s.title)}</a>
          <span class="muted">${[s.type, s.status === "upcoming" ? "Upcoming" : s.status === "previews" ? "In previews" : null].filter(Boolean).join(" · ")}</span>
          ${notesHtml(s)}</li>`).join("")}</ul></div>`;
    };

    return `
      <section class="hero">
        <p class="eyebrow">Same-day steals</p>
        <h1>Lottery &amp; <em>Rush</em></h1>
        <p class="lede">${esc(lot.what)} Every show from Broadway.com (Broadway and Off-Broadway), cheapest first.</p>
        ${RUSH ? `<p class="updated ${stale ? "stale" : ""}">${stale ? "⚠ Couldn't refresh this week. Showing" : "● Deals from"} <a href="https://bwayrush.com/" target="_blank" rel="noopener">bwayrush.com</a> · week of ${esc(RUSH.weekOf || "?")} · updated ${esc(fmt(RUSH.updatedAt))} · refreshed every Monday</p>`
          : `<p class="updated stale">⚠ Lottery &amp; rush data hasn't been loaded yet. Check <a href="https://bwayrush.com/" target="_blank" rel="noopener">bwayrush.com</a>.</p>`}
      </section>
      ${thisWeekBanner(inScene)}
      <div class="chip-row" style="margin:6px 0 14px" role="group" aria-label="Where">
        ${[["all", "All"], ["broadway", "Broadway"], ["off", "Off-Broadway"], ["arts", "Opera & ballet"]].map(([k, l]) => `<button class="pill ${scene === k ? "active" : ""}" data-lotscene="${k}">${l}</button>`).join("")}
      </div>
      <div class="section-head"><h2>Lottery, rush &amp; more</h2><span class="muted">${withData.length} show${withData.length === 1 ? "" : "s"}</span></div>
      <div class="table-wrap">
        <table class="lot-table">
          <thead><tr><th>Show</th><th>Digital lottery</th><th>Rush</th><th>Student &amp; other</th></tr></thead>
          <tbody>
            ${withData.map((s) => `
              <tr>
                <td class="show-name"><a href="#show-${s.slug}">${esc(s.title)}</a>
                  <div class="muted" style="font-size:13px">${[s.theater, sceneKey(s) !== "broadway" ? sceneLabel(s) : null].filter(Boolean).map(esc).join(" · ")}</div>${notesHtml(s)}</td>
                <td>${cell(s.deals.filter((d) => d.type === "lottery"))}</td>
                <td>${cell(s.deals.filter((d) => d.type === "rush"))}</td>
                <td>${s.deals.filter((d) => !["lottery", "rush"].includes(d.type)).sort((a, b) => (a.price ?? 999) - (b.price ?? 999)).map((d) => `<a class="deal" href="${esc(d.url || "https://bwayrush.com/")}" target="_blank" rel="noopener"><b>${esc(d.label.split(" ")[0] === "50%" || /%/.test(d.label) ? d.label.match(/\d+% off/)[0] : d.price != null ? money(d.price).replace(/\.00$/, "") : d.label)}</b><span>${esc(otherLabel(d))}</span></a>`).join("") || `<span class="muted">—</span>`}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      ${programsSection(scene)}

      <div class="section-head"><h2>No lottery or rush info available</h2><span class="muted">${noData.filter(inScene).length} show${noData.filter(inScene).length === 1 ? "" : "s"}</span></div>
      <p class="muted" style="margin-top:-6px">bwayrush.com doesn't list same-day deals for these yet. New shows often add them closer to opening.</p>
      <div class="nodata">${noDataGroup("broadway", "Broadway")}${noDataGroup("off", "Off-Broadway")}${noDataGroup("arts", "Opera & ballet")}</div>

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
    if (h === "home" || h === "broadway" || h === "off-broadway" || h === "opera-ballet") state.f.scene = h === "broadway" ? "broadway" : h === "off-broadway" ? "off" : h === "opera-ballet" ? "arts" : "all";
    const app = $("#app");
    let nav = "home";
    if (h.startsWith("show-")) {
      nav = { all: "home", broadway: "broadway", off: "off", arts: "arts" }[state.f.scene]; // keep the tab you came from lit
      const slug = h.slice(5);
      if (slug !== currentSlug) { state.dateIdx = null; state.perfIdx = 0; state.section = "all"; state.group = "all"; currentSlug = slug; }
      app.innerHTML = viewShow(slug);
      document.title = (SHOWS.find((s) => s.slug === slug)?.title || "Show") + " tickets — TheaterMax";
    } else if (h === "off-broadway" || h === "broadway" || h === "opera-ballet") {
      nav = h === "broadway" ? "broadway" : h === "opera-ballet" ? "arts" : "off"; app.innerHTML = viewHome(); renderGrid();
      document.title = (h === "broadway" ? "Broadway" : h === "opera-ballet" ? "Opera & Ballet" : "Off-Broadway") + " — TheaterMax";
    } else if (h === "lottery") {
      nav = "lottery"; app.innerHTML = viewLottery(); document.title = "Lottery & Rush — TheaterMax";
    } else if (h === "guide") {
      nav = "guide"; app.innerHTML = viewGuide(); document.title = "Discount Guide — TheaterMax";
    } else {
      app.innerHTML = viewHome(); renderGrid(); document.title = "TheaterMax — Compare theater ticket prices";
    }
    // Match on href, so the highlight works even if a cached older index.html is on screen.
    const NAV_HREF = { home: "#home", broadway: "#broadway", off: "#off-broadway", arts: "#opera-ballet", lottery: "#lottery", guide: "#guide" };
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
    const cp = e.target.closest("[data-copy]");
    if (cp) {
      e.preventDefault();
      const done = () => { cp.textContent = "Copied!"; setTimeout(() => (cp.textContent = "Copy"), 1500); };
      try { navigator.clipboard.writeText(cp.dataset.copy).then(done, () => { cp.textContent = cp.dataset.copy; }); } catch { cp.textContent = cp.dataset.copy; }
      return;
    }
    const ls = e.target.closest("[data-lotscene]");
    if (ls) { state.lotScene = ls.dataset.lotscene; const y = window.scrollY; $("#app").innerHTML = viewLottery(); window.scrollTo(0, y); return; }
    const gt = e.target.closest("[data-group]");
    if (gt) { state.group = gt.dataset.group; rerenderShow(); return; }
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

  // ---- page transitions: fade + slight lift between pages ----
  const reduceMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
  let navToken = 0;
  function navigate() {
    const go = () => { route(); window.scrollTo(0, 0); };
    if (reduceMotion()) return go();
    if (document.startViewTransition) { document.startViewTransition(go); return; } // Chrome, Edge, Safari 18+
    // Fallback: fade the page out, swap, fade it back in.
    const app = $("#app"), token = ++navToken;
    app.classList.add("page-leave");
    setTimeout(() => {
      if (token !== navToken) return;
      go();
      app.classList.remove("page-leave");
      app.classList.add("page-enter");
      setTimeout(() => app.classList.remove("page-enter"), 450);
    }, 160);
  }
  window.addEventListener("hashchange", navigate);
  route();

  // ---------- "See a mistake or bug?" form → email via FormSubmit (data/config.js) ----------
  (function setupReport() {
    const form = document.getElementById("report-form");
    if (!form) return;
    const status = form.querySelector(".report-status"), btn = form.querySelector("button[type=submit]");
    const say = (msg, cls) => { status.textContent = msg; status.className = "report-status " + (cls || ""); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get("_honey")) return;                              // bots fill hidden fields
      const message = String(fd.get("message") || "").trim();
      if (message.length < 5) { say("Please tell us what you noticed.", "err"); form.message.focus(); return; }
      const to = ((window.TM_CONFIG || {}).REPORT_TO || "").trim();
      if (!to) { say("Reporting isn't switched on yet. Please try again soon.", "err"); return; }
      const body = { _subject: `TheaterMax report: ${fd.get("kind")}`, _template: "table", _captcha: "false",
        kind: fd.get("kind"), message, page: location.href, browser: navigator.userAgent, sent: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET" };
      const email = String(fd.get("email") || "").trim();
      if (email) body.email = email;                              // FormSubmit uses this as reply-to
      btn.disabled = true; say("Sending…");
      try {
        const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || String(out.success) === "false") throw new Error(out.message || res.status);
        form.reset(); say("Thanks! Your report was sent.", "ok");
      } catch (err) {
        say("Couldn't send right now. Please try again in a minute.", "err");
      } finally { btn.disabled = false; }
    });
  })();

  // Pager under the show grid
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".pg[data-page]");
    if (!b || b.disabled) return;
    state.page = +b.dataset.page; renderGrid();
    const t = document.getElementById("grid-title"); if (t) t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });

  // "See all →" on the Recently announced strip: set the status filter.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-quickstatus]");
    if (!b) return;
    state.f.status = b.dataset.quickstatus; renderGrid();
    const t = document.getElementById("filters"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
