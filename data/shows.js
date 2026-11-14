// SAMPLE DATA — prices, lottery/rush details and availability are made up for the prototype.
// Replace with real data (affiliate feeds, partner APIs, or your own updates) before launch.
//
// demand: 0..1 — how close to selling out (affects base prices and whether TKTS/TDF carry it)
// official: which official seller the show uses

window.TM_SHOWS = [
  { slug: "hamilton", title: "Hamilton", theater: "Richard Rodgers Theatre", type: "Musical", runtime: "2h 45m", basePrice: 189, demand: 0.92, official: "Ticketmaster", colors: ["#1b1b1b", "#c9a227"],
    lottery: { price: 10, where: "Hamilton app", when: "Opens 2 days before" }, rush: null },
  { slug: "wicked", title: "Wicked", theater: "Gershwin Theatre", type: "Musical", runtime: "2h 45m", basePrice: 159, demand: 0.85, official: "Ticketmaster", colors: ["#123d2a", "#7fd36b"],
    lottery: { price: 59, where: "Broadway Direct", when: "Opens 2 days before" }, rush: { price: 59, where: "Box office", when: "10 AM day of" } },
  { slug: "the-lion-king", title: "The Lion King", theater: "Minskoff Theatre", type: "Musical", runtime: "2h 30m", basePrice: 149, demand: 0.8, official: "Ticketmaster", colors: ["#7a2e0e", "#f2a33a"],
    lottery: { price: 45, where: "Lucky Seat", when: "Opens 2 days before" }, rush: null },
  { slug: "hadestown", title: "Hadestown", theater: "Walter Kerr Theatre", type: "Musical", runtime: "2h 30m", basePrice: 129, demand: 0.6, official: "Telecharge", colors: ["#3a1f14", "#d98f3e"],
    lottery: { price: 49, where: "Lucky Seat", when: "Opens 1 day before" }, rush: { price: 49, where: "TodayTix", when: "10 AM day of" } },
  { slug: "chicago", title: "Chicago", theater: "Ambassador Theatre", type: "Musical", runtime: "2h 30m", basePrice: 99, demand: 0.4, official: "Telecharge", colors: ["#111111", "#e23b3b"],
    lottery: null, rush: { price: 49, where: "Box office", when: "Box office opening" } },
  { slug: "aladdin", title: "Aladdin", theater: "New Amsterdam Theatre", type: "Musical", runtime: "2h 30m", basePrice: 119, demand: 0.55, official: "Ticketmaster", colors: ["#1d2d6b", "#e6b54a"],
    lottery: { price: 35, where: "Broadway Direct", when: "Opens 2 days before" }, rush: null },
  { slug: "mj", title: "MJ", theater: "Neil Simon Theatre", type: "Musical", runtime: "2h 30m", basePrice: 119, demand: 0.5, official: "Ticketmaster", colors: ["#0e0e0e", "#d6d6d6"],
    lottery: { price: 39, where: "Broadway Direct", when: "Opens 2 days before" }, rush: { price: 39, where: "TodayTix", when: "9 AM day of" } },
  { slug: "moulin-rouge", title: "Moulin Rouge!", theater: "Al Hirschfeld Theatre", type: "Musical", runtime: "2h 35m", basePrice: 139, demand: 0.58, official: "Telecharge", colors: ["#5c0b1f", "#ff4f6d"],
    lottery: { price: 39, where: "Lucky Seat", when: "Opens 1 day before" }, rush: { price: 45, where: "TodayTix", when: "10 AM day of" } },
  { slug: "the-great-gatsby", title: "The Great Gatsby", theater: "Broadway Theatre", type: "Musical", runtime: "2h 30m", basePrice: 109, demand: 0.35, official: "Telecharge", colors: ["#0d2a3a", "#d4b26a"],
    lottery: { price: 45, where: "Lucky Seat", when: "Opens 1 day before" }, rush: { price: 45, where: "TodayTix", when: "10 AM day of" } },
  { slug: "death-becomes-her", title: "Death Becomes Her", theater: "Lunt-Fontanne Theatre", type: "Musical", runtime: "2h 25m", basePrice: 139, demand: 0.7, official: "Ticketmaster", colors: ["#1a0f2e", "#b48cff"],
    lottery: { price: 45, where: "Broadway Direct", when: "Opens 2 days before" }, rush: { price: 45, where: "Box office", when: "10 AM day of" } },
  { slug: "maybe-happy-ending", title: "Maybe Happy Ending", theater: "Belasco Theatre", type: "Musical", runtime: "1h 45m", basePrice: 119, demand: 0.65, official: "Telecharge", colors: ["#0f3b3a", "#9ee6d4"],
    lottery: { price: 40, where: "TodayTix", when: "Opens 1 day before" }, rush: { price: 40, where: "TodayTix", when: "10 AM day of" } },
  { slug: "oh-mary", title: "Oh, Mary!", theater: "Lyceum Theatre", type: "Play", runtime: "1h 20m", basePrice: 129, demand: 0.75, official: "Telecharge", colors: ["#2b0f0f", "#f0e6d2"],
    lottery: { price: 45, where: "TodayTix", when: "Opens 1 day before" }, rush: null },
];
