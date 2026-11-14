// Run dates used for the "Now playing / In previews / Upcoming" filter.
// Keys are Broadway.com slugs. Dates are YYYY-MM-DD (or YYYY-MM / YYYY when only that is known).
//   previews: first preview   opening: opening night   closing: final performance (omit if open-ended)
//   nowOpen: true  — known to be running, exact opening date not recorded
// If "previews" is missing, previews are assumed to start ~4 weeks before an exact opening date.
//
// Sources (checked Nov 13, 2026): Wikipedia "Broadway theatre" current-productions table and
// show articles; Broadway.com's "Best Off-Broadway Shows" guide. Update as dates are announced.
//
// Shows NOT listed here get a best guess in app.js (runInfo), marked "Status estimated":
// no tickets on sale → Upcoming; Off-Broadway with tickets → Now playing;
// Broadway with tickets and 10+ audience reviews → Now playing; otherwise → Upcoming.

window.TM_SCHEDULE = {
  // ---- Broadway: long-running / open-ended ----
  "chicago":                                { opening: "1996-11-14" },
  "the-lion-king":                          { opening: "1997-11-13" },
  "wicked":                                 { opening: "2003-10-30" },
  "book-mormon":                            { opening: "2011-03-24" },
  "aladdin-broadway":                       { opening: "2014-03-20" },
  "hamilton-broadway":                      { opening: "2015-08-06" },
  "harry-potter-and-cursed-child-broadway": { opening: "2018-04-22" },
  "hadestown":                              { opening: "2019-04-17" },
  "six":                                    { opening: "2021-10-03", closing: "2027-01-03" },
  "mj":                                     { opening: "2022-02-01" },
  "juliet":                                 { opening: "2022-11-17", closing: "2027-01-03" },
  "the-outsiders":                          { opening: "2024-04-11" },
  "the-great-gatsby":                       { opening: "2024-04-25" },
  "oh-mary":                                { opening: "2024-07-11" },
  "maybe-happy-ending":                     { opening: "2024-11-12" },
  "buena-vista-social-club":                { opening: "2025-03-19", closing: "2027-01-17" },
  "operation-mincemeat":                    { opening: "2025-03-20" },
  "stranger-things-the-first-shadow":       { opening: "2025-04-22", closing: "2027-01-03" },
  "just-in-time":                           { opening: "2025-04-26" },
  "two-strangers-carry-a-cake-across-new-york": { opening: "2025-11-20", closing: "2026-11-29" },
  "schmigadoon":                            { opening: "2026-04-20", closing: "2027-04-04" },
  "the-rocky-horror-show":                  { opening: "2026-04-23", closing: "2027-05-30" },
  "the-lost-boys-a-new-musical":            { opening: "2026-04-26" },

  // ---- Broadway: current limited runs ----
  "paranormal-activity":                    { opening: "2026-08-25", closing: "2027-02-28" },
  "school-girls-or-african-mean-girls-play":{ previews: "2026-09-08", opening: "2026-09-28", closing: "2026-11-15" },
  "other-desert-cities":                    { opening: "2026-10-18", closing: "2027-01-17" },
  "860":                                    { opening: "2026-10-21", closing: "2027-02-14" },
  "the-imaginary-invalid":                  { opening: "2026-10-22", closing: "2026-11-22" },
  "a-few-good-men":                         { opening: "2026-10-29", closing: "2027-01-10" },
  "wanted":                                 { opening: "2026-11-08" },
  "here-there-are-blueberries":             { opening: "2026-11-09", closing: "2027-01-10" },
  "now-you-see-me-live":                    { opening: "2026-11-11", closing: "2027-01-03" },

  // ---- Broadway: in previews / opening soon ----
  "downstate":                              { previews: "2026-10-17", opening: "2026-11-15", closing: "2027-01-10" },
  "the-fantasticks":                        { opening: "2026-11-16", closing: "2027-02-07" },
  "blue-man-group-a-new-holiday-surprise":  { opening: "2026-11-17", closing: "2027-01-03" },
  "its-a-wonderful-life":                   { previews: "2026-11-04", opening: "2026-11-18", closing: "2027-01-03" },
  "much-ado-about-nothing":                 { opening: "2026-11-19", closing: "2027-01-10" },
  "inter-alia":                             { opening: "2026-12-01", closing: "2027-02-21" },
  "galileo":                                { opening: "2026-12-06" },

  // ---- Broadway: upcoming ----
  "dolly":                                  { opening: "2027-01-19" },
  "the-amish-project":                      { opening: "2027-02" },
  "purple-rain":                            { previews: "2027-03-12", opening: "2027-04-12" },
  "paddington":                             { opening: "2027-04" },
  "evita":                                  { opening: "2027" },

  // ---- Off-Broadway ---- (nowOpen: listed as "Now Open" in Broadway.com's Off-Broadway guide)
  "midnight":                               { opening: "2026-10-15", closing: "2026-11-08" },
  "the-heart":                              { opening: "2026-10-29", closing: "2026-12-06" },
  "gazillion-bubble-show":                  { nowOpen: true, closing: "2027-01-18" },
  "masquerade":                             { nowOpen: true },
  "little-shop-horrors":                    { nowOpen: true },
  "play-goes-wrong-beginning-february-11-2019": { nowOpen: true },
  "jamie-allans-amaze":                     { nowOpen: true },
  "perfect-crime":                          { nowOpen: true },

  // ---- New York City Center (Off-Broadway) ----
  "citycenter-in-the-heights":           { opening: "2026-10-28", closing: "2026-11-15" },
  // Encores! runs are short; the first performance is the opening.
  "citycenter-charlie-brown":            { previews: "2027-02-03", opening: "2027-02-03", closing: "2027-02-14" },
  "citycenter-let-em-eat-cake":          { previews: "2027-03-17", opening: "2027-03-17", closing: "2027-03-28" },
  "citycenter-kiss-of-the-spider-woman": { previews: "2027-04-28", opening: "2027-04-28", closing: "2027-05-09" },
  "the-sound-of-music":                  { previews: "2027-03-23", opening: "2027-04-15", closing: "2027-07-18" },
};
