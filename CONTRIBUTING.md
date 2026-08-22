# Contributing

Thanks for looking. ImmoFinder is a small, self-hosted project, and contributions of
any size are welcome — a typo fix and a new feature are equally useful.

## Before you start

**Scraping problems belong upstream.** ImmoFinder never scrapes a portal itself; it
reads the database [Fredy](https://github.com/orangecoding/fredy) writes. If a portal
changed its markup, or a provider stopped returning results, that is a Fredy issue.
The exception is ImmoFinder's own URL validation and availability checks — those live
in `webui/lib/search-url.ts` and `webui/lib/availability.ts`.

**Open an issue first for anything large.** A quick sketch of what you have in mind
saves you from building something that then has to be reshaped.

## Setting up

```bash
git clone https://github.com/izqkk/immofinder.git
cd immofinder/webui
npm ci
```

You need a Fredy database to develop against. The simplest way is to start the stack
once (`docker compose up -d`), create a job, let it run, and then point the dev server
at the file it produced:

```bash
APP_PASSWORD=at-least-twelve-chars \
AUTH_SECRET=$(openssl rand -hex 32) \
FREDY_DB_PATH=../data/fredy/db/listings.db \
npm run dev
```

`APP_PASSWORD` and `AUTH_SECRET` are not optional in development either — the app is
fail-closed by design and answers `503` without them.

## Before you open a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four run in CI, so failing any of them will just come back to you.

## House style

- **English everywhere** — identifiers, comments, commit messages, documentation.
- **TypeScript, strict.** No `any` that could have been a real type.
- **Comments explain *why*, not *what*.** The existing ones document bot-detection
  workarounds, sentinel values, and why a check happens in a particular order. That
  context is the most valuable thing in the codebase — if you change such a line,
  update its comment, and if you add a non-obvious workaround, leave one behind.
- **Match the surrounding code.** Same naming, same comment density, same idiom.
- Server Components by default; `"use client"` only where interactivity requires it.

## Translations

`webui/lib/i18n/dictionaries/en/` is the source of truth. Its shape is what every other
locale is type-checked against, so a key you add there but forget to translate is a
build error rather than a blank label at runtime.

- One file per screen. Add your key to the namespace it belongs to.
- Reuse `common.*` instead of duplicating "Save", "Cancel", units, and so on.
- Write the English first and make it read like a product, not like a translation.
- Adding a whole new language is three steps — see *Adding a language* in the README.

## Touching the security layer

`webui/lib/auth.ts`, `webui/lib/session.ts` and `webui/proxy.ts` carry the largest test
file in the repo, and several of the checks in them are ordered the way they are on
purpose — the order is documented in the comments. If you change behaviour there,
please say in the PR description what an attacker could do before and after.

Never make the app fall open. There is deliberately no configuration, environment or
build mode in which a missing password results in access rather than a `503`.

## Reporting a security issue

Please do not open a public issue. Report it privately through GitHub's
[security advisories](../../security/advisories/new) instead.
