import { expect, test } from "vitest";
import {
  detectProvider,
  findRejectedImmoscoutParam,
  immoscoutWebToMobile,
  suggestJobName,
} from "./search-url";

test("detects immoscout", () => {
  expect(
    detectProvider("https://www.immobilienscout24.de/Suche/de/bayern/nuernberg/wohnung-mieten"),
  ).toBe("immoscout");
});

test("detects kleinanzeigen", () => {
  expect(detectProvider("https://www.kleinanzeigen.de/s-wohnung-mieten/nuernberg/c203l6411")).toBe(
    "kleinanzeigen",
  );
});

test("detects wg-gesucht", () => {
  expect(detectProvider("https://www.wg-gesucht.de/wg-zimmer-in-Nuernberg.90.0.1.0.html")).toBe(
    "wgGesucht",
  );
});

test("detects immowelt", () => {
  expect(detectProvider("https://www.immowelt.de/classified-search?distributionTypes=Rent")).toBe(
    "immowelt",
  );
});

test("returns null for anything else", () => {
  expect(detectProvider("https://example.com/foo")).toBeNull();
});

test("returns null for garbage input", () => {
  expect(detectProvider("not even a url")).toBeNull();
});

test("translates an immoscout web search into the mobile api url", () => {
  const res = immoscoutWebToMobile(
    "https://www.immobilienscout24.de/Suche/de/bayern/nuernberg/wohnung-mieten?numberofrooms=3.0-10000.0&price=-2500.0&enteredFrom=result_list",
  );
  expect(res.ok).toBe(true);
  if (!res.ok) return;
  const q = new URL(res.url).searchParams;
  expect(res.url.startsWith("https://api.mobile.immobilienscout24.de/search/list?")).toBe(true);
  expect(q.get("searchType")).toBe("region");
  expect(q.get("realestatetype")).toBe("apartmentrent");
  expect(q.get("geocodes")).toBe("/de/bayern/nuernberg");
  expect(q.get("numberofrooms")).toBe("3.0-10000.0");
  expect(q.get("price")).toBe("-2500.0");
  expect(q.get("enteredFrom")).toBeNull();
});

test("rejects immoscout urls that are not a search result page", () => {
  const res = immoscoutWebToMobile("https://www.immobilienscout24.de/expose/12345");
  expect(res.ok).toBe(false);
});

test("names the sorting parameter that immoscout answers with 412", () => {
  const msg = findRejectedImmoscoutParam(
    "https://www.immobilienscout24.de/Suche/de/bayern/nuernberg/wohnung-mieten?sorting=2",
  );
  expect(msg?.reason).toBe("actions.searchUrl.rejectedSorting");
  expect(msg?.reasonVars).toEqual({ value: "2" });
});

test("names pricetype on haus-mieten urls", () => {
  const msg = findRejectedImmoscoutParam(
    "https://www.immobilienscout24.de/Suche/de/bayern/nuernberg/haus-mieten?pricetype=calculatedtotalrent",
  );
  expect(msg?.reason).toBe("actions.searchUrl.rejectedPriceType");
});

test("accepts a clean immoscout url", () => {
  expect(
    findRejectedImmoscoutParam(
      "https://www.immobilienscout24.de/Suche/de/bayern/nuernberg/wohnung-mieten?pricetype=calculatedtotalrent",
    ),
  ).toBeNull();
});

test("suggests a job name from provider and city", () => {
  expect(
    suggestJobName("https://www.immobilienscout24.de/Suche/de/bayern/nuernberg/wohnung-mieten"),
  ).toBe("IS24 Nürnberg");
  expect(suggestJobName("https://www.wg-gesucht.de/wg-zimmer-in-Nuernberg.90.0.1.0.html")).toBe(
    "WG-Gesucht Nürnberg",
  );
  expect(suggestJobName("https://example.com/foo")).toBeNull();
});
