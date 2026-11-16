# syntax=docker/dockerfile:1

# ---- 基础镜像 ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@9.15.9

# ---- 安装依赖 ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# 国内网络可保留镜像源；如构建环境可直连 npm，可删除下一行
RUN pnpm config set registry https://registry.npmmirror.com \
 && pnpm install --frozen-lockfile

# ---- 构建 ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- 运行 ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# 生产环境同样使用本地文件数据库
ENV LOCAL_DB=true

WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# Next.js standalone 产物 + 静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 初始数据（首次启动时若 /app/data 为空会自动复制进来）
COPY --from=builder --chown=nextjs:nodejs /app/data ./seed

# 入口脚本：初始化数据文件后启动服务（放在镜像内，避免把 shell 逻辑写进 CMD 被 NAS 界面拆坏）
RUN mkdir -p /app/data \
 && printf '%s\n' \
      '#!/bin/sh' \
      'set -e' \
      'mkdir -p /app/data' \
      'chmod 777 /app/data 2>/dev/null || true' \
      'if [ ! -f /app/data/db.json ]; then' \
      '  echo "[init] seeding /app/data/db.json"' \
      '  cp /app/seed/db.json /app/data/db.json' \
      'fi' \
      'exec "$@"' \
      > /app/docker-entrypoint.sh \
 && chmod +x /app/docker-entrypoint.sh \
 && chown -R nextjs:nodejs /app/data /app/seed

# 以 root 运行，确保能写入 NAS 上任意挂载目录（个人自托管场景）
USER root
EXPOSE 3000

# 入口脚本负责数据初始化，CMD 保持最简单，NAS 界面可直接识别
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]