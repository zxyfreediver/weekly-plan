# Changelog

## [Unreleased]

## 2025-03-10（近期）

### 新增

- **一键展开/收起**：周度任务页增加「一键展开」「一键收起」按钮，可一次性展开/收起所有主任务、子任务及进度
- **不展示已完成**：周度任务页增加「不展示已完成」勾选框，勾选后隐藏已完成的主任务、子任务、进度及「本周已完成」汇总区
- **一键导入上周未完成**：本周无任务或需补充时，可一键导入上周未完成的主任务、子任务、进度，与本周任务合并；数据独立，修改不影响上周
- **周选择器增强**：年份选择（当前年 ±2）、全年周列表快速导航、显示「第N周」
- **路由加载优化**：`loading.tsx` 骨架屏、SWR 客户端缓存、middleware 鉴权前置

### 变更

- **Supabase 脚本**：将 7 个 migration 合并为单一 `001_initial.sql`，包含完整表结构与默认用户；新增 `002_import_source.sql` 溯源字段（已有库增量迁移）
- **默认用户**：默认用户由 `zhaoxingyu` 改为 `admin/admin`，`.env.example` 中 `AUTH_USERNAME=admin`
- **首页/分类页**：改为 CSR + SWR 缓存，返回时优先展示缓存
- **鉴权**：新增 `middleware.ts`，鉴权前置，页面不再阻塞

### 修复

- **主任务高优先级统计**：由进度高优先级标识的子任务，现正确计入主任务「高优先级未完成」数量

### 文档

- 新增 `docs/DESIGN-import-weekly-incomplete.md` 一键导入设计
- 更新 `docs/DEPLOY-VERCEL-SUPABASE.md`、`docs/TechDesign-周记清单-MVP.md`、`docs/UI-Spec-周记清单-Stitch.md`、`docs/PRD-周记清单-MVP.md`、`agent_docs/*`、`AGENTS.md`

## 2025-03-11

### 新增

- **任务描述**：任务支持 `description` 字段，可添加详细描述
- **任务展开**：任务列表 2 行预览（标题 + 描述），点击展开可编辑内容与描述
- **Vercel + Supabase 部署**：从 SQLite 迁移至 Supabase，支持 Vercel 一键部署

### 变更

- **数据库**：SQLite (better-sqlite3) → Supabase (PostgreSQL)
- **数据层**：`src/lib/db.ts` 移除，新增 `src/lib/supabase.ts`，服务层改为异步
- **任务 UI**：标题与描述分两行显示，标题加粗；高优先级标签紧跟标题后
- **布局**：主体内容 `max-w-6xl`，版权信息固定在页面底部
- **依赖**：serwist 从 ^10.0.0 调整为 ^9.5.6（10.0.0 未发布）

### 修复

- **高优先级显示**：`isPriority` 为 0 时不再渲染数字 "0"（使用三元表达式）
- **行高抖动**：高优先级标签添加 `min-h-5`、`leading-none` 避免布局抖动
- **Supabase 错误**：创建分类等 API 增加 `error` 检查，失败时返回 500 及错误信息
- **构建**：Supabase 客户端延迟初始化，避免构建时 env 缺失抛错
- **构建**：登录页 `useSearchParams()` 用 `<Suspense>` 包裹

### 文档

- 新增 `docs/DEPLOY-VERCEL-SUPABASE.md` 部署指南
- 新增 `supabase/migrations/001_initial.sql` 表结构
- 更新 `docs/TechDesign-周记清单-MVP.md` 架构为 Supabase
- 更新 `agent_docs/tech_stack.md`、`AGENTS.md`
- 新增 `README.md`、`CHANGELOG.md`
