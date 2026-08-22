export const actions = {
  /** Prüfung einer eingefügten Portal-Such-Adresse (Assistent auf /scrape). */
  searchUrl: {
    unknownProvider: "Portal nicht erkannt — bitte die Adresse einer Suchergebnis-Seite einfügen.",
    notAUrl: "Das ist keine gültige Web-Adresse.",
    notASearchPage:
      "Diese IS24-Adresse ist keine Suchergebnis-Seite. Bitte auf IS24 suchen und die Adresse der Ergebnisliste einfügen.",
    unknownSearchType:
      "Diese IS24-Adresse kennt ImmoFinder nicht (Suchart „{type}“). Bitte eine normale Miet- oder Kaufsuche verwenden.",
    missingShape:
      "Dieser IS24-Adresse fehlt der Umriss der gezeichneten Suche (Parameter „shape“).",
    rejectedSorting:
      "Diese Adresse wird vom Portal abgelehnt (Parameter „sorting={value}“ wird von der IS24-Schnittstelle nicht unterstützt). Bitte „sorting“ aus der Adresse entfernen — die Sortierung übernimmt ImmoFinder selbst.",
    rejectedPriceType:
      "Diese Adresse wird vom Portal abgelehnt (Parameter „pricetype=calculatedtotalrent“ ist bei „haus-mieten“ nicht erlaubt). Bitte „pricetype“ aus der Adresse entfernen.",
    rejected412:
      "Diese Adresse wird vom Portal abgelehnt (HTTP 412 — ein Suchparameter wird nicht unterstützt). Bitte die Suche auf IS24 mit Standard-Sortierung neu aufbauen und die Adresse erneut kopieren.",
    unreachable: "Das Portal war nicht erreichbar — bitte gleich noch einmal probieren.",
    httpErrorImmoscout:
      "Das Portal antwortet auf diese Adresse mit HTTP {status}. Bitte die Suche auf IS24 neu aufbauen und die Adresse der Ergebnisliste kopieren.",
    httpError:
      "Das Portal antwortet auf diese Adresse mit HTTP {status}. Bitte die Adresse einer Suchergebnis-Seite einfügen.",
    unparsableResponse: "Das Portal hat eine unverständliche Antwort geschickt.",
  },
};
