// Student & young-audience programs run by theater, opera and ballet companies (not tied to one show).
// Sources (facts summarized in our own words; newest wins when they disagree):
//   bwayrush.com (weekly) · Playbill student guide, Sept 11, 2026 · Field Trip NYC "30 under 30" list, Mar 7, 2026
// Prices and rules change — each entry links to the company's site.
// art: "theater" | "opera" | "ballet"   slugs: shows it applies to right now (Broadway.com slugs)

window.TM_PROGRAMS_SOURCES = [
  { label: "Playbill student discount guide (Sept 2026)", url: "https://playbill.com/article/how-to-get-discounted-broadway-tickets-as-a-student" },
  { label: "Field Trip NYC: 30-under-30 programs (Mar 2026)", url: "https://fieldtripnyc.club/extra-credit/post/30-under-30-theater-programs-nyc-cheap-tickets" },
  { label: "bwayrush.com (weekly)", url: "https://bwayrush.com/" },
];

window.TM_PROGRAMS = [
  { art: "theater", company: "Lincoln Center Theater", scene: "broadway", url: "https://www.lct.org/linctix/",
    where: "Vivian Beaumont Theater", slugs: ["a-few-good-men", "the-sound-of-music"],
    deals: [
      { name: "LincTix", price: "$35.50", who: "Ages 18–35", how: "Free sign-up at lct.org; one ticket per production; +fee online. Valid at the Beaumont, Newhouse and Claire Tow" },
      { name: "Student rush", price: "$32", who: "Students", how: "Box office, 2 hours before curtain; 1 per ID" },
    ] },
  { art: "theater", company: "Manhattan Theatre Club", scene: "broadway", url: "https://www.manhattantheatreclub.com/",
    where: "Samuel J. Friedman Theatre", slugs: ["school-girls-or-african-mean-girls-play", "awake-and-sing", "montauk"],
    deals: [
      { name: "MTC35", price: "$35", who: "Ages 35 and under", how: "Free membership; dates emailed to members; limit 2" },
    ] },
  { art: "theater", company: "Roundabout Theatre Company", scene: "broadway", url: "https://www.roundabouttheatre.org/get-tickets/hiptix/",
    where: "Todd Haimes Theatre & Studio 54", slugs: ["the-imaginary-invalid", "the-rocky-horror-show", "mix-and-master"],
    deals: [
      { name: "Hiptix", price: "$30", who: "Ages 18–40", how: "Free registration; one pair per production" },
      { name: "Hiptix High", price: "$10", who: "Ages 14–18", how: "Free registration; one pair per production" },
      { name: "Student rush", price: "50% off", who: "Full-time students", how: "Box office, 30 minutes before curtain; 1 per ID" },
    ] },
  { art: "theater", company: "Second Stage Theater", scene: "broadway", url: "https://2st.com/visit/rush-30-under-30",
    where: "Hayes Theater", slugs: ["the-fantasticks"],
    deals: [
      { name: "Student rush", price: "$25", who: "Students", how: "Box office, 1 hour before curtain, when not sold out; limit 2" },
      { name: "30 Under 30", price: "$30", who: "Ages 30 and under", how: "Phone, online or box office; limit 2" },
    ] },
  { art: "theater", company: "MCC Theater", scene: "off", url: "https://mcctheater.org/",
    where: "Robert W. Wilson MCC Theater Space, 511 W. 52nd St.",
    deals: [
      { name: "Student rush", price: "$25", who: "Students", how: "Box office, 2 hours before curtain; 1 per ID" },
    ] },
  { art: "theater", company: "New York City Center", scene: "off", url: "https://www.nycitycenter.org/",
    where: "131 W. 55th St.", slugs: ["citycenter-in-the-heights", "citycenter-charlie-brown", "citycenter-let-em-eat-cake", "citycenter-kiss-of-the-spider-woman"],
    deals: [
      { name: "Access Club", price: "$28", who: "Ages 40 and under", how: "Free sign-up; fees included; availability varies by show" },
      { name: "Student rush", price: "$23", who: "Students", how: "Box office on the day, with student ID; max 2" },
    ] },
  { art: "theater", company: "Atlantic Theater Company", scene: "off", url: "https://atlantictheater.org/",
    where: "Linda Gross Theater, 336 W. 20th St.",
    deals: [
      { name: "Student rush", price: "$20", who: "Students", how: "Box office, from 2 hours before curtain; cash only; 1 per ID" },
      { name: "Access25", price: "$25", who: "Any age", how: "Select tickets for every show" },
    ] },
  { art: "theater", company: "Classic Stage Company", scene: "off", url: "https://www.classicstage.org/",
    where: "136 E. 13th St.",
    deals: [
      { name: "Student rush", price: "$25", who: "Students", how: "Box office, 1 hour before curtain; cash only" },
      { name: "Future Classic previews", price: "$40", who: "Ages 40 and under", how: "Code Classic40 online for select preview tickets; limit 2" },
    ] },
  { art: "theater", company: "Playwrights Horizons", scene: "off", url: "https://www.playwrightshorizons.org/",
    where: "416 W. 42nd St.",
    deals: [
      { name: "Young membership", price: "$30–$39", who: "Ages 35 and under", how: "Free membership; plus one discounted guest ticket per show" },
    ] },
  { art: "theater", company: "Signature Theatre", scene: "off", url: "https://www.signaturetheatre.org/",
    deals: [ { name: "Sig30", price: "$30", who: "Ages 35 and under", how: "Sign up on Signature's website" } ] },
  { art: "theater", company: "Theatre for a New Audience", scene: "off", url: "https://www.tfana.org/",
    deals: [ { name: "New Deal", price: "$20", who: "Ages 30 and under", how: "Sign up on TFANA's website" } ] },
  { art: "theater", company: "PAC NYC", scene: "off", url: "https://pacnyc.org/",
    deals: [ { name: "Under 30", price: "$30", who: "Under 30", how: "Sign up on PAC NYC's website" } ] },
  { art: "theater", company: "Vineyard Theatre", scene: "off", url: "https://www.vineyardtheatre.org/",
    deals: [ { name: "Under 40", price: "$20", who: "Under 40", how: "Sign up on the Vineyard's website" } ] },
  { art: "theater", company: "Irish Repertory Theatre", scene: "off", url: "https://irishrep.org/",
    deals: [ { name: "GreenSeats", price: "$25", who: "Under 40", how: "Sign up on Irish Rep's website" } ] },

  // ---- Opera ----
  { art: "opera", company: "Metropolitan Opera", scene: "arts", url: "https://www.metopera.org/",
    where: "Lincoln Center", slugs: ["met-la-boheme", "met-medea", "met-tosca", "met-jenufa", "met-samson-et-dalila", "met-maria-stuarda", "met-magic-flute", "met-fanciulla", "met-silent-night", "met-aida"],
    deals: [ { name: "Under 40 Fridays", price: "$50+", who: "Under 40", how: "Select Friday performances" },
             { name: "TDF membership", price: "Varies", who: "TDF members", how: "The Met is in TDF's Show Finder; member seats come and go, so check the listing.", url: "https://www.tdf.org/shows/15566/the-metropolitan-opera/" } ] },

  // ---- Ballet ----
  { art: "ballet", company: "New York City Ballet", scene: "arts", url: "https://www.nycballet.com/",
    where: "David H. Koch Theater, Lincoln Center", slugs: ["nycb-nutcracker", "nycb-winter-2027", "nycb-spring-2027"],
    deals: [ { name: "$30 for 30", price: "$30", who: "Ages 30 and under", how: "Sign up on NYCB's website" },
             { name: "TDF membership", price: "Varies", who: "TDF members", how: "NYCB seasons are listed in TDF's Show Finder; member seats come and go, so check each season's listing.", url: "https://www.tdf.org/membership" } ] },
];
