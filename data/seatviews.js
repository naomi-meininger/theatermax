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
  "Ambassador Theatre":      { orch: [1, "Orchestra"], mezz: [2, "Front Mezzanine"], balc: [3, "Rear Mezzanine"] },
  "Walter Kerr Theatre":     { orch: [1, "Orchestra"], mezz: [2, "Mezzanine"],       balc: [3, "Balcony"] },
};
