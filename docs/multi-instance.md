# Running several instances

One ImmoFinder instance covers one search. If you are looking for a flat in two
cities, or helping a friend look for theirs, running a second instance is
usually cleaner than stretching one set of filters across both: each instance
gets its own Fredy jobs, its own scoring settings, its own shortlist and its own
password.

Nothing in the code is instance-aware. Separation comes entirely from Docker
Compose project names and a separate `.env` file per instance.

## The short version

```bash
# instance 1 — the default
docker compose --env-file .env up -d

# instance 2 — a second, fully isolated stack from the same checkout
docker compose --env-file .env.berlin up -d
```

Each `--env-file` needs its own values for four things: the project name, the
two host ports, and the data directory.

## A second `.env`

```bash
cp .env.example .env.berlin
```

Then edit `.env.berlin`:

```dotenv
COMPOSE_PROJECT_NAME=immofinder-berlin   # separate containers, network and volumes
DATA_DIR=./data-berlin                   # separate databases
WEBUI_PORT=3001                          # must not collide with instance 1
FREDY_PORT=9997                          # must not collide with instance 1

APP_PASSWORD=…                           # its own password
AUTH_SECRET=…                            # its own secret — `openssl rand -hex 32`
FREDY_API_USER=…
FREDY_API_PASSWORD=…
```

`COMPOSE_PROJECT_NAME` is what actually keeps the two stacks apart: Compose
prefixes container names, the network and any volumes with it, so the second
`docker compose up` creates a new stack instead of recreating the first one.

`DATA_DIR` is what keeps the *data* apart. Forgetting it is the one mistake with
consequences — two stacks would then write to the same SQLite files.

## Day-to-day

Every Compose command needs the same `--env-file`, or it will act on the wrong
stack:

```bash
docker compose --env-file .env.berlin logs -f webui
docker compose --env-file .env.berlin restart webui
docker compose --env-file .env.berlin down
```

`docker compose ls` shows which stacks are currently up.

## Putting them behind one domain

Instances bind to `BIND_ADDRESS` (localhost by default) on different ports, so a
reverse proxy can map them to whatever hostnames you like — for example
`munich.example.com` → `127.0.0.1:3000` and `berlin.example.com` →
`127.0.0.1:3001`. Set `TRUST_PROXY=1` and `REQUIRE_HTTPS=1` in each `.env` once
you do; see the [configuration reference](configuration.md).
