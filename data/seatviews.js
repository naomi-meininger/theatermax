// "View from my seat" links → A View From My Seat LEVEL pages, e.g.
//   https://aviewfrommyseat.com/venue/Shubert+Theatre/level/2/Mezzanine/
// A level page shows audience photos from the whole level (left, center and right sections).
//
// Each theater numbers and names its levels differently, so every theater is mapped by hand:
// the level number is the level's position in the theater's "Jump to:" list on its
// /venue/<Theater+Name>/sections/ page (Orchestra = 1, and so on; boxes count as levels).
// Checked on aviewfrommyseat.com, Nov 13, 2026.
//
//   orch / mezz / balc = TheaterMax's Orchestra / Mezzanine / Balcony rows → [level number, level name]
//
// Theaters not listed here link to the theater's overview page (labeled honestly).

window.TM_SEATVIEWS = {
  "Gershwin Theatre":        { orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Richard Rodgers Theatre": { orch: [1, "Orchestra"], mezz: [4, "Front Mezzanine"], balc: [5, "Upper Mezzanine"] }, // 2–3 are box levels
  "Minskoff Theatre":        { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [2, "Mezzanine"] },       // one upper level
  "Lyric Theatre":           { orch: [1, "Orchestra"], mezz: [2, "Dress Circle"],    balc: [3, "Balcony"] },
  "Neil Simon Theatre":      { orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Mezzanine"] },       // rear level is called "Mezzanine"
  "Shubert Theatre":         { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [3, "Balcony"] },
  "Ambassador Theatre":      { box: "Box ", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Walter Kerr Theatre":     { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [3, "Balcony"] },
  // venue: the name A View From My Seat uses, when it differs from the official one.
  "Samuel J. Friedman Theatre": { orch: [1, "Orchestra"], mezz: [3, "Mezzanine"],       balc: [3, "Mezzanine"] },
  "Belasco Theatre":         { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [3, "Balcony"] },
  "Bernard B. Jacobs Theatre": { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],     balc: [2, "Mezzanine"] },
  "Broadway Theatre":        { venue: "Broadway Theatre - 53rd Street", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Lyceum Theatre":          { venue: "Lyceum Theatre, Broadway", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [3, "Balcony"] },
  "New Amsterdam Theatre":   { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [3, "Balcony"] },
  "Eugene O'Neill Theatre":  { box: "Boxes Left", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [2, "Mezzanine"] },       // two levels
  "John Golden Theatre":     { orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Lena Horne Theatre":      { box: "Left Box A", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Stephen Sondheim Theatre": { box: "Left Box", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],      balc: [2, "Mezzanine"] },       // two levels
  "Marquis Theatre":         { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [2, "Mezzanine"] },       // two levels
  "Gerald Schoenfeld Theatre": { box: "Box B", orch: [1, "Orchestra"], mezz: [3, "Mezzanine"],     balc: [3, "Mezzanine"] },       // level 2 = boxes
  "Al Hirschfeld Theatre":   { orch: [2, "Orchestra"], mezz: [3, "Mezzanine"],       balc: [3, "Mezzanine"] },       // level 1 = Moulin Rouge "Can Can" tables
  "August Wilson Theatre":   { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [2, "Mezzanine"] },
  "Booth Theatre":           { box: "Right Boxes", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [2, "Mezzanine"] },
  "Broadhurst Theatre":      { box: "Right Boxes", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [2, "Mezzanine"] },
  "Ethel Barrymore Theatre": { venue: "Barrymore Theatre", box: "Box E", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Hayes Theater":           { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [2, "Mezzanine"] },
  "Hudson Theatre":          { orch: [1, "Orchestra"], mezz: [2, "Dress Circle"],    balc: [3, "Balcony"] },
  // One level wrapped around a thrust stage; level 2 is show-specific floor/table seating.
  "Circle in the Square Theatre": { orch: [1, "Orchestra"] },
  "Imperial Theatre":        { box: "Front Right Box", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "James Earl Jones Theatre": { box: "Mezzanine Box Left B", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [3, "Balcony"] },
  "Longacre Theatre":        { box: "Box B", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [3, "Balcony"] },
  "Lunt-Fontanne Theatre":   { venue: "Lunt-Fontanne theatre", box: "RBOXA", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Middle Mezzanine"] },
  "Majestic Theatre":        { box: "Box C", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Music Box Theatre":       { box: "Left Box A", orch: [1, "Orchestra"], mezz: [3, "Mezzanine"], balc: [3, "Mezzanine"] },       // level 2 = boxes
  "Nederlander Theatre":     { box: "Box E", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [2, "Mezzanine"] },
  "Palace Theatre":          { venue: "Palace Theatre, Broadway", box: "Mezzanine Box R", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "St. James Theatre":       { box: "Mezzanine Box L", orch: [1, "Orchestra"], mezz: [2, "Mezzanine"], balc: [3, "Balcony"] },
  "Studio 54":               { orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Todd Haimes Theatre":     { box: "Right Box", orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [2, "Front Mezzanine"] },  // one mezzanine (rows A–G)
  "Vivian Beaumont Theater": { orch: [1, "Orchestra"], mezz: [2, "Loge"], balc: [2, "Loge"] },                                   // thrust stage; two levels
  "Winter Garden Theatre":   { box: "Box C", orch: [1, "Orchestra"], mezz: [3, "Mezzanine"], balc: [3, "Mezzanine"] },         // level 2 = boxes
};
