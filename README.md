# TheaterMax 🎟

**Want the best ticket deals but find yourself scanning multiple websites?** TheaterMax brings every ticket website and app into one place, so you can compare prices, dates and seat locations for theater shows.

> ⚠️ **Prototype.** All prices and availability are sample data generated in `app.js`. Nothing here is a live listing yet.

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
data/shows.js     the shows (sample data: prices, demand, lottery and rush)
data/sources.js   the ticket sources, from the discount guide
```

## Ideas for what to build next

- **Real data**: replace `buildOffers()` in `app.js` with real listings. Affiliate programs (SeatGeek, TodayTix, Ticketmaster) are the usual way to get them, and they also pay a commission.
- **Real price alerts**: add a small backend (Supabase, Firebase) that saves alerts and sends emails.
- **More theater**: add Off-Broadway, touring shows and regional theaters.
- **Price history**: show charts so people know when to buy.
