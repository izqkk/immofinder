import { expect, test } from "vitest";
import { buildMapsHref, hasRealCoords } from "./maps";
import { originFromSettings } from "./geo";
import { DEFAULTS } from "./settings";

const withCoords = {
  address: "Example Street 1, Berlin",
  latitude: 48.1351,
  longitude: 11.582,
};
const withoutCoords = { address: "12345 Testtown, Northside", latitude: null, longitude: null };

test("prefers coordinates over the address as destination", () => {
  const href = buildMapsHref(withCoords, null);
  expect(href).toBe("https://www.google.com/maps/search/?api=1&query=48.1351%2C11.582");
});

test("falls back to the address when coordinates are missing", () => {
  const href = buildMapsHref(withoutCoords, null);
  expect(href).toBe(
    "https://www.google.com/maps/search/?api=1&query=12345%20Testtown%2C%20Northside",
  );
});

test("half-known coordinates count as missing", () => {
  const href = buildMapsHref({ address: "Alexanderplatz", latitude: 48.1, longitude: null }, null);
  expect(href).toBe("https://www.google.com/maps/search/?api=1&query=Alexanderplatz");
});

test("treats Fredys -1/-1 sentinel as missing coordinates", () => {
  const href = buildMapsHref(
    { address: "Sample Avenue 41, 10115 Berlin", latitude: -1, longitude: -1 },
    { address: "Alexanderplatz, Berlin" },
  );
  expect(href).toContain("origin=Sample%20Avenue%2041%2C%2010115%20Berlin");
  expect(href).toContain("destination=Alexanderplatz%2C%20Berlin");
  expect(href).not.toContain("-1%2C-1");
});

test("treats 0/0 and out-of-range values as missing coordinates", () => {
  expect(buildMapsHref({ address: "Alexanderplatz", latitude: 0, longitude: 0 }, null)).toBe(
    "https://www.google.com/maps/search/?api=1&query=Alexanderplatz",
  );
  expect(buildMapsHref({ address: "Alexanderplatz", latitude: 99, longitude: 11 }, null)).toBe(
    "https://www.google.com/maps/search/?api=1&query=Alexanderplatz",
  );
  expect(buildMapsHref({ address: null, latitude: -1, longitude: -1 }, null)).toBeNull();
});

test("routes from the listing to the configured coordinates", () => {
  const href = buildMapsHref(withCoords, { lat: 48.1372, lng: 11.5755 });
  expect(href).toBe(
    "https://www.google.com/maps/dir/?api=1&origin=48.1351%2C11.582" +
      "&destination=48.1372%2C11.5755&travelmode=transit",
  );
});

test("routes from the listing address to the configured start address", () => {
  const href = buildMapsHref(withoutCoords, { address: "Alexanderplatz, Berlin" });
  expect(href).toBe(
    "https://www.google.com/maps/dir/?api=1&origin=12345%20Testtown%2C%20Northside" +
      "&destination=Alexanderplatz%2C%20Berlin&travelmode=transit",
  );
});

test("encodes umlauts and spaces in both parameters", () => {
  const href = buildMapsHref(
    { address: "Beispielstraße 5, Musterstadt", latitude: null, longitude: null },
    { address: "Grüner Platz, Musterstadt" },
  );
  expect(href).toContain("origin=Beispielstra%C3%9Fe%205%2C%20Musterstadt");
  expect(href).toContain("destination=Gr%C3%BCner%20Platz%2C%20Musterstadt");
  expect(href).toContain("travelmode=transit");
});

test("plain search link when no origin is configured", () => {
  expect(buildMapsHref(withCoords, null)).toContain("/maps/search/?api=1&query=");
});

test("null when the listing has neither address nor coordinates", () => {
  expect(buildMapsHref({ address: null, latitude: null, longitude: null }, null)).toBeNull();
  expect(
    buildMapsHref({ address: "   ", latitude: null, longitude: null }, { address: "Alexanderplatz" }),
  ).toBeNull();
});

test("origin: coordinates win when a custom start is set", () => {
  const origin = originFromSettings({ ...DEFAULTS, startLat: 48.1372, startLng: 11.5755 });
  expect(origin).toEqual({ lat: 48.1372, lng: 11.5755 });
});

test("origin: start address when no coordinates are set", () => {
  const origin = originFromSettings({ ...DEFAULTS, startAddress: "Alexanderplatz, Berlin" });
  expect(origin).toEqual({ address: "Alexanderplatz, Berlin" });
});

test("origin: null when neither coordinates nor address are set", () => {
  expect(originFromSettings({ ...DEFAULTS, startAddress: "  " })).toBeNull();
});

test("hasRealCoords rejects fredy's not-geocoded sentinel", () => {
  expect(hasRealCoords(-1, -1)).toBe(false);
  expect(hasRealCoords(0, 0)).toBe(false);
  expect(hasRealCoords(null, 9.1)).toBe(false);
  expect(hasRealCoords(48.77, 9.18)).toBe(true);
});
