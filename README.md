# 周记清单

个人周度任务管理工具，帮助职场人按周记录、分类、完成待办，并支持 AI 总结。

## 技术栈

- **前端**：Next.js 16、React 19、Tailwind CSS
- **后端**：Next.js API Routes
- **数据库**：Supabase (PostgreSQL)
- **部署**：Vercel
- **PWA**：Serwist

## 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）

### 本地开发

```bash
# 克隆项目
git clone <repo-url>
cd weekly-plan

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 AUTH_USERNAME（默认 admin）、AUTH_PASSWORD、Supabase 凭证

# 启动开发服务器
pnpm dev
```

### 部署到 Vercel + Supabase

详见 [docs/DEPLOY-VERCEL-SUPABASE.md](docs/DEPLOY-VERCEL-SUPABASE.md)。

1. 在 Supabase 创建项目，执行 `supabase/migrations/001_initial.sql`
2. 在 Vercel 导入项目，配置环境变量
3. 部署

## 核心功能

- 多级分类（大分类 → 子分类 → 周度任务）
- 主任务 → 子任务 → 进度，支持优先级、截止日期
- 一键展开/收起、不展示已完成
- 一键导入上周未完成（与本周合并）
- 周选择器：年份选择、全年周列表、第N周显示
- 本周已完成汇总、AI 总结（预留）

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 首页（分类列表）
│   ├── loading.tsx         # 骨架屏
│   ├── login/              # 登录页
│   ├── [categoryId]/       # 大分类、子分类、任务
│   └── api/                # API 路由
├── components/             # 公共组件
├── lib/
│   ├── supabase.ts         # Supabase 客户端
│   ├── auth.ts             # 认证
│   └── services/           # 业务逻辑
├── middleware.ts           # 鉴权
└── styles/
```

## 文档

- [部署指南](docs/DEPLOY-VERCEL-SUPABASE.md)
- [技术设计](docs/TechDesign-周记清单-MVP.md)
- [UI 规格](docs/UI-Spec-周记清单-Stitch.md)
- [一键导入设计](docs/DESIGN-import-weekly-incomplete.md)

## 许可证

ISC
