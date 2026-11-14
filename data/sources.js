// Ticket sources, adapted from "Naomi's Guide to Discount Broadway".
// Edit this file to add, remove or update a source — the Guide page reads from it.

window.TM_SOURCES = [
  {
    id: "official",
    name: "Official & Direct",
    subtitle: "Box Office / Telecharge / Broadway Direct",
    links: [
      { label: "telecharge.com", url: "https://www.telecharge.com" },
      { label: "broadwaydirect.com", url: "https://www.broadwaydirect.com" },
    ],
    what: "Buy straight from the show's official seller or the theater's box office. Legitimate seats, no third-party markup.",
    how: [
      "Find the show's authorized seller on its official website.",
      "Look for promo codes on Reddit, Playbill Offers or BroadwayBox — they often work on Telecharge.",
      "If you're near the theater, buy at the box office to skip online service fees.",
    ],
    tips: [
      "Official sources guarantee valid tickets — never buy from unverified resellers.",
      "Matinee and weekday performances often have lower base prices.",
      "Many theaters release same-day or partial-view seats in person for less.",
      "Telecharge's “Offers” pages carry legit discounts (typically 30–50% off).",
    ],
    discount: "0–50%", sameDay: true, online: true, bestFor: "Official tickets, no markups",
  },
  {
    id: "tdf",
    name: "TDF & TKTS",
    subtitle: "Membership & same-day booths",
    links: [
      { label: "tdf.org", url: "https://www.tdf.org" },
      { label: "TKTS booths", url: "https://www.tdf.org/nyc/7/TKTS-Discount-Booths" },
    ],
    what: "TDF membership gives eligible students, teachers and artists deeply discounted tickets. TKTS booths sell same-day or next-day seats at 20–50% off in Times Square, Lincoln Center and elsewhere.",
    how: [
      "For TDF, join online and buy through your member dashboard.",
      "For TKTS, check the official app for live listings, then buy at a booth.",
    ],
    tips: [
      "Arrive early for popular titles.",
      "Matinee lines are shorter and move quickly.",
      "TDF membership pays for itself after 1–2 uses.",
      "Usually only shows that aren't selling out — they discount to fill seats.",
    ],
    discount: "20–50%", sameDay: true, online: true, bestFor: "Same-day & member deals",
  },
  {
    id: "lottery",
    name: "Lottery & Rush",
    subtitle: "Telecharge / Broadway Direct / Lucky Seat / TodayTix / in-person",
    links: [
      { label: "Telecharge rush & lottery", url: "https://rush.telecharge.com/" },
      { label: "Broadway Direct lottery", url: "https://lottery.broadwaydirect.com/" },
      { label: "Lucky Seat", url: "https://www.luckyseat.com" },
      { label: "TodayTix", url: "https://www.todaytix.com" },
      { label: "All policies (bwayrush)", url: "https://bwayrush.com/" },
    ],
    what: "Same-day, low-cost tickets (usually $35–$49) through digital lotteries or in-person rush lines.",
    how: [
      "Enter digital lotteries 1–2 days before the show.",
      "Check whether a show has in-person rush; lines open when the box office does.",
      "Check whether your age group has special rush or lottery prices.",
      "Winners are notified by email or text and can usually buy up to two tickets.",
    ],
    tips: [
      "Enter several different shows' lotteries to improve your odds.",
      "Weekday performances have less competition.",
      "Bring ID for pickup — names often must match the entry.",
    ],
    discount: "Up to 70%", sameDay: true, online: true, bestFor: "Flexible, last-minute plans",
  },
  {
    id: "seatgeek",
    name: "SeatGeek",
    subtitle: "Official + verified resale marketplace",
    links: [{ label: "seatgeek.com", url: "https://www.seatgeek.com" }],
    what: "A marketplace used by several Broadway and touring shows, listing official and verified resale tickets.",
    how: [
      "Compare prices against the show's official site.",
      "Look for “verified resale” or “standard ticket” labels.",
    ],
    tips: [
      "Sort by Deal Score to find the best-value seats.",
      "Fees are sometimes lower than Ticketmaster or Telecharge.",
    ],
    discount: "Varies", sameDay: true, online: true, bestFor: "Verified resale bargains",
  },
  {
    id: "theatr",
    name: "Theatr",
    subtitle: "Fan-to-fan resale app (iPhone)",
    links: [
      { label: "App Store", url: "https://apps.apple.com/us/app/theatr-app/id1580002886" },
      { label: "theatr-app.com", url: "https://theatr-app.com/faq" },
    ],
    what: "A free iPhone app where New York theatergoers resell tickets they can't use. Every ticket is priced at or below what the seller paid, which makes it great for last-minute seats.",
    how: [
      "Download Theatr from the App Store (iPhone only).",
      "Browse last-minute listings, or set a price alert for a show.",
      "Buy in the app. The seller then transfers the tickets to you.",
    ],
    tips: [
      "Check the seller's proof of purchase and that the date, time and price match before you buy.",
      "Theatr holds your payment until after curtain, so you can dispute it if the tickets don't work.",
      "Have tickets you can't use? Selling is free.",
    ],
    discount: "Face value or less", sameDay: true, online: true, bestFor: "Last-minute fan resale",
  },
  {
    id: "todaytix",
    name: "TodayTix",
    subtitle: "Discount app with rush & lottery",
    links: [{ label: "todaytix.com", url: "https://www.todaytix.com" }],
    what: "A mobile app with discounted advance tickets, digital lotteries and same-day rush deals.",
    how: [
      "Browse by date, price or show.",
      "Use the Rush or Lottery tabs for exclusive low-price seats.",
      "Buy and pick up directly through the app.",
    ],
    tips: [
      "Many rushes open around 9–10 AM — set an alert.",
      "Prices are dynamic; check often for last-minute drops.",
    ],
    discount: "20–50%", sameDay: true, online: true, bestFor: "App-based ease",
  },
  {
    id: "comps",
    name: "Comps",
    subtitle: "Complimentary & seat-filler tickets",
    links: [{ label: "Show-Score", url: "https://www.show-score.com" }],
    what: "Free or deeply discounted seats for press, previews or industry members — often through audience services or word of mouth.",
    how: [
      "Join services like Show-Score or audience seat-filler programs.",
      "Respond quickly; comps are limited and first-come, first-served.",
    ],
    tips: [
      "Arrive early — comps may be general admission.",
      "Dress appropriately for press or preview events.",
    ],
    discount: "Free", sameDay: true, online: true, bestFor: "Industry previews",
  },
];
