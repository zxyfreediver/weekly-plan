# Tech Stack & Tools

## 技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|----------|
| Frontend | Next.js | 16+ (App Router) |
| Styling | Tailwind CSS | 3.x |
| State | React Server Components + useState | - |
| Backend | Next.js API Routes | - |
| Database | Supabase | PostgreSQL，@supabase/supabase-js |
| Auth | 自建 Cookie Session | AUTH_USERNAME / AUTH_PASSWORD |
| Validation | Zod | - |
| PWA | Serwist | 9.5.x |
| Deploy | Vercel | 推荐 |
| CI/CD | Vercel 自动部署 | - |

## 项目结构

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── [categoryId]/page.tsx
│   ├── [categoryId]/[subCategoryId]/page.tsx
│   ├── [categoryId]/[subCategoryId]/summary/page.tsx
│   └── api/
│       ├── auth/login, logout
│       ├── categories/
│       ├── sub-categories/
│       └── tasks/
├── components/
├── lib/
│   ├── supabase.ts      # Supabase 客户端
│   ├── auth.ts
│   └── services/
│       ├── category.ts
│       └── task.ts
└── types/
```

## 关键依赖

```json
{
  "next": "^16.x",
  "react": "^19.x",
  "tailwindcss": "^3.x",
  "@supabase/supabase-js": "^2.x",
  "zod": "^4.x",
  "serwist": "^9.5.x"
}
```

## 命令

- `npm run dev` — 开发服务器
- `npm run build` — 构建
- `npm run start` — 生产启动
- `npm run lint` — ESLint
- `npm test` — 测试（若已配置）

## Error Handling

```typescript
// API Route 统一错误处理
try {
  const result = await service.doSomething();
  return NextResponse.json(result);
} catch (error) {
  console.error(error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status: 500 }
  );
}
```

## Naming Conventions

- 组件：PascalCase
- 文件：kebab-case 或 PascalCase（组件）
- API 路由：REST 风格，如 `/api/categories`, `/api/tasks/[id]`
- 数据库表：snake_case
