/** Der Swipe-Stapel: Drag-Stempel, die drei Aktionsbuttons, die Karte, der leere Stapel. */
export const swipe = {
  /**
   * Stempel, die beim Ziehen auf der Karte erscheinen. „Like“ und „Nope“ sind das
   * Vokabular des Genres und bleiben in beiden Sprachen englisch; „Vielleicht“ nicht.
   */
  hint: {
    like: "Like",
    nope: "Nope",
    maybe: "Vielleicht",
  },
  /** Screenreader-Beschriftungen der Buttons unter dem Stapel, die nur ein Icon zeigen. */
  actions: {
    discard: "Verwerfen",
    maybe: "Vielleicht",
    like: "Like",
    undo: "Letzte Entscheidung rückgängig machen",
  },
  card: {
    remaining: "noch {count}",
    openOn: "Auf {provider} öffnen ↗",
  },
  empty: {
    title: "Stack durch!",
    sorted: {
      one: "{count} Listing sortiert. Neue Angebote erscheinen hier automatisch.",
      other: "{count} Listings sortiert. Neue Angebote erscheinen hier automatisch.",
    },
    nothing: "Aktuell gibt es nichts zu bewerten. Neue Angebote erscheinen hier automatisch.",
    viewShortlist: "Shortlist ansehen",
  },
};
