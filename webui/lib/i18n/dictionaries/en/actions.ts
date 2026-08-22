/**
 * Text that server actions and the server-side helpers behind them hand back to the
 * client. Nothing on the server ever returns a finished sentence — it returns a key
 * from here plus the values its `{placeholder}` slots need, and the calling component
 * renders it with `t.raw(key, vars)` in whatever locale the visitor is using.
 */
export const actions = {
  /** Checking a pasted portal search address (the job wizard on /scrape). */
  searchUrl: {
    unknownProvider: "Portal not recognised — paste the address of a search results page.",
    notAUrl: "That is not a valid web address.",
    notASearchPage:
      "This IS24 address is not a search results page. Run the search on IS24 and paste the address of the results list.",
    unknownSearchType:
      "ImmoFinder does not know this IS24 address (search type “{type}”). Please use a normal rent or buy search.",
    missingShape:
      "This IS24 address is missing the outline of the drawn search (parameter “shape”).",
    rejectedSorting:
      "The portal rejects this address (the IS24 interface does not support the parameter “sorting={value}”). Please remove “sorting” from the address — ImmoFinder takes care of the sorting itself.",
    rejectedPriceType:
      "The portal rejects this address (the parameter “pricetype=calculatedtotalrent” is not allowed on “haus-mieten”). Please remove “pricetype” from the address.",
    rejected412:
      "The portal rejects this address (HTTP 412 — one of the search parameters is not supported). Please rebuild the search on IS24 with the standard sorting and copy the address again.",
    unreachable: "The portal could not be reached — please try again in a moment.",
    httpErrorImmoscout:
      "The portal answers this address with HTTP {status}. Please rebuild the search on IS24 and copy the address of the results list.",
    httpError:
      "The portal answers this address with HTTP {status}. Please paste the address of a search results page.",
    unparsableResponse: "The portal sent a response that could not be read.",
  },
};
