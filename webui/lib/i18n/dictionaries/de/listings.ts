/**
 * Die Listing-Liste, die Karten darin und die Detailseite dahinter.
 * `back.*` wird per Schlüssel aus `lib/back-link.ts` angesprochen — dort gibt es
 * keinen Übersetzer, also liefert die Funktion einen Schlüssel statt eines Satzes.
 */
export const listings = {
  title: "Listings",
  gone: "Nicht mehr verfügbar",

  tabs: {
    shortlist: "Shortlist",
    maybe: "Vielleicht",
    all: "Alle",
    discarded: "Verworfen",
  },

  back: {
    toSearch: "Zurück zur Suche",
    toListings: "Zurück zu Listings",
    shortlist: "Zurück zur Shortlist",
    maybe: "Zurück zu Vielleicht",
    all: "Zurück zu Alle",
    discarded: "Zurück zu Verworfen",
  },

  empty: {
    shortlist: "Noch nichts auf der Shortlist. Starte den Swipe-Modus.",
    maybe: "Noch keine „Vielleicht“-Entscheidungen.",
    all: "Keine Listings für die aktuellen Filter.",
    discarded: "Noch nichts verworfen.",
  },

  /** Shortlist und Vielleicht trennen offene Inserate von bereits kontaktierten. */
  sections: {
    toContact: "Noch nicht kontaktiert ({count})",
    contacted: "Kontaktiert ({count})",
  },

  card: {
    open: "Öffnen ↗",
    /** Google-Maps-Link auf der Adresszeile — öffnet die ÖPNV-Route. */
    directions: "Fahrt mit Bahn/ÖPNV von hier zum Startort in Google Maps öffnen",
  },

  contact: {
    badge: "Kontaktiert",
    done: "Kontaktiert ✓",
    ask: "Kontaktiert?",
    mark: "Als kontaktiert markieren",
    unmark: "Als nicht kontaktiert markieren",
    on: "kontaktiert am {date}",
  },

  select: {
    start: "Auswählen",
    end: "Auswahl beenden",
    item: "Listing auswählen",
    count: "{count} ausgewählt",
    allShort: "Alle",
    all: "Alle auswählen ({count})",
    clear: "Auswahl aufheben",
    deleted: {
      one: "{count} gelöscht",
      other: "{count} gelöscht",
    },
  },

  actions: {
    unDiscard: "Zurückholen",
  },

  detail: {
    deletedNotice: "Dieses Listing ist gelöscht und in den normalen Listen ausgeblendet.",
    unknownAddress: "Adresse unbekannt",
    openOn: "Auf {portal} öffnen ↗",
    addedAgo: "vor {age}",
    description: "Beschreibung",
    delete: "Listing löschen",
  },
};
