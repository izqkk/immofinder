/**
 * German score explanations. `lib/score.ts` emits keys plus variables rather than
 * finished sentences, so one computation reads correctly in every language.
 */
export const score = {
  title: "Warum dieser Score",
  reason: {
    singleRoomFloor: "Einzelzimmer / WG-Zimmer — nicht für gemeinsamen Einzug geeignet",
    priceCheap: "Günstig: {amount} € pro Person",
    priceInBudget: "Im Budget: {amount} € pro Person",
    priceSlightlyOver: "Knapp drüber: {amount} € pro Person",
    priceOverBudget: "Über Budget: {amount} € pro Person",
    priceUnknown: "Preis unbekannt",
    distanceCentral: "Stadtnah ({km} km)",
    distanceOuter: "Stadtrand ({km} km)",
    distanceSurrounding: "Umland ({km} km)",
    distanceFar: "Weit weg ({km} km)",
    distanceUnknown: "Distanz unbekannt",
    roomsIdeal: "{rooms} Zimmer (alle haben eines + Wohnraum)",
    roomsOk: "{rooms} Zimmer (genau passend)",
    roomsTight: "Nur {rooms} Zimmer (knapp)",
    roomsUnknown: "Zimmerzahl unbekannt",
    sqmGood: "{sqm} m² pro Person",
    sqmOk: "{sqm} m² pro Person",
    sqmTight: "Nur {sqm} m² pro Person — eng",
    sizeUnknown: "Größe unbekannt",
  },
  stars: "{count} von 5 Sternen",
};
