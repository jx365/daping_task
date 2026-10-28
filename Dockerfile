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
# 轻量服务器内存通常只有 1~2G，不要设 4096（反而 OOM/SIGSEGV）
# 限制为约 1.5G，并用单进程构建降低并行压力
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /data/uploads
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
