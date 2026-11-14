// Shows that aren't on Broadway.com's listings but belong on TheaterMax.
// Added by hand; merged into the show list by app.js. Dates also go in data/schedule.js.
//   scene: "broadway" | "off"     tickets: where to buy (shown instead of a Broadway.com link)

window.TM_EXTRA_SHOWS = [
  // ---- New York City Center (counted as Off-Broadway) ----
  { slug: "citycenter-in-the-heights", title: "In the Heights", scene: "off", type: "Musical", theater: "New York City Center",
    tickets: "https://www.nycitycenter.org/events/2026-2027-in-the-heights",
    blurb: "Lin-Manuel Miranda and Quiara Alegría Hudes's Tony-winning musical about a Washington Heights bodega owner and his neighbors, in a new City Center production directed by David Mendizábal." },
  { slug: "citycenter-charlie-brown", title: "You're a Good Man, Charlie Brown (Encores!)", scene: "off", type: "Musical", theater: "New York City Center",
    tickets: "https://www.nycitycenter.org/",
    blurb: "The Peanuts musical, with David Hyde Pierce, Danielle Brooks and Ayo Edebiri, directed by Sam Pinkleton with the original 1967 orchestrations. Part of City Center's 2027 Encores! series of classic musicals in limited runs." },
  // Hallelujah, Baby! was postponed to a future Encores! season; Let 'Em Eat Cake took its slot.
  { slug: "citycenter-let-em-eat-cake", title: "Let 'Em Eat Cake (Encores!)", scene: "off", type: "Musical", theater: "New York City Center",
    tickets: "https://www.nycitycenter.org/",
    blurb: "George and Ira Gershwin's 1933 political satire, the sequel to Of Thee I Sing, in a rare revival for City Center's 2027 Encores! series." },
  { slug: "citycenter-kiss-of-the-spider-woman", title: "Kiss of the Spider Woman (Encores!)", scene: "off", type: "Musical", theater: "New York City Center",
    tickets: "https://www.nycitycenter.org/",
    blurb: "Kander and Ebb's musical about two cellmates in a Latin American prison, revived in City Center's 2027 Encores! series." },
];
