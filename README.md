# TheaterMax 🎟

**Want the best ticket deals but find yourself scanning multiple websites?** TheaterMax brings every ticket website and app into one place, so you can compare prices, dates and seat locations for theater shows.

> ⚠️ **Prototype.** The **show list and "from" prices are real**, pulled from Broadway.com once a day. **Seat-by-seat offers** (each seller's price per section) and **lottery & rush details** are still sample data.

## What it does

- **Compare**: search shows and see the lowest all-in price over the next 14 days.
- **Show page**: pick a date and time, then compare every source side by side: the official seller, promo codes, TodayTix, SeatGeek, TKTS, TDF, Theatr, lottery and rush. It includes:
  - prices with or without fees, and the total for your ticket count
  - a seat map shaded by price (tap a section to filter)
  - a "Best deal" badge, which never goes to lottery or rush tickets since those aren't guaranteed
  - savings compared with the box office
  - price alerts that highlight matching dates (saved in your browser)
- **Lottery & Rush**: every show's same-day policy in one table.
- **Discount Guide**: all seven sources from *Naomi's Guide to Discount Broadway*.

## Live show list (daily scraper)

`scripts/update-shows.mjs` reads Broadway.com's listing of all Broadway shows and writes `data/live-shows.js`, which contains each show's title, link, lowest "from" price and review count. It doesn't copy show descriptions or images.

- **Schedule:** `.github/workflows/update-shows.yml` runs it every day at about 5 AM New York time. It commits only when the list actually changes. To run it by hand, go to **Actions → Update show list → Run workflow**.
- **If Broadway.com is unreachable**, the script tries 3 times, keeps the previous day's list and marks it `stale`. The site then shows a yellow note: *"Couldn't refresh… Showing the list last updated …"*. A normal day shows a green *"last updated …"* line instead.
- **If Broadway.com changes its page layout** and the scraper finds fewer than 20 shows, it also keeps the old list, so the site never goes blank.
- **Run it yourself:** `node scripts/update-shows.mjs` (needs Node 18+, no installs).
- Check Broadway.com's terms of use before launching anything commercial. The bot identifies itself and only makes one request a day.

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
scripts/update-shows.mjs              the scraper
.github/workflows/update-shows.yml    runs the scraper daily
data/sources.js   the ticket sources, from the discount guide
```

## Ideas for what to build next

- **Real data**: replace `buildOffers()` in `app.js` with real listings. Affiliate programs (SeatGeek, TodayTix, Ticketmaster) are the usual way to get them, and they also pay a commission.
- **Real price alerts**: add a small backend (Supabase, Firebase) that saves alerts and sends emails.
- **More theater**: add Off-Broadway, touring shows and regional theaters.
- **Price history**: show charts so people know when to buy.
