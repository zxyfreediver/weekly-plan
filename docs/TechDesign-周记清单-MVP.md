# Technical Design Document: 周记清单 MVP

## Executive Summary

**System:** 周记清单（Weekly Journal Checklist）
**Version:** MVP 1.0
**Architecture Pattern:** Next.js Full-stack Monolith
**Estimated Effort:** 4-6 周

---

## Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    A[Client Layer] --> B[Next.js App]
    B --> C[API Routes]
    C --> D[Services]
    D --> E[(Supabase PostgreSQL)]

    subgraph "Client Layer"
        A1[Web Browser]
        A2[PWA]
    end

    subgraph "Next.js App"
        B1[App Router]
        B2[React Components]
        B3[Tailwind CSS]
    end

    subgraph "API Layer"
        C1[/api/auth]
        C2[/api/categories]
        C3[/api/tasks]
        C4[/api/summary - 预留]
        C5[/api/stats]
    end

    subgraph "Data Layer"
        E
    end
```

### Tech Stack Decision

#### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **State Management:** React Server Components + Client state (useState/Context)
- **UI Components:** 自定义 + 可选 shadcn/ui
- **PWA:** next-pwa 或 @ducanh2912/next-pwa

#### Backend
- **Runtime:** Node.js (Next.js API Routes)
- **Database Client:** @supabase/supabase-js
- **API Pattern:** REST
- **Validation:** Zod

#### Infrastructure
- **Hosting:** Vercel（推荐）
- **Database:** Supabase (PostgreSQL)
- **CI/CD:** Vercel 自动部署
- **备选:** Docker 自托管（阿里云 ECS）

#### Authentication
- **方案选项:**
  - **推荐:** NextAuth.js (支持 credentials、OAuth)
  - **备选:** 自建 JWT + bcrypt
- **Session:** JWT 或 Cookie-based

---

## Component Design

### Frontend Architecture

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # 首页 / 分类列表
│   ├── login/
│   │   └── page.tsx
│   ├── [categoryId]/            # 大分类
│   │   ├── page.tsx
│   │   └── [subCategoryId]/     # 子分类
│   │       ├── page.tsx         # 周度任务视图
│   │       └── summary/         # AI 总结 (预留)
│   │           └── page.tsx
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── categories/
│       ├── tasks/
│       ├── summary/             # 预留
│       └── stats/
├── components/
│   ├── ui/                      # 基础 UI
│   ├── CategoryList/
│   ├── TaskList/
│   ├── TaskItem/
│   └── WeekSelector/
├── lib/
│   ├── supabase.ts             # Supabase 客户端
│   ├── auth.ts
│   └── services/
│       ├── category.ts
│       └── task.ts
├── types/
└── styles/
```

### Backend Architecture

```
src/
├── app/api/
│   ├── auth/[...nextauth]/route.ts
│   ├── categories/
│   │   ├── route.ts             # GET, POST
│   │   └── [id]/route.ts        # GET, PUT, DELETE
│   ├── tasks/
│   │   ├── route.ts             # GET, POST
│   │   └── [id]/route.ts       # GET, PUT, DELETE
│   ├── tasks/sync/              # 未完成同步到本周
│   │   └── route.ts
│   ├── summary/                 # 预留 AI 总结
│   │   └── route.ts
│   └── stats/
│       └── route.ts
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   └── queries.ts
│   ├── services/
│   │   ├── category.ts
│   │   ├── task.ts
│   │   └── sync.ts
│   └── auth.ts
└── types/
```

### Database Schema

实际 schema 以 `supabase/migrations/001_initial.sql` 为准，概要如下：

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 大分类 (工作/生活/家庭)
CREATE TABLE categories (...);

-- 子分类 (2025年工作, 2026年工作 等)
CREATE TABLE sub_categories (...);

-- 主任务（无 is_priority，优先级在子任务层；source_task_id 用于一键导入溯源）
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    sub_category_id TEXT NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_completed BOOLEAN DEFAULT FALSE,
    week_start DATE NOT NULL,
    source_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    ...
);

-- 子任务（含 description、assignee、is_priority、due_date、source_sub_task_id）
CREATE TABLE sub_tasks (...);

-- 子任务进度（含 content、assignee、is_priority、is_completed、due_date、source_progress_id）
CREATE TABLE sub_task_progress (...);
```

默认用户：`INSERT INTO users (id, name) VALUES ('admin', 'admin')`，`AUTH_USERNAME` 需与此一致。

### 一键导入

- API：`POST /api/tasks/import-from-last-week`
- 设计文档：`docs/DESIGN-import-weekly-incomplete.md`

---

## Feature Implementation

### Feature 1: 多级分类

#### API Design

```typescript
// GET /api/categories - 获取用户所有大分类
// POST /api/categories - 创建大分类
// GET /api/categories/[id] - 获取大分类及子分类
// PUT /api/categories/[id] - 更新大分类
// DELETE /api/categories/[id] - 删除大分类

// GET /api/categories/[id]/sub - 获取子分类列表
// POST /api/categories/[id]/sub - 创建子分类
// PUT /api/sub-categories/[id] - 更新子分类
// DELETE /api/sub-categories/[id] - 删除子分类
```

#### Business Logic

- 大分类、子分类均与 `user_id` 关联
- 删除大分类时级联删除子分类及任务
- `sort_order` 支持拖拽排序（可选）

### Feature 2: 周度任务列表

#### API Design

```typescript
// GET /api/tasks?subCategoryId=xxx&weekStart=2025-03-10
// POST /api/tasks - { subCategoryId, content, isPriority, weekStart }
// PUT /api/tasks/[id] - 更新任务（含划掉完成）
// DELETE /api/tasks/[id]
```

#### week_start 计算

- 使用 ISO 周（周一为第一天）
- 前端传入 `weekStart`（周一日期），如 `2025-03-10`

### Feature 3: 任务优先级

- `tasks.is_priority`: 0 | 1
- 前端高亮显示，可置顶排序

### Feature 4: 未完成自动同步

#### API Design

```typescript
// POST /api/tasks/sync
// Body: { subCategoryId, fromWeekStart, toWeekStart }
// 逻辑: 将 fromWeekStart 周内未完成任务复制到 toWeekStart 周
```

#### 触发时机

- 用户切换周时，若目标周无任务且上周有未完成，可提示或自动同步
- 或：进入某周时，若上周有未完成且本周无对应任务，自动同步

### Feature 5: AI 总结（预留）

#### API 占位

```typescript
// POST /api/summary
// Body: { subCategoryId, startDate, endDate }
// Response: { summary: string }  // 预留，后续接入 AI API
```

- 实现时先返回占位文案，如 "AI 总结功能即将上线"
- 后续接入 OpenAI / Claude / 通义千问 等

### Feature 6: 按年新建工作区

- 子分类可自定义名称，如 "2025年工作"、"2026年工作"
- 用户新建子分类即可，无需特殊逻辑
- 旧子分类数据保留，不混入新子分类

---

## Authentication

### 方案: NextAuth.js (推荐)

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { verifyPassword } from "@/lib/db/users"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        // 查用户、校验密码
        // 返回 user 或 null
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
})
```

### 备选: 自建 JWT

- 注册/登录 API 返回 JWT
- 中间件校验 `Authorization: Bearer <token>`
- 密码使用 bcrypt 哈希

---

## PWA 配置

### 使用 @ducanh2912/next-pwa

```javascript
// next.config.js
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  // next config
})
```

### manifest.json

- 应用名称、图标、主题色
- `display: standalone` 支持安装到主屏幕

### Service Worker

- 缓存静态资源
- 离线时展示基础 UI（可选）

---

## Vercel + Supabase 部署（推荐）

详见 `docs/DEPLOY-VERCEL-SUPABASE.md`。

- 将代码推送到 GitHub，在 Vercel 导入项目
- 在 Supabase 创建项目并执行 `supabase/migrations/001_initial.sql`
- 配置环境变量：`AUTH_USERNAME`、`AUTH_PASSWORD`、`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

---

## Docker 部署（备选）

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# SQLite 数据卷
VOLUME /app/data
ENV DATABASE_PATH=/app/data/db.sqlite
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/db.sqlite
      - NEXTAUTH_SECRET=xxx
      - NEXTAUTH_URL=https://your-domain.com
```

### Next.js standalone 输出

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
}
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      # 部署到阿里云 (SSH / 镜像推送 等)
      - name: Deploy to Aliyun
        run: |
          # 你的部署脚本
```

---

## Performance Optimization

- **静态资源:** Next.js 自动优化
- **数据库:** Supabase 索引已设计，按需优化查询
- **缓存:** 可对分类列表等做短期 cache（可选）

---

## Security

- **密码:** bcrypt 哈希
- **JWT:** 设置合理过期时间
- **CORS:** Next.js 同源默认安全
- **SQL:** 使用参数化查询，防注入
- **环境变量:** 敏感信息不提交仓库

---

## Cost Analysis

### 开发阶段

| 服务       | 成本   |
|------------|--------|
| 开发工具   | 免费   |
| Cursor     | 按需   |
| GitHub     | 免费   |
| **合计**   | **~$0** |

### 生产阶段 (阿里云)

| 服务       | 预估月成本 |
|------------|------------|
| 轻量应用服务器 | ¥24-70 |
| 域名 (可选)   | ¥50/年  |
| **合计**   | **¥24-70/月** |

---

## Risk Mitigation

| 风险         | 概率 | 影响 | 缓解措施                 |
|--------------|------|------|--------------------------|
| Supabase 连接 | 低   | 中   | 服务端连接池，按需扩展   |
| PWA 兼容性   | 中   | 低   | 降级为普通 Web           |
| 部署复杂度   | 中   | 中   | 文档化部署步骤           |

---

## Migration & Scaling Path

### Phase 1: MVP (当前)
- Supabase (PostgreSQL) + Vercel
- 个人 + 少量分享用户

### Phase 2: 用户增长
- 增加 Redis 缓存（如需要）
- 优化 Supabase 查询

### Phase 3: 团队版 (未来)
- 多租户
- 协作功能

---

## Maintainability

- 依赖保持稳定，按需升级
- 定期查看 Next.js、Tailwind 等更新
- 随项目演进更新 AGENTS.md、文档

---

## Documentation Requirements

- [x] README: 项目说明、本地运行、部署步骤
- [x] 部署指南: `docs/DEPLOY-VERCEL-SUPABASE.md`（Vercel + Supabase）
- [ ] API 文档: 各接口说明（可内联注释）
- [ ] 部署 runbook: Docker 构建（备选）

---

*Version: 1.3*
*Last Updated: 2025-03-10*
*Next Review: 2025-04-10*
