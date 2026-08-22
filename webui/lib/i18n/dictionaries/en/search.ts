/** Full-database search — the only view that also shows filtered-out listings. */
export const search = {
  title: "Search & filters",
  intro: "Searches the entire database — including listings hidden by filters.",
  hits: {
    one: "{count} hit",
    other: "{count} hits",
  },
  /** Appended after the hit count while the list is still paginated. */
  shown: "— {count} shown",
  empty: "No hits for the current filters.",
  showMore: "Show more ({count} more)",
  /** Pill laid over the card image when a listing has been deleted. */
  statusDeleted: "Deleted",
};
