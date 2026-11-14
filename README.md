# TheaterMax 🎟

**Want the best ticket deals but find yourself scanning multiple websites?** TheaterMax brings every ticket website and app into one place, so you can compare prices, dates and seat locations for theater shows.

> ⚠️ **Prototype.** Real data: the **show list and "from" prices** (Broadway.com, daily), **lottery, rush and student deals** (bwayrush.com, weekly), **verified discount codes** (Playbill), **young-audience programs** (Playbill and Field Trip NYC), and **live prices** from SeatGeek and Ticketmaster once you add API keys. The section-by-section offers on a show page are still sample data and are labeled "Sample".

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

## Live prices (SeatGeek + Ticketmaster)

`scripts/update-prices.mjs` runs every 6 hours (`.github/workflows/update-prices.yml`). For each show on sale, it finds the matching performances in the next 14 days and saves real prices to `data/live-prices.js`:

| Source | What you get (free tier) | Shown on the site as |
|---|---|---|
| SeatGeek | cheapest seat per performance, **fees included**, plus highest price and number of listings | "● Live price · SeatGeek · Cheapest available seat" |
| Ticketmaster | face-value price range per performance (**before fees**; the site adds an estimated ~18%) | "● Live price · Ticketmaster · Face-value tickets" |

On shows with live data, the date picker uses the **real performance times**, and the remaining estimated rows get a "Sample" tag. Shows without live data keep the sample prices and say so.

**To turn it on (about 10 minutes):**
1. **SeatGeek:** sign in at <https://seatgeek.com/account/develop>, create an app, and copy its **Client ID**.
2. **Ticketmaster:** sign up at <https://developer.ticketmaster.com/>, open *My Apps*, and copy the **Consumer Key**.
3. In this repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `SEATGEEK_CLIENT_ID`: your SeatGeek Client ID
   - `TICKETMASTER_API_KEY`: your Ticketmaster Consumer Key
4. Go to **Actions → Update live prices → Run workflow**. A couple of minutes later, show pages show "● Live price" rows.

You can add just one of the two keys; the other source is skipped. Keys never appear in the code or on the site.

**Safety nets:** an event only counts as a match when its title matches and, if we know the theater, it's at that theater, so touring productions and "Annie Lennox" don't sneak in. If a source fails (network down, bad key, rate limit), it stops right away, keeps the previous prices, and logs a warning in the Actions run. Past performances are dropped automatically. Test it locally with `SEATGEEK_CLIENT_ID=... node scripts/update-prices.mjs`.

## Lottery & Rush page (weekly from bwayrush.com)

`scripts/update-rush.mjs` runs every Monday (`.github/workflows/update-rush.yml`). It reads bwayrush.com and saves each show's lottery, rush, student, young-audience and military deals to `data/rush.js`, keeping only the price, type, platform and link, with credit to bwayrush. Telecharge lotteries run on SocialToaster, so those links are labeled "Telecharge". If bwayrush can't be reached, last week's data stays and the page says so.

The page lists **every** show from Broadway.com plus the extra shows below:
- A table of shows with deals (lottery · rush · student & other), cheapest first, with All / Broadway / Off-Broadway chips
- **Student & young-audience programs** (`data/programs.js`), grouped Theater / Opera / Ballet: LincTix, MTC35, Hiptix, Second Stage 30 Under 30, MCC, City Center Access Club, Atlantic, Classic Stage, Playwrights Horizons, Signature, TFANA, PAC NYC, Vineyard, Irish Rep, the Met Opera's Under 40 Fridays and NYC Ballet's $30 for 30. A program's deals also show on the shows it covers.
- **No lottery or rush info available**, grouped Broadway / Off-Broadway, with first-preview, opening and closing dates when they're within a month

## Extra shows

`data/extra-shows.js` adds shows that aren't on Broadway.com, like New York City Center's *In the Heights* and the 2027 Encores! season (counted as Off-Broadway musicals). They link to the venue's own ticket page.

## Discount codes

`data/codes.js` lists **verified** codes only, each copied from its offer page (Playbill's, so far) with its expiry date. A show with a code gets a "✓ Verified code" row showing the actual code and a **Copy** button, plus a "Code SIXPB" badge on its card. Expired codes hide themselves. Shows without a verified code say so and link to Playbill Discounts and BroadwayBox, rather than showing a made-up discount. To add a code, find it on <https://playbill.com/discount> or BroadwayBox and add an entry with `code`, `expires`, `from` and `url`.

## Seller tabs on show pages

Above the offers: **All · Official sellers · Discount codes · Discount apps (TodayTix, Theatr) · Resale (SeatGeek) · Same-day & lottery (TKTS, lottery, rush) · Memberships (TDF)**, each with a count. Tabs with no offers are hidden.

## Show previews & critics

Every show card has a **Preview** button, and show pages have one too. It opens a short description, the lowest listed price, the audience-review count, and, where available, a **critics summary**. The summary shows the average score, how many reviews were positive, mixed or negative, a one-line consensus, and a link to the full review roundup (for example, BroadwayWorld's).

Each preview also links to **r/Broadway**: a search for the show, plus any hand-picked threads listed under `reddit: [{ title, url }]` (shown as "💬 r/Broadway: …"). These are links only; no Reddit text is copied onto the site.

All of this lives in `data/previews.js`. **Write descriptions and consensus lines in your own words.** Don't paste text from Broadway.com, reviews or other sites: that's their copyrighted writing. Link to it instead. To add critics for another show, find its BroadwayWorld "Review Roundup" article, count the verdicts, note the average score, and add a `critics` entry.

## Run dates (Now playing / In previews / Upcoming)

`data/schedule.js` holds each show's first preview, opening night and closing date, taken from Wikipedia's Broadway theater table and Broadway.com's Off-Broadway guide. The status is worked out from today's date, so shows move from Upcoming to In previews to Now playing on their own, and disappear after their final performance. If a show has no dates, the site estimates its status and labels it "Status estimated" in the preview. Add dates there as shows are announced.

- **Closing soon**: within 30 days of the final performance, a show gets a "⏳ Closing soon · Nov 22" ribbon on its card, which turns red as "Final week" in the last 7 days. It also gets a banner on its show page and in the preview, plus a "Closing soon" option in the When filter. The price calendar marks dates after the final show as "Closed".
- **Opening night**: within 7 days of opening, a show gets a "🎉 Opens Wed 18!" ribbon, a confetti banner on its show page and in the preview (a dark "Opening night tonight!" version on the day itself), a 🎉 on the opening date in the calendar, and an "Opening this week" filter option.
- Shows that haven't started yet only list real performance dates. If none fall in the next 14 days, the page says when the show opens.

## View from my seat

Show pages link to [A View From My Seat](https://aviewfrommyseat.com/) for the show's theater: a button under the seat map, plus a link on each offer row. Every theater names its sections differently (the Lyric's mezzanine is the "Dress Circle", and the Ambassador splits its center into "LC" and "RC"), so `data/seatviews.js` maps TheaterMax's Orchestra / Mezzanine / Balcony to each theater's real center section, like "📷 View from Front Mezzanine C". Eight theaters are mapped so far (Gershwin, Richard Rodgers, Minskoff, Lyric, Neil Simon, Shubert, Ambassador and Walter Kerr). Any other theater's link says "Seat views at this theater" and opens its overview page. To add a theater, copy the section names from its `/sections/` page on A View From My Seat. Their policy says their user photos may only be used to promote A View From My Seat, so TheaterMax **links** to their pages and never copies or embeds the photos. Theater names live in `data/shows.js` (`TM_THEATERS`). Update them when shows move.

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
data/codes.js     verified discount codes (with expiry dates)
data/rush.js      AUTO-GENERATED weekly: lottery / rush / student deals from bwayrush.com
data/programs.js  student & young-audience programs (theater, opera, ballet)
data/extra-shows.js  shows not on Broadway.com (e.g. New York City Center)
data/seatviews.js A View From My Seat level pages for each mapped theater
data/live-prices.js  AUTO-GENERATED every 6h: real prices per performance
scripts/update-shows.mjs              the show-list scraper
scripts/update-prices.mjs             the SeatGeek + Ticketmaster price fetcher
.github/workflows/update-shows.yml    runs the scraper daily
.github/workflows/update-prices.yml   runs the price fetcher every 6 hours
scripts/update-rush.mjs               the bwayrush lottery & rush scraper
.github/workflows/update-rush.yml     runs it every Monday
data/sources.js   the ticket sources, from the discount guide
```

## Ideas for what to build next

- **Real data**: replace `buildOffers()` in `app.js` with real listings. Affiliate programs (SeatGeek, TodayTix, Ticketmaster) are the usual way to get them, and they also pay a commission.
- **Real price alerts**: add a small backend (Supabase, Firebase) that saves alerts and sends emails.
- **More theater**: add Off-Broadway, touring shows and regional theaters.
- **Price history**: show charts so people know when to buy.
