# 部署到 Vercel + Supabase

## 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 并登录
2. 新建项目，选择区域
3. **必须**：进入 **SQL Editor**，复制并执行 `supabase/migrations/001_initial.sql` 中的完整 SQL，创建 `users`、`categories`、`sub_categories`、`tasks` 表。**未执行此步骤会导致创建分类等操作静默失败。**

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
| `AUTH_USERNAME` | 你的登录账号 | |
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
