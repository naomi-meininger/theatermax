# TheaterMax 🎟

**Want the best ticket deals but find yourself scanning multiple websites?** TheaterMax brings every ticket website and app into one place, so you can compare prices, dates and seat locations for theater shows.

> ⚠️ **Prototype.** The **show list and "from" prices are real**, pulled from Broadway.com once a day. **Seat-by-seat offers** (each seller's price per section) and **lottery & rush details** are still sample data.

## What it does

- **All shows / Broadway / Off-Broadway** tabs: search shows and see the lowest all-in price over the next 14 days.
- **Filters**: Where (Broadway / Off-Broadway), Type (Musicals / Plays / Specials) and When (Now playing / In previews / Upcoming), each with live counts. Cards show "In previews · opens …", "Opens …" or "Closes …" badges, and shows that have closed drop off automatically.
- **Preview**: a short description, the review count, and a critics summary built from review roundups.
- **Show page**: pick a date and time, then compare every source side by side: the official seller, promo codes, TodayTix, SeatGeek, TKTS, TDF, Theatr, lottery and rush. It includes:
  - prices with or without fees, and the total for your ticket count
  - a seat map shaded by price (tap a section to filter)
  - a "Best deal" badge, which never goes to lottery or rush tickets since those aren't guaranteed
  - savings compared with the box office
  - price alerts that highlight matching dates (saved in your browser)
- **Lottery & Rush**: every show's same-day policy in one table.
- **Discount Guide**: all seven sources from *Naomi's Guide to Discount Broadway*.

## Live show list (daily scraper)

`scripts/update-shows.mjs` reads Broadway.com's **Broadway** and **Off-Broadway** listings and writes `data/live-shows.js`. That file contains each show's title, link, lowest "from" price, review count, and whether it's Broadway or Off-Broadway. It doesn't copy show descriptions or images. Each list falls back to its own last good copy, so if one listing fails, the other still updates.

- **Schedule:** `.github/workflows/update-shows.yml` runs it every day at about 5 AM New York time. It commits only when the list actually changes. To run it by hand, go to **Actions → Update show list → Run workflow**.
- **If Broadway.com is unreachable**, the script tries 3 times, keeps the previous day's list and marks it `stale`. The site then shows a yellow note: *"Couldn't refresh… Showing the list last updated …"*. A normal day shows a green *"last updated …"* line instead.
- **If Broadway.com changes its page layout** and the scraper finds fewer than 20 shows, it also keeps the old list, so the site never goes blank.
- **Run it yourself:** `node scripts/update-shows.mjs` (needs Node 18+, no installs).
- Check Broadway.com's terms of use before launching anything commercial. The bot identifies itself and only makes one request a day.

## Show previews & critics

Every show card has a **Preview** button, and show pages have one too. It opens a short description, the lowest listed price, the audience-review count, and, where available, a **critics summary**. The summary shows the average score, how many reviews were positive, mixed or negative, a one-line consensus, and a link to the full review roundup (for example, BroadwayWorld's).

All of this lives in `data/previews.js`. **Write descriptions and consensus lines in your own words.** Don't paste text from Broadway.com, reviews or other sites: that's their copyrighted writing. Link to it instead. To add critics for another show, find its BroadwayWorld "Review Roundup" article, count the verdicts, note the average score, and add a `critics` entry.

## Run dates (Now playing / In previews / Upcoming)

`data/schedule.js` holds each show's first preview, opening night and closing date, taken from Wikipedia's Broadway theater table and Broadway.com's Off-Broadway guide. The status is worked out from today's date, so shows move from Upcoming to In previews to Now playing on their own, and disappear after their final performance. If a show has no dates, the site estimates its status and labels it "Status estimated" in the preview. Add dates there as shows are announced.

- **Closing soon**: within 30 days of the final performance, a show gets a "⏳ Closing soon · Nov 22" ribbon on its card, which turns red as "Final week" in the last 7 days. It also gets a banner on its show page and in the preview, plus a "Closing soon" option in the When filter. The price calendar marks dates after the final show as "Closed".
- **Opening night**: within 7 days of opening, a show gets a "🎉 Opens Wed 18!" ribbon, a confetti banner on its show page and in the preview (a dark "Opening night tonight!" version on the day itself), a 🎉 on the opening date in the calendar, and an "Opening this week" filter option.
- Shows that haven't started yet only list real performance dates. If none fall in the next 14 days, the page says when the show opens.

## View from my seat

Show pages link to [A View From My Seat](https://aviewfrommyseat.com/) for the show's theater: a button under the seat map, plus a "View from this section" link on each offer. Their policy says their user photos may only be used to promote A View From My Seat, so TheaterMax **links** to their pages and never copies or embeds the photos. Theater names live in `data/shows.js` (`TM_THEATERS`). Update them when shows move.

## Run it locally

You don't need to build or install anything. Just open `index.html` in a browser, or start a local server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publish with GitHub Pages

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**, pick the branch **main** and the folder **/ (root)**, then click **Save**.
3. After about a minute, the site is live at `https://naomi-meininger.github.io/theatermax/`.

## Project layout

```
index.html        page shell (header, nav, footer)
styles.css        all styling
app.js            routing, views and the sample price generator
data/live-shows.js  AUTO-GENERATED daily: current Broadway shows from Broadway.com
data/shows.js     extras: theaters, plays list, sample lottery & rush
data/previews.js  show descriptions (our own words) + types + critic roundup summaries
data/schedule.js  previews / opening / closing dates that drive the "When" filter
scripts/update-shows.mjs              the scraper
.github/workflows/update-shows.yml    runs the scraper daily
data/sources.js   the ticket sources, from the discount guide
```

## Ideas for what to build next

- **Real data**: replace `buildOffers()` in `app.js` with real listings. Affiliate programs (SeatGeek, TodayTix, Ticketmaster) are the usual way to get them, and they also pay a commission.
- **Real price alerts**: add a small backend (Supabase, Firebase) that saves alerts and sends emails.
- **More theater**: add Off-Broadway, touring shows and regional theaters.
- **Price history**: show charts so people know when to buy.
