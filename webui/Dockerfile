FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- deps + build ---
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- runner ---
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
# bring built artifacts + full node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
# Request gate (formerly middleware.ts) — part of the container's source tree.
COPY --from=builder /app/proxy.ts ./proxy.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
# Persistent app data (swipe decisions, settings, availability, geocode cache)
RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 3000
CMD ["npm", "start"]
