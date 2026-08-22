/** Full-database search — the only view that also shows filtered-out listings. */
export const search = {
  title: "Suche & Filter",
  intro: "Durchsucht die komplette Datenbank — inklusive ausgefilterter Inserate.",
  hits: {
    one: "{count} Treffer",
    other: "{count} Treffer",
  },
  /** Appended after the hit count while the list is still paginated. */
  shown: "— {count} angezeigt",
  empty: "Keine Treffer für die aktuellen Filter.",
  showMore: "Mehr anzeigen ({count} weitere)",
  /** Pill laid over the card image when a listing has been deleted. */
  statusDeleted: "Gelöscht",
};
