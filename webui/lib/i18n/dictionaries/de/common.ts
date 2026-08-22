/**
 * German counterpart of `en/common.ts`. Same shape, same keys — the dictionary index
 * type-checks the two against each other.
 */
export const common = {
  appName: "ImmoFinder",
  save: "Speichern",
  saving: "Speichert…",
  saved: "Gespeichert",
  close: "Schließen",
  delete: "Löschen",
  restore: "Wiederherstellen",
  undo: "Rückgängig",
  reset: "Zurücksetzen",
  refresh: "Aktualisieren",
  more: "mehr anzeigen",
  less: "weniger anzeigen",
  none: "—",
  language: "Sprache",
  theme: {
    toggle: "Design wechseln",
  },
  time: {
    justNow: "gerade eben",
    minutes: "{count} Min",
    hours: "{count} Std",
    days: {
      one: "{count} Tag",
      other: "{count} Tage",
    },
  },
  /** Stand-ins for listing data the portal did not provide. */
  listing: {
    noImage: "kein Bild",
    untitled: "Ohne Titel",
    unknownPlace: "Lage unbekannt",
  },
  facts: {
    rooms: "Zimmer",
    size: "Größe",
    distance: "Distanz zum Ziel",
    added: "Eingespielt",
  },
  units: {
    sqm: "m²",
    km: "km",
    roomsShort: "Zi",
  },
  errors: {
    saveFailed: "Konnte nicht gespeichert werden.",
  },
};
