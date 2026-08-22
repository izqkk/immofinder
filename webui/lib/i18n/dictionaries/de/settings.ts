/**
 * Der Einstellungs-Screen. Die Beschreibungstexte sind zugleich die Dokumentation des
 * Bewertungsmodells in der App — sie erklären, warum es einen Regler gibt, nicht nur,
 * wie er heißt.
 */
export const settings = {
  title: "Einstellungen",
  subtitle:
    "Wirkt auf Score, Swipe, Listen & Suche. Speichern gilt für alle drei Bereiche gemeinsam.",

  /** Platzhalter für Zahlenfelder, in denen 0 „keine Grenze“ bedeutet. */
  off: "aus",

  tabs: {
    scoring: "Bewertung",
    filters: "Filter",
    display: "Anzeige",
  },

  origin: {
    title: "Startort",
    description:
      "Adresse, von der aus die Distanz jedes Inserats berechnet wird. Ohne Koordinaten gilt das Ziel, gegen das Fredy die Distanzen bereits berechnet hat.",
    address: "Adresse",
    placeholder: "Straße, PLZ, Ort",
    lookup: "Suchen",
    coordsSet: "Koordinaten gesetzt: {lat}, {lng}",
    coordsFound: "✓ {name} ({lat}, {lng})",
    found: "Startort gefunden — Speichern nicht vergessen",
    errors: {
      empty: "Bitte erst eine Adresse eingeben",
      notFound: "Adresse nicht gefunden",
    },
  },

  scoring: {
    intro:
      "Bestimmt, wie jedes Inserat zu seiner Sternebewertung kommt — aus Preis, Distanz, Zimmern und Fläche im Verhältnis zu euren Zielen.",

    goals: {
      title: "Ziele & Personen",
      description: "Wer sucht, und wonach optimiert wird.",
      household: "WG-Größe",
      sharedRoomMode: {
        label: "WG-Zimmer-Modus",
        hint: "Sucht ein einzelnes Zimmer in einer WG statt einer ganzen Wohnung: Einzelzimmer werden nicht mehr ausgeblendet oder abgestraft, und das Scoring ignoriert die Zimmeranzahl.",
      },
      voterCount: "Personen in der WG",
      targets: "Ziel-Werte",
      budget: "Budget-Ziel (€/Monat, warm)",
      distance: "Distanz-Ziel (km)",
    },

    weights: {
      title: "Score-Gewichte",
      description:
        "Relative Gewichte der vier Score-Komponenten. Sie müssen nicht auf 100 summieren — eine Komponente ohne Daten (etwa ein Inserat ohne Preis) bleibt neutral, die übrigen füllen ihren Anteil auf. 0 schaltet eine Komponente ab.",
      main: "Hauptgewichte",
      price: "Preis/Person",
      distance: "Distanz",
      rooms: "Zimmer",
      size: "Größe",
    },

    advanced: {
      toggle: "Erweitertes Score-Tuning",

      budgetTolerance: {
        heading: "Budget-Toleranz",
        label: "Budget-Toleranz (%)",
        hint: "Wie weit über dem Budget-Ziel es noch Punkte gibt (Standard 25 %).",
      },

      roomTiers: {
        heading: "Zimmer-Stufen (% der vollen Punktzahl)",
        ideal: "≥ Personen + 1",
        ok: "= Personen",
        tight: "darunter",
      },

      sqm: {
        heading: "Größe pro Person",
        goodThreshold: "„Großzügig“ ab (m²/Person)",
        okThreshold: "„Okay“ ab (m²/Person)",
        good: "Großzügig",
        ok: "Okay",
        tight: "Eng",
      },

      special: {
        heading: "Sonderfälle",
        neutral: {
          label: "Score ohne Daten (%)",
          hint: "Der Composite-Score, wenn Preis, Distanz, Zimmer und Fläche alle fehlen.",
        },
        maxRooms: {
          label: "Max. plausible Zimmer",
          hint: "Höhere Werte gelten als Parser-Fehler, die Zimmerzahl zählt dann als unbekannt.",
        },
        singleRoomFloor: {
          label: "Einzelzimmer auf 1★ abwerten",
          hint: "Inserate, deren Titel nach einem einzelnen WG-Zimmer klingt, bekommen fix einen Stern (im WG-Zimmer-Modus ohne Wirkung). Die Erkennungsbegriffe stehen im Filter-Tab.",
        },
      },
    },
  },

  filters: {
    intro:
      "Blendet passende Inserate hart aus jeder Ansicht aus — Listen, Swipe und Dashboard — statt sie nur schlecht zu bewerten.",

    hard: {
      title: "Harte Filter",
      description:
        "0 oder leer = aus. Über die Suche („Gelöschte anzeigen“) bleiben gefilterte Inserate auffindbar. Inserate mit unbekannten Werten bleiben sichtbar — außer die Schalter unter „Unbekannte Werte“ sagen etwas anderes.",
      price: "Preis",
      minPrice: "min. Preis (€)",
      maxPrice: "max. Preis (€)",
      roomsAndSize: "Zimmer & Größe",
      minRooms: "min. Zimmer",
      maxRooms: "max. Zimmer",
      minSize: "min. Größe (m²)",
      maxSize: "max. Größe (m²)",
      minSqmPerPerson: {
        label: "Min. m²/Person",
        hint: "Wohnfläche geteilt durch die Anzahl der Personen.",
      },
      ageAndDistance: "Alter & Entfernung",
      maxAgeDays: {
        label: "Max. Alter (Tage)",
        hint: "Ältere Inserate ausblenden.",
      },
      maxDistance: "Max. Distanz (km, hart)",
      providers: "Provider (leer = alle)",
    },

    keywords: {
      title: "Keywords",
      description: "Komma-getrennte Begriffe; Groß-/Kleinschreibung egal.",
      exclude: {
        heading: "Ausschluss",
        label: "Ausschluss-Keywords",
        placeholder: "z.B. tausch, zwangsversteigerung",
        hint: "Treffer in Titel oder Beschreibung blenden das Inserat aus.",
        inAddress: {
          label: "Ausschluss-Keywords auch in der Adresse suchen",
          hint: "Prüft die Begriffe oben zusätzlich gegen die Adresse des Inserats.",
        },
        addressLabel: "Adress-Ausschluss",
        addressPlaceholder: "z.B. Stadtteil, Nachbarort",
        addressHint:
          "Begriffe, die nur gegen die Adresse geprüft werden — praktisch, um ganze Stadtteile oder Orte auszuschließen.",
      },
      require: {
        heading: "Pflicht",
        label: "Pflicht-Keywords",
        placeholder: "leer = aus",
        hint: "Zeigt nur Inserate, die mindestens einen der Begriffe in Titel oder Beschreibung enthalten.",
      },
    },

    singleRoom: {
      title: "Einzelzimmer",
      description:
        "Erkennung von Inseraten, die ein einzelnes Zimmer in einer WG statt einer ganzen Wohnung anbieten (im WG-Zimmer-Modus ohne Wirkung).",
      detection: "Erkennung",
      hideOneRoom: {
        label: "1-Zimmer-Angebote ausblenden",
        hint: "Filtert alles mit Zimmerzahl 1 raus.",
      },
      hideByTitle: {
        label: "Einzelzimmer per Titel-Erkennung ausblenden",
        hint: "Blendet Inserate hart aus, deren Titel nach Einzelzimmer klingt (Begriffe unten).",
      },
      terms: "Begriffe",
      patternsLabel: "Erkennungsbegriffe",
      patternsHint:
        "Komma- oder zeilengetrennt. Bindestrich und Leerzeichen zwischen Wortteilen sind beim Matching austauschbar („wg-zimmer“ findet auch „WG Zimmer“ und „WGZimmer“). Wird vom Titel-Filter oben und von der 1★-Abwertung genutzt.",
    },

    unknown: {
      title: "Unbekannte Werte",
      description:
        "Standardmäßig bleiben Inserate ohne Angabe sichtbar — fehlende Daten zählen als neutral. Diese Schalter blenden sie stattdessen aus.",
      price: {
        label: "Ohne Preis ausblenden",
        hint: "Inserate ohne Preisangabe verschwinden aus allen Ansichten.",
      },
      rooms: {
        label: "Ohne Zimmerzahl ausblenden",
        hint: "Inserate ohne Zimmerangabe verschwinden aus allen Ansichten.",
      },
      size: {
        label: "Ohne Fläche ausblenden",
        hint: "Inserate ohne Flächenangabe verschwinden aus allen Ansichten.",
      },
      distance: {
        label: "Ohne Distanz ausblenden",
        hint: "Inserate ohne berechenbare Distanz zum Startort verschwinden aus allen Ansichten.",
      },
    },
  },

  display: {
    intro:
      "Steuert Darstellung und Reihenfolge der Ergebnisse — Schwellen, Sortierung, Hervorhebungen und das Swipe-Deck.",

    highlights: {
      title: "Highlights",
      description: "Hebt passende Inserate mit goldenem Rahmen und Badge hervor.",
      label: "Highlight-Keywords",
      placeholder: "z.B. Balkon, Altbau, Garten",
      hint: "Komma-getrennt.",
    },

    thresholds: {
      title: "Schwellen & Listen",
      description:
        "Stern-Schwellen für „Gut“ und „Schwach“, Umfang der Dashboard-Auswahl und Standard-Sortierung.",
      heading: "Stern-Schwellen",
      good: "„Gut“ ab (★)",
      weak: "„Schwach“ bis (★)",
      dashboardTopN: "Top-Empfehlungen im Dashboard (Anzahl)",
    },

    sort: {
      heading: "Sortierung",
      label: "Standard-Sortierung",
    },

    deck: {
      title: "Swipe-Deck & Technik",
      heading: "Deck",
      size: "Deck-Größe (Karten)",
      order: "Deck-Reihenfolge",
      options: {
        score: "Beste zuerst",
        newest: "Neueste zuerst",
      },
    },

    data: {
      heading: "Datenbasis",
      loadLimit: {
        label: "Lade-Limit (Inserate)",
        hint: "Wie viele der neuesten aktiven Inserate aus der Fredy-DB betrachtet werden — für Listen, Suche und Verfügbarkeits-Check.",
      },
    },
  },
};
