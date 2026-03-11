# Changelog

## [Unreleased]

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
