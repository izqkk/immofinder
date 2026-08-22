/** Die Filterleiste über den Listen — Panel auf dem Desktop, Sheet auf dem Handy. */
export const filters = {
  title: "Filter",
  titleWithCount: "Filter ({count})",
  apply: "Anzeigen",
  updating: "Aktualisiere …",
  /** Kurz genug, damit er auf schmalen Displays nicht mitten im Wort abgeschnitten
   *  wird — der volle Satz steht im aria-label des Feldes. */
  searchPlaceholder: "Suchen …",
  searchLabel: "Titel, Beschreibung oder Adresse durchsuchen",
  /** Platzhalter eines leeren Zahlenfeldes — ein Halbgeviertstrich, kein Wort. */
  anyValue: "–",

  price: {
    min: "Preis min",
    max: "Preis max",
  },
  rooms: {
    min: "Zimmer min",
    max: "Zimmer max",
  },
  maxDistance: "Max. km",
  minScore: "Mindest-Score",
  provider: "Portal",

  sort: {
    label: "Sortierung",
    score: "Beste Bewertung",
    newest: "Neueste zuerst",
    priceAsc: "Preis aufsteigend",
    priceDesc: "Preis absteigend",
    distance: "Nächste zuerst",
  },

  highlightsOnly: "Nur Highlights",
  showDeleted: {
    label: "Gelöschte anzeigen",
    hint: "inkl. ausgefilterter Inserate",
  },
};
