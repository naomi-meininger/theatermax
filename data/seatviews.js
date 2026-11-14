// "View from this section" links → A View From My Seat section pages.
// Every theater names its sections differently, so each one is mapped by hand from the theater's
// own section list on aviewfrommyseat.com (checked Nov 13, 2026). We link to the CENTER section
// of each level, which usually has the most photos.
//
//   orch / mezz / balc = TheaterMax's Orchestra / Mezzanine / Balcony rows
//
// Theaters not listed here link to the theater's overview page instead (labeled honestly).
// To add one: open https://aviewfrommyseat.com/venue/<Theater+Name>/sections/ and copy the names.

window.TM_SEATVIEWS = {
  "Gershwin Theatre":        { orch: "Orchestra C", mezz: "Front Mezzanine C", balc: "Rear Mezzanine C" },
  "Richard Rodgers Theatre": { orch: "Orchestra C", mezz: "Front Mezzanine C", balc: "Rear Mezzanine C" },
  "Minskoff Theatre":        { orch: "Orchestra C", mezz: "Mezzanine",         balc: "Mezzanine" },          // one upper level
  "Lyric Theatre":           { orch: "Orchestra L", mezz: "Dress Circle C",    balc: "Balcony C" },          // no center orchestra aisle
  "Neil Simon Theatre":      { orch: "Orchestra C", mezz: "Front Mezzanine C", balc: "Mezzanine C" },        // rear level is called "Mezzanine"
  "Shubert Theatre":         { orch: "Orchestra C", mezz: "Mezzanine C",       balc: "Balcony C" },
  "Ambassador Theatre":      { orch: "Orchestra C", mezz: "Front Mezzanine RC", balc: "Rear Mezzanine RC" }, // split center: LC / RC
  "Walter Kerr Theatre":     { orch: "Orchestra C", mezz: "Mezzanine C",       balc: "Balcony L" },          // balcony has L / R only
};
