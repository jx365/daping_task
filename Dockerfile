FROM --platform=linux/amd64 node:20-bookworm-slim AS deps
WORKDIR /app
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci

FROM --platform=linux/amd64 node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# standalone 有时会漏掉 exceljs / better-sqlite3 及其依赖，整包覆盖更稳
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /data/uploads && chmod -R 777 /data
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
