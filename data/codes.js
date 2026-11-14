// Verified discount codes. Each one was copied from the offer page linked in `url`.
// Keys are Broadway.com slugs. Expired codes hide themselves automatically (by `expires`).
//
//   code       the exact code to enter at checkout
//   expires    last day the code works (YYYY-MM-DD)
//   from       lowest discounted ticket price
//   to         highest discounted price (optional)
//   regular    regular price range, for the "save" line (optional)
//   feesIncl   true if `from` already includes fees
//   source     where the code comes from
//   url        the offer page (also used to buy / see details)
//
// Only add codes you've seen on the offer page yourself — a wrong code fails at checkout.
// Good places to look: https://playbill.com/discount and https://www.broadwaybox.com

window.TM_CODES = {
  "six": [
    { code: "SIXPB", expires: "2026-11-22", from: 67, regular: "$89.75", feesIncl: true, source: "Playbill",
      url: "https://playbill.com/discount/playbill-discount-for-six-the-musical",
      details: "Select performances. Also works in person at the Lena Horne Theatre box office." },
  ],
  "play-goes-wrong-beginning-february-11-2019": [
    { code: "PYPBL25", expires: "2027-01-31", from: 104, regular: "$138", feesIncl: true, source: "Playbill",
      url: "https://playbill.com/discount/playbill-discount-for-the-play-that-goes-wrong",
      details: "$92 if you buy at the New World Stages box office." },
  ],
  "the-fantasticks": [
    { code: "FanBill2ST", expires: "2026-11-15", from: 59, to: 199, regular: "$79–$229", feesIncl: true, source: "Playbill",
      url: "https://playbill.com/discount/playbill-discount-for-the-fantasticks" },
  ],
  "two-strangers-carry-a-cake-across-new-york": [
    { code: "TSPLAY", expires: "2026-11-22", from: 49, to: 229, regular: "$59–$229", feesIncl: false, source: "Playbill",
      url: "https://playbill.com/discount/playbill-discount-for-two-strangers-carry-a-cake-across-new-york" },
  ],
  "the-visitors": [
    { code: "VisiBill2ST", expires: "2026-12-06", from: 45, to: 85, regular: "$75–$105", feesIncl: true, source: "Playbill",
      url: "https://playbill.com/discount/playbill-discount-for-the-visitors" },
  ],
};
