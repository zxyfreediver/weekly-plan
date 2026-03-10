# Tech Stack & Tools

## 技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|----------|
| Frontend | Next.js | 14+ (App Router) |
| Styling | Tailwind CSS | 3.x |
| State | React Server Components + useState/Context | - |
| Backend | Next.js API Routes | - |
| Database | SQLite | better-sqlite3 或 Prisma |
| Auth | NextAuth.js | credentials + JWT |
| Validation | Zod | - |
| PWA | @ducanh2912/next-pwa | - |
| Deploy | Docker | 阿里云 |
| CI/CD | GitHub Actions | - |

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
│       ├── auth/[...nextauth]/route.ts
│       ├── categories/
│       ├── tasks/
│       ├── tasks/sync/
│       ├── summary/
│       └── stats/
├── components/
│   ├── ui/
│   ├── CategoryList/
│   ├── TaskList/
│   ├── TaskItem/
│   └── WeekSelector/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── utils.ts
└── types/
```

## 关键依赖

```json
{
  "next": "^14.x",
  "react": "^18.x",
  "tailwindcss": "^3.x",
  "next-auth": "^4.x",
  "better-sqlite3": "^9.x",
  "zod": "^3.x",
  "@ducanh2912/next-pwa": "^5.x"
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
