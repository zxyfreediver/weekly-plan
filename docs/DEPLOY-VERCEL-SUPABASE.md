# 部署到 Vercel + Supabase

## 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 并登录
2. 新建项目，选择区域
3. **必须**：进入 **SQL Editor**，按顺序执行：
   - `supabase/migrations/001_initial.sql`：创建 `users`、`categories`、`sub_categories`、`tasks` 表
   - `supabase/migrations/002_sub_tasks.sql`：创建 `sub_tasks` 表，支持子任务功能
   - `supabase/migrations/003_default_user.sql`：插入默认用户 `zhaoxingyu`（需与 `.env` 中 `AUTH_USERNAME` 一致）
   - `supabase/migrations/004_categories_user_fk.sql`：建立 `categories.user_id` → `users.id` 外键关联
   **未执行会导致创建分类等操作失败。**

## 2. 获取 Supabase 凭证

在 Supabase Dashboard → **Settings** → **API** 中获取：

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **service_role** key（Secret）→ `SUPABASE_SERVICE_ROLE_KEY`

## 3. 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入项目
3. **重要**：在项目 **Settings** → **Environment Variables** 中添加以下变量（否则构建会失败）：

| 变量名 | 值 | 说明 |
|-------|-----|------|
| `AUTH_USERNAME` | 你的登录账号（需与 003 中默认用户 id 一致，如 `zhaoxingyu`） | |
| `AUTH_PASSWORD` | 你的登录密码 | |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Settings → API 中的 Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Supabase Settings → API 中的 Secret keys |

4. 保存后**重新部署**（Redeploy）

## 4. 本地开发

```bash
# 复制环境变量
cp .env.example .env.local

# 编辑 .env.local 填入 Supabase 凭证和登录信息
# 安装依赖并启动
pnpm install
pnpm dev
```

## 5. 故障排查

### 创建分类无报错但未创建成功

- **原因**：未执行建表 SQL，或 Supabase 返回错误但未检查
- **处理**：在 Supabase SQL Editor 执行 `supabase/migrations/001_initial.sql`，确保表已创建

### ENOTFOUND / getaddrinfo 解析失败

- **Vercel 部署**：
  - 检查 Supabase 项目是否被**暂停**（免费版 7 天无活动会暂停）→ Dashboard 中 Restore project
  - 确认 `NEXT_PUBLIC_SUPABASE_URL` 无多余空格、无末尾斜杠、与 Dashboard 完全一致
  - 修改环境变量后需 **Redeploy** 才能生效
- **本地开发**：国内网络可能无法直连 Supabase，可尝试 VPN 或直接部署到 Vercel 测试

### 构建失败：useSearchParams 需 Suspense

- 已修复：登录页 `useSearchParams()` 已用 `<Suspense>` 包裹

### 构建失败：Missing Supabase env

- 确保 Vercel 环境变量中已添加 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
