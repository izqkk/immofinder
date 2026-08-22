import { expect, test } from "vitest";
import { buildListingHref, parseBackHref } from "./back-link";

test("listing href carries the originating tab", () => {
  expect(buildListingHref("abc", "maybe")).toBe("/listings/abc?from=maybe");
});

test("listing href from search keeps the query", () => {
  const q = new URLSearchParams({ q: "altbau", minRooms: "3" });
  expect(buildListingHref("abc", "search", q)).toBe(
    "/listings/abc?from=search&q=altbau&minRooms=3",
  );
});

test("back link returns to the tab it came from", () => {
  expect(parseBackHref("discarded", new URLSearchParams())).toEqual({
    href: "/listings?tab=discarded",
    labelKey: "listings.back.discarded",
  });
});

test("back link returns to search with its filters", () => {
  const q = new URLSearchParams({ from: "search", q: "altbau" });
  expect(parseBackHref("search", q)).toEqual({
    href: "/search?q=altbau",
    labelKey: "listings.back.toSearch",
  });
});

test("unknown origin falls back to the shortlist", () => {
  expect(parseBackHref(undefined, new URLSearchParams())).toEqual({
    href: "/listings?tab=shortlist",
    labelKey: "listings.back.toListings",
  });
});
