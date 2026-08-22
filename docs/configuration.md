# Configuration reference

ImmoFinder is configured in two places, and the split is deliberate:

- **Environment variables** — everything an *operator* sets: where the databases
  live, who may log in, which port to bind. They are read at process start and
  live in `.env` next to `docker-compose.yml`.
- **The Settings screen** — everything a *searcher* tunes: budget, distance,
  score weights, filters, what the lists show. These are stored in ImmoFinder's
  own database and changed in the UI, with no restart.

If you find yourself wanting to put a search preference in `.env`, it probably
belongs in Settings instead.

---

## Environment variables

### Access protection — required

ImmoFinder has no user accounts. A single shared password protects the instance.

| Variable | Default | Effect |
|---|---|---|
| `APP_PASSWORD` | — | The password everyone logs in with. **Minimum 12 characters.** |
| `AUTH_SECRET` | — | HMAC key used to sign the session cookie. **Minimum 32 characters**, random. Generate with `openssl rand -hex 32`. |

Both are enforced **fail-closed**: if either is missing or too short, every
route — including `/login` — answers `503`. There is no development mode that
skips this, and no fall-open path.

Changing either value invalidates every existing session immediately. The
cookie carries a fingerprint of the password rather than the password itself, so
a rotated password cannot be used with an old cookie.

### Reverse proxy and HTTPS

| Variable | Default | Effect |
|---|---|---|
| `TRUST_PROXY` | unset | Set to `1` when a proxy in front of ImmoFinder reliably sets `X-Forwarded-For` and `X-Forwarded-Proto`. Only the **right-most** `X-Forwarded-For` entry is used — the left-most entries are client-supplied and forgeable. Without this flag, no forwarded header is believed at all. |
| `REQUIRE_HTTPS` | unset | Set to `1` once the instance is reachable over HTTPS only: logging in over an unencrypted connection then returns `400` instead of issuing a session. |

**Leave `REQUIRE_HTTPS` empty while you reach the app over plain `http`**, or
login stops working entirely. This is the most common self-hosting mistake with
ImmoFinder.

Without `REQUIRE_HTTPS`, the transport decides the cookie per request: over
HTTPS the session uses `__Host-immofinder_session` with `Secure`, over plain
HTTP it uses `immofinder_session` without it — otherwise the browser would never
send the cookie back. Whichever name is not in use is actively expired, so
switching a running instance to HTTPS does not leave a stale cookie behind.

### Databases

| Variable | Default | Effect |
|---|---|---|
| `FREDY_DB_PATH` | `../data/fredy/db/listings.db` | Fredy's SQLite database. Opened **read-only**; ImmoFinder never writes to it. A missing file is a hard error rather than an empty list. |
| `WEBUI_DB_PATH` | `data/webui.db` | ImmoFinder's own database. The directory is created if absent and the schema is created on first open — there is no migration or seed step. |

In the Docker setup both are set by `docker-compose.yml` and you should not need
to touch them.

### Fredy API

| Variable | Default | Effect |
|---|---|---|
| `FREDY_API_URL` | `http://fredy:9998` | Base URL of Fredy's API. The Compose default resolves inside the Docker network. |
| `FREDY_API_USER` | — | Fredy login. A fresh Fredy install uses `admin` / `admin` — change it in Fredy's UI on first login. |
| `FREDY_API_PASSWORD` | — | as above |

Without these, listings still display and swiping still works; the Scraping page
shows a configuration notice and manual scrape runs cannot be triggered.

### Presentation and etiquette

| Variable | Default | Effect |
|---|---|---|
| `DEFAULT_LOCALE` | `en` | UI language for visitors who have not chosen one: `en` or `de`. A visitor's own choice is stored in a cookie and always wins. |
| `GEOCODER_USER_AGENT` | a generic ImmoFinder string | Sent to Nominatim. Their usage policy asks for an application name and a way to make contact; please add your own contact address. |

### Deployment

| Variable | Default | Effect |
|---|---|---|
| `BIND_ADDRESS` | `127.0.0.1` | Interface the published ports bind to. Use `0.0.0.0` only behind a firewall, a VPN or a reverse proxy. |
| `WEBUI_PORT` | `3000` | Host port for the web UI. |
| `FREDY_PORT` | `9998` | Host port for Fredy's own UI. |
| `DATA_DIR` | `./data` | Where both databases live on the host. |
| `COMPOSE_PROJECT_NAME` | `immofinder` | Compose project name — change it to run isolated instances side by side. |
| `FREDY_IMAGE_TAG` | `master` | Fredy image tag. Pin a version to upgrade deliberately. |
| `FREDY_MEMORY_LIMIT` | `2G` | Memory ceiling for the Fredy container. Headless Chromium is the reason it needs this much. |

---

## Settings screen

Reachable at `/settings`, split into three tabs. Everything below is stored in
ImmoFinder's database and applies immediately.

### Scoring

Controls the 1–5 star rating. The score combines up to four components; a
component whose data is missing is **skipped, not penalised**, and the remaining
weights are re-normalised to fill the gap.

| Setting | Default | Effect |
|---|---|---|
| Shared-room mode | off | Search for a single room in a shared flat instead of a whole place. Disables the single-room score floor and the room-count component, and stops single rooms being filtered out. |
| People moving in | 1 | Divisor for price-per-person and m²-per-person, and the basis for the room-count tiers. |
| Budget | 1200 € | Total monthly rent you are aiming at, for everyone together. |
| Maximum distance | 30 km | Distance at which the distance component reaches zero. |
| Weights | 40 / 35 / 15 / 10 | Relative importance of price, distance, rooms and size. They do not have to add up to 100. |
| Budget tolerance | 25 % | How far over budget a listing may go before the price component hits zero. |
| Room tiers | 100 / 70 / 20 % | Score for "one room each plus a living room", "exactly enough" and "tight". |
| m² per person | 30 / 20 | Thresholds for the "good" and "acceptable" size tiers. |
| Neutral score | 50 % | Used when a listing has no usable data at all. |
| Maximum plausible rooms | 12 | Anything above this is treated as unknown — some portals occasionally put the floor area in the rooms column. |
| Single-room floor | on | Force listings whose title matches the single-room terms down to one star. The terms themselves are edited under *Filters*. |
| Size tier scores | 100 / 70 / 30 % | Score awarded above the "good" threshold, above the "acceptable" one, and below both. |

The starting point for distances is set here too, as an address. It is resolved
to coordinates once, when you save — not on every request. With no starting
point set, ImmoFinder falls back to the distance Fredy itself precomputed.

**Distances are straight-line.** There is no travel-time lookup, so a listing
five kilometres away across a river may be a much longer trip than the number
suggests.

### Filters

A hard filter: anything excluded here is not merely ranked lower, it does not
appear in the lists at all. Nothing is lost, though — the Search page has a
**Show deleted** switch that puts filtered-out listings back into the results, so
a filter you set two weeks ago never permanently hides something from you.

Price, room-count, size, m²-per-person, listing age and distance ranges;
which portals to include; keyword rules (excluded terms, excluded terms in the
address, required terms); the single-room rules **including the term list that the
score floor also uses**; and four toggles for whether listings with an unknown
price, room count, size or distance should be dropped.

Leaving a numeric field at 0 means "no limit".

### Display

Highlight keywords, the star threshold for "good" and "weak", how many top
recommendations the dashboard shows, the default sort order, the swipe deck size
and order, and how many active listings to load from Fredy's database at once.
