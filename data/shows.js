// Extra details layered on top of the live show list (data/live-shows.js).
// Keys are Broadway.com slugs (the part after /shows/ in the show's URL).
//
// ⚠️ lottery / rush entries are SAMPLE data for the prototype — real policies change often.
// Check https://bwayrush.com/ and update these by hand (or build a second scraper later).

window.TM_EXTRAS = {
  "hamilton-broadway":  { lottery: { price: 10, where: "Hamilton app", when: "Opens 2 days before" } },
  "wicked":             { lottery: { price: 59, where: "Broadway Direct", when: "Opens 2 days before" }, rush: { price: 59, where: "Box office", when: "10 AM day of" } },
  "the-lion-king":      { lottery: { price: 45, where: "Lucky Seat", when: "Opens 2 days before" } },
  "hadestown":          { lottery: { price: 49, where: "Lucky Seat", when: "Opens 1 day before" }, rush: { price: 49, where: "TodayTix", when: "10 AM day of" } },
  "chicago":            { rush: { price: 49, where: "Box office", when: "Box office opening" } },
  "aladdin-broadway":   { lottery: { price: 35, where: "Broadway Direct", when: "Opens 2 days before" } },
  "mj":                 { lottery: { price: 39, where: "Broadway Direct", when: "Opens 2 days before" }, rush: { price: 39, where: "TodayTix", when: "9 AM day of" } },
  "the-great-gatsby":   { lottery: { price: 45, where: "Lucky Seat", when: "Opens 1 day before" }, rush: { price: 45, where: "TodayTix", when: "10 AM day of" } },
  "maybe-happy-ending": { lottery: { price: 40, where: "TodayTix", when: "Opens 1 day before" }, rush: { price: 40, where: "TodayTix", when: "10 AM day of" } },
  "oh-mary":            { lottery: { price: 45, where: "TodayTix", when: "Opens 1 day before" } },
  "six":                { lottery: { price: 45, where: "Lucky Seat", when: "Opens 1 day before" }, rush: { price: 45, where: "TodayTix", when: "10 AM day of" } },
  "the-outsiders":      { lottery: { price: 45, where: "Lucky Seat", when: "Opens 1 day before" } },
  "juliet":             { lottery: { price: 45, where: "TodayTix", when: "Opens 1 day before" }, rush: { price: 45, where: "TodayTix", when: "10 AM day of" } },
  "book-mormon":        { lottery: { price: 39, where: "Lucky Seat", when: "Opens 2 days before" } },
  "operation-mincemeat":   { lottery: { price: 40, where: "TodayTix", when: "Opens 1 day before" } },
  "the-rocky-horror-show": { rush: { price: 45, where: "TodayTix", when: "10 AM day of" } },
};

// Shows Broadway.com files under "Plays". Everything else is labeled as a musical/other.
window.TM_PLAYS = [
  "harry-potter-and-cursed-child-broadway", "stranger-things-the-first-shadow", "other-desert-cities",
  "oh-mary", "paranormal-activity", "a-few-good-men", "much-ado-about-nothing", "inter-alia",
  "school-girls-or-african-mean-girls-play", "the-imaginary-invalid", "downstate",
];

// Which theater each show plays in (Broadway.com slug → theater name).
// Source: Wikipedia "Broadway theatre" current-productions table, checked Nov 13, 2026.
// Used for display and for "View from my seat" links. Update when shows move or close.
window.TM_THEATERS = {
  // long-running / open-ended
  "chicago": "Ambassador Theatre",
  "maybe-happy-ending": "Belasco Theatre",
  "the-outsiders": "Bernard B. Jacobs Theatre",
  "the-great-gatsby": "Broadway Theatre",
  "just-in-time": "Circle in the Square Theatre",
  "book-mormon": "Eugene O'Neill Theatre",
  "wicked": "Gershwin Theatre",
  "operation-mincemeat": "John Golden Theatre",
  "oh-mary": "Lyceum Theatre",
  "harry-potter-and-cursed-child-broadway": "Lyric Theatre",
  "the-lion-king": "Minskoff Theatre",
  "mj": "Neil Simon Theatre",
  "hamilton-broadway": "Richard Rodgers Theatre",
  "hadestown": "Walter Kerr Theatre",
  "aladdin-broadway": "New Amsterdam Theatre",
  "six": "Lena Horne Theatre",
  "juliet": "Stephen Sondheim Theatre",
  "stranger-things-the-first-shadow": "Marquis Theatre",
  "buena-vista-social-club": "Gerald Schoenfeld Theatre",
  "the-lost-boys-a-new-musical": "Palace Theatre",
  "schmigadoon": "Nederlander Theatre",
  "the-rocky-horror-show": "Studio 54",
  "two-strangers-carry-a-cake-across-new-york": "Longacre Theatre",
  // current limited runs / recent openings
  "now-you-see-me-live": "Al Hirschfeld Theatre",
  "paranormal-activity": "August Wilson Theatre",
  "downstate": "Booth Theatre",
  "its-a-wonderful-life": "Broadhurst Theatre",
  "warriors": "Lunt-Fontanne Theatre",
  "here-there-are-blueberries": "Ethel Barrymore Theatre",
  "the-fantasticks": "Hayes Theater",
  "other-desert-cities": "Hudson Theatre",
  "860": "Imperial Theatre",
  "wanted": "James Earl Jones Theatre",
  "blue-man-group-a-new-holiday-surprise": "Lunt-Fontanne Theatre",
  "inter-alia": "Music Box Theatre",
  "school-girls-or-african-mean-girls-play": "Samuel J. Friedman Theatre",
  "galileo": "Shubert Theatre",
  "the-imaginary-invalid": "Todd Haimes Theatre",
  "a-few-good-men": "Vivian Beaumont Theater",
  "much-ado-about-nothing": "Winter Garden Theatre",
  // announced, future
  "dolly": "St. James Theatre",
  "purple-rain": "Majestic Theatre",
  "paddington": "Al Hirschfeld Theatre",
  "evita": "Winter Garden Theatre",
  "the-amish-project": "Broadhurst Theatre",
};
