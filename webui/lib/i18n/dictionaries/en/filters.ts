/** The filter bar above the listing lists — inline panel on desktop, sheet on mobile. */
export const filters = {
  title: "Filters",
  titleWithCount: "Filters ({count})",
  apply: "Show results",
  updating: "Updating …",
  /** Short enough not to be clipped mid-word on narrow phones; the full sentence
   *  lives in the input's aria-label. */
  searchPlaceholder: "Search …",
  searchLabel: "Search titles, descriptions and addresses",
  /** Placeholder of an empty number field — an en dash, not a word. */
  anyValue: "–",

  price: {
    min: "Price from",
    max: "Price to",
  },
  rooms: {
    min: "Rooms from",
    max: "Rooms to",
  },
  maxDistance: "Max. km",
  minScore: "Min. score",
  provider: "Portal",

  sort: {
    label: "Sort by",
    score: "Best score",
    newest: "Newest first",
    priceAsc: "Price, low to high",
    priceDesc: "Price, high to low",
    distance: "Closest first",
  },

  highlightsOnly: "Highlights only",
  showDeleted: {
    label: "Show deleted",
    hint: "including filtered-out listings",
  },
};
