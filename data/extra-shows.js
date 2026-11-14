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
  // ---- Opera & ballet (scene "arts"). Repertory companies: dates are each production's run;
  //      performances rotate, so the show page links to the company's own calendar. ----
  { slug: "met-la-boheme", title: "La Bohème (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Puccini's story of young artists in love and in poverty in Paris, in Franco Zeffirelli's famously lavish staging, with several casts across the season." },
  { slug: "met-medea", title: "Medea (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Cherubini's rarely staged Greek tragedy of a betrayed woman's revenge, starring Sonya Yoncheva." },
  { slug: "met-tosca", title: "Tosca (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Puccini's thriller about a singer, a painter and a ruthless police chief in 1800 Rome, in runs this November, January and May." },
  { slug: "met-jenufa", title: "Jenůfa (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Janáček's village drama in a Claus Guth production new to the Met, starring Asmik Grigorian and Nina Stemme." },
  { slug: "met-samson-et-dalila", title: "Samson et Dalila (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Saint-Saëns's biblical epic of seduction and betrayal, in Darko Tresnjak's production." },
  { slug: "met-maria-stuarda", title: "Maria Stuarda (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Donizetti's bel canto drama of Mary, Queen of Scots, and Elizabeth I, with Lisette Oropesa." },
  { slug: "met-magic-flute", title: "The Magic Flute: Holiday Presentation (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "The Met's family-friendly holiday version of Mozart's fairy-tale opera: abridged, sung in English, with Julie Taymor's puppets." },
  { slug: "met-fanciulla", title: "La Fanciulla del West (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Puccini's Gold Rush western in a new-to-the-Met Richard Jones production, with Sondra Radvanovsky as saloon owner Minnie." },
  { slug: "met-silent-night", title: "Silent Night (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Kevin Puts's Pulitzer-winning opera about the 1914 Christmas truce, in its Met premiere." },
  { slug: "met-aida", title: "Aida (The Met)", scene: "arts", type: "Opera", theater: "Metropolitan Opera House", tickets: "https://www.metopera.org/season/tickets/",
    blurb: "Verdi's grand opera of an enslaved Ethiopian princess torn between love and country, with Angel Blue among the leads." },
  { slug: "nycb-nutcracker", title: "George Balanchine's The Nutcracker (NYC Ballet)", scene: "arts", type: "Ballet", theater: "David H. Koch Theater", tickets: "https://www.nycballet.com/",
    blurb: "New York City Ballet's holiday classic, first staged in 1954, with the company, its orchestra and students of the School of American Ballet." },
  { slug: "nycb-winter-2027", title: "New York City Ballet: Winter Season", scene: "arts", type: "Ballet", theater: "David H. Koch Theater", tickets: "https://www.nycballet.com/",
    blurb: "Mixed repertory and full-length ballets, including Balanchine's Jewels for its 60th anniversary." },
  { slug: "nycb-spring-2027", title: "New York City Ballet: Spring Season", scene: "arts", type: "Ballet", theater: "David H. Koch Theater", tickets: "https://www.nycballet.com/",
    blurb: "The company's spring repertory season, with world premieres and Alexei Ratmansky's Romeo & Juliet among the season's highlights." },
];
