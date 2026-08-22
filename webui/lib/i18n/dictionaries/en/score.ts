/**
 * Score explanations. `lib/score.ts` emits keys plus variables instead of finished
 * sentences, so the same computation reads correctly in every language.
 */
export const score = {
  title: "Why this score",
  reason: {
    singleRoomFloor: "Single room in a shared flat — not suitable for moving in together",
    priceCheap: "Affordable: {amount} € per person",
    priceInBudget: "Within budget: {amount} € per person",
    priceSlightlyOver: "Slightly over: {amount} € per person",
    priceOverBudget: "Over budget: {amount} € per person",
    priceUnknown: "Price unknown",
    distanceCentral: "Close to the centre ({km} km)",
    distanceOuter: "Outskirts ({km} km)",
    distanceSurrounding: "Surrounding area ({km} km)",
    distanceFar: "Far out ({km} km)",
    distanceUnknown: "Distance unknown",
    roomsIdeal: "{rooms} rooms (one each plus a living room)",
    roomsOk: "{rooms} rooms (exactly enough)",
    roomsTight: "Only {rooms} rooms (tight)",
    roomsUnknown: "Room count unknown",
    sqmGood: "{sqm} m² per person",
    sqmOk: "{sqm} m² per person",
    sqmTight: "Only {sqm} m² per person — cramped",
    sizeUnknown: "Size unknown",
  },
  stars: "{count} out of 5 stars",
};
