/** Startbildschirm: der Swipe-Aufruf, die vier Kennzahl-Kacheln, die Portal-Verteilung. */
export const dashboard = {
  hero: {
    unrated: {
      one: "{count} unbewertetes Listing",
      other: "{count} unbewertete Listings",
    },
    unratedHint: "Sortier sie per Swipe — Shortlist, Vielleicht oder weg.",
    allRated: "Alles bewertet",
    allRatedHint:
      "Keine offenen Listings. Starte eine neue Suche — neue Angebote landen automatisch im Swipe-Stapel.",
    startSwiping: "Swipen starten",
  },
  tiles: {
    unrated: "Unbewertet",
    // „Shortlist“ ist der eigene Begriff der App und bleibt in beiden Sprachen stehen.
    shortlist: "Shortlist",
    good: "Top-Angebote (ab {min})",
    newest: "Neuestes Angebot",
  },
  providers: {
    title: "Woher die Angebote kommen",
    empty: "Noch keine Angebote in der Datenbank.",
    /** Anteil eines Portals — im Deutschen mit schmalem Abstand vor dem Prozentzeichen. */
    share: "{percent} %",
  },
};
