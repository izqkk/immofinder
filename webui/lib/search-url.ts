// Detection and validation of portal search addresses (URLs) that a scrape job is
// built on. The ImmoScout translation from web URL to mobile API URL reimplements
// Fredy's `immoscout-web-translator.js` (deliberately kept as a standalone TS copy, so
// the web UI stays independent of the Fredy checkout).
//
// Nothing here returns a finished sentence: every failure comes back as a dictionary
// key under `actions.searchUrl.*` plus the values its placeholders need, so the client
// can render it in the visitor's language.

import { PROVIDER_LABELS } from "./providers";

export type SearchProvider = "immoscout" | "immowelt" | "kleinanzeigen" | "wgGesucht";

// Existing importers (e.g. `app/actions.ts`) still source the labels from here.
export { PROVIDER_LABELS };

const HOST_PROVIDERS: { suffix: string; provider: SearchProvider }[] = [
  { suffix: "immobilienscout24.de", provider: "immoscout" },
  { suffix: "immowelt.de", provider: "immowelt" },
  { suffix: "kleinanzeigen.de", provider: "kleinanzeigen" },
  { suffix: "ebay-kleinanzeigen.de", provider: "kleinanzeigen" },
  { suffix: "wg-gesucht.de", provider: "wgGesucht" },
];

function parseUrl(url: string): URL | null {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

/** Detect the portal from the host name. Unknown or broken URLs → null. */
export function detectProvider(url: string): SearchProvider | null {
  const u = parseUrl(url);
  if (!u) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  for (const { suffix, provider } of HOST_PROVIDERS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return provider;
  }
  return null;
}

// --- suggested job name ----------------------------------------------------

const CITY_SPELLING: Record<string, string> = {
  muenchen: "München",
  koeln: "Köln",
  nuernberg: "Nürnberg",
  duesseldorf: "Düsseldorf",
  wuerzburg: "Würzburg",
  osnabrueck: "Osnabrück",
  saarbruecken: "Saarbrücken",
  luebeck: "Lübeck",
  goettingen: "Göttingen",
};

function prettyCity(raw: string): string {
  const slug = raw.toLowerCase().replace(/[_+]/g, "-").trim();
  if (CITY_SPELLING[slug]) return CITY_SPELLING[slug];
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

/** Derive the city from the search address, as far as it is recognisable there. */
export function deriveCity(url: string): string | null {
  const u = parseUrl(url);
  if (!u) return null;
  const provider = detectProvider(url);
  const segments = u.pathname.split("/").filter(Boolean);

  if (provider === "immoscout") {
    const center = u.searchParams.get("centerofsearchaddress");
    if (center) {
      const city = decodeURIComponent(center).split(";")[0]?.trim();
      if (city) return prettyCity(city);
    }
    // /Suche/de/bayern/muenchen/wohnung-mieten → second-to-last segment
    if (segments[0] === "Suche" && segments.length >= 3) {
      const candidate = segments[segments.length - 2];
      if (candidate && candidate !== "de" && candidate !== "radius" && candidate !== "shape") {
        return prettyCity(candidate);
      }
    }
    return null;
  }

  if (provider === "kleinanzeigen") {
    // /s-wohnung-mieten/muenchen/c203l6411
    const candidate = segments.find(
      (s) => !s.startsWith("s-") && !/^c\d/.test(s) && !/^k\d/.test(s) && s !== "s",
    );
    return candidate ? prettyCity(candidate) : null;
  }

  if (provider === "wgGesucht") {
    // /wg-zimmer-in-Muenchen.90.0.1.0.html
    const m = u.pathname.match(/-in-([^./]+)/);
    return m ? prettyCity(m[1]) : null;
  }

  return null;
}

/** Suggested name for the job, e.g. “IS24 Berlin”. */
export function suggestJobName(url: string): string | null {
  const provider = detectProvider(url);
  if (!provider) return null;
  const city = deriveCity(url);
  return city ? `${PROVIDER_LABELS[provider]} ${city}` : PROVIDER_LABELS[provider];
}

// --- ImmoScout: web URL → mobile API URL -----------------------------------

const PARAM_NAMES = new Set([
  "heatingtypes",
  "haspromotion",
  "numberofrooms",
  "livingspace",
  "energyefficiencyclasses",
  "exclusioncriteria",
  "equipment",
  "petsallowedtypes",
  "price",
  "constructionyear",
  "apartmenttypes",
  "buildingtypes",
  "ground",
  "pricetype",
  "floor",
  "geocodes",
  "geocoordinates",
  "shape",
  "sorting",
  "newbuilding",
  "fulltext",
]);

const EQUIPMENT_MAP: Record<string, string> = {
  parking: "parking",
  cellar: "cellar",
  builtinkitchen: "builtInKitchen",
  lift: "lift",
  garden: "garden",
  guesttoilet: "guestToilet",
  balcony: "balcony",
  handicappedaccessible: "handicappedAccessible",
  lodgerflat: "lodgerflat",
};

const REAL_ESTATE_TYPE: Record<string, string> = {
  "haus-mieten": "houserent",
  "wohnung-mieten": "apartmentrent",
  "wohnung-kaufen": "apartmentbuy",
  "wohnung-kaufen-mit-balkon": "apartmentbuy",
  "eigentumswohnung-mit-garten": "apartmentbuy",
  "haus-kaufen": "housebuy",
  "haus-mit-keller-kaufen": "housebuy",
  "luxushaus-kaufen": "housebuy",
  "villa-kaufen": "housebuy",
  "neubauhaus-kaufen": "housebuy",
};

const WEB_PATH_EXTRAS: Record<string, Record<string, string[] | string>> = {
  "wohnung-mit-balkon-mieten": { equipment: ["balcony"] },
  "wohnung-kaufen-mit-balkon": { equipment: ["balcony"] },
  "wohnung-mit-garten-mieten": { equipment: ["garden"] },
  "eigentumswohnung-mit-garten": { equipment: ["garden"] },
  "souterrainwohnung-mieten": { apartmenttypes: ["halfbasement"] },
  "erdgeschosswohnung-mieten": { apartmenttypes: ["groundfloor"] },
  "hochparterrewohnung-mieten": { apartmenttypes: ["raisedgroundfloor"] },
  "etagenwohnung-mieten": { apartmenttypes: ["apartment"] },
  "loft-mieten": { apartmenttypes: ["loft"] },
  "maisonette-mieten": { apartmenttypes: ["maisonette"] },
  "terrassenwohnung-mieten": { apartmenttypes: ["terracedflat"] },
  "penthouse-mieten": { apartmenttypes: ["penthouse"] },
  "dachgeschosswohnung-mieten": { apartmenttypes: ["roofstorey"] },
  "wohnung-mit-garage-mieten": { equipment: ["parking"] },
  "wohnung-mit-einbaukueche-mieten": { equipment: ["builtinkitchen"] },
  "wohnung-mit-keller-mieten": { equipment: ["cellar"] },
  "neubauwohnung-mieten": { newbuilding: "true" },
  "barrierefreie-wohnung-mieten": { equipment: ["handicappedaccessible"] },
};

/** Sort values the mobile API accepts. It answers anything else with HTTP 412. */
const ACCEPTED_SORTINGS = new Set(["standard", "firstactivation", "-firstactivation"]);

/**
 * A message the UI still has to translate: `reason` is a dictionary key (always under
 * `actions.searchUrl.*`), `reasonVars` fills its `{placeholder}` slots. Callers render
 * it with `t.raw(reason, reasonVars)`.
 */
export type SearchUrlMessage = {
  reason: string;
  reasonVars?: Record<string, string | number>;
};

export type TranslateResult =
  | { ok: true; url: string; realEstateType: string }
  | ({ ok: false } & SearchUrlMessage);

/**
 * Mirrors Fredy's `convertWebToMobile`: turns an IS24 web search address into the
 * mobile API address that Fredy actually queries while scraping.
 */
export function immoscoutWebToMobile(webUrl: string): TranslateResult {
  const u = parseUrl(webUrl);
  if (!u) return { ok: false, reason: "actions.searchUrl.notAUrl" };

  const segments = u.pathname.split("/");
  if (segments[1] !== "Suche") {
    return { ok: false, reason: "actions.searchUrl.notASearchPage" };
  }

  const typeKey = segments[segments.length - 1];
  let realType = REAL_ESTATE_TYPE[typeKey];
  const extras = WEB_PATH_EXTRAS[typeKey] ?? null;
  if (!realType) {
    if (extras) realType = REAL_ESTATE_TYPE["wohnung-mieten"];
    else
      return {
        ok: false,
        reason: "actions.searchUrl.unknownSearchType",
        reasonVars: { type: typeKey },
      };
  }

  const isRadius = segments.includes("radius");
  const isShape = segments.includes("shape");
  const params = new Map<string, string>();
  params.set("searchType", isRadius ? "radius" : isShape ? "shape" : "region");
  params.set("realestatetype", realType);
  if (!isRadius && !isShape) {
    params.set("geocodes", `/${segments.slice(2, segments.length - 1).join("/")}`);
  }

  const extraEquipment: string[] = [];
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (key === "equipment" && Array.isArray(value)) extraEquipment.push(...value);
      else params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
  }

  const webParams = new Map<string, string>();
  for (const [key, value] of u.searchParams.entries()) {
    if (key === "enteredFrom" || !PARAM_NAMES.has(key)) continue;
    if (value.trim() === "") continue;
    webParams.set(key, value);
  }

  if (isShape) {
    const shape = webParams.get("shape");
    if (!shape) {
      return { ok: false, reason: "actions.searchUrl.missingShape" };
    }
    const normalized = shape.replace(/\.\./g, "==").replace(/\./g, "=");
    const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
    params.set("shape", new TextDecoder().decode(bytes));
  }

  for (const [key, value] of webParams.entries()) {
    if (key === "shape") continue;
    if (key === "equipment") {
      const items = value
        .split(",")
        .map((item) => EQUIPMENT_MAP[item.trim().toLowerCase()])
        .filter(Boolean);
      params.set("equipment", [...extraEquipment, ...items].join(","));
    } else {
      params.set(key, value);
    }
  }
  if (extraEquipment.length > 0 && !params.has("equipment")) {
    params.set("equipment", extraEquipment.join(","));
  }

  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (value === "") continue;
    query.set(key, value);
  }
  return {
    ok: true,
    url: `https://api.mobile.immobilienscout24.de/search/list?${query.toString()}`,
    realEstateType: realType,
  };
}

/**
 * Parameters the IS24 mobile API rejects with HTTP 412. Exactly these cases crippled
 * the scraping here for weeks without anyone noticing, which is why they are reported
 * before a job is created — naming the offending parameter and how to fix it.
 */
export function findRejectedImmoscoutParam(webUrl: string): SearchUrlMessage | null {
  const u = parseUrl(webUrl);
  if (!u) return null;

  const sorting = u.searchParams.get("sorting");
  if (sorting != null && sorting.trim() !== "" && !ACCEPTED_SORTINGS.has(sorting.trim())) {
    return {
      reason: "actions.searchUrl.rejectedSorting",
      reasonVars: { value: sorting.trim() },
    };
  }

  const isHouseRent = u.pathname.split("/").pop() === "haus-mieten";
  const priceType = u.searchParams.get("pricetype");
  if (isHouseRent && priceType?.trim().toLowerCase() === "calculatedtotalrent") {
    return { reason: "actions.searchUrl.rejectedPriceType" };
  }

  return null;
}

/** Key for an HTTP 412 whose cause we could not pin down. */
export const IMMOSCOUT_412_FALLBACK_KEY = "actions.searchUrl.rejected412";

export const UNKNOWN_PROVIDER_KEY = "actions.searchUrl.unknownProvider";
