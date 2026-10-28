FROM --platform=linux/amd64 node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci

FROM --platform=linux/amd64 node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1536 --experimental-sqlite"
RUN npm run build

FROM --platform=linux/amd64 node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# node:sqlite 目前仍需实验开关；不再使用 better-sqlite3，避免 SIGSEGV
ENV NODE_OPTIONS="--experimental-sqlite --max-old-space-size=2048"
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /data/uploads && chmod -R 777 /data
VOLUME /data
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
