# Code Patterns & Style

## 架构原则

- **Thin Controllers**: Route handlers 只处理 request/response，业务逻辑在 `lib/services/`
- **No DB in Routes**: 不在 route 中直接操作数据库，通过 service 调用
- **Type Safety**: 使用 TypeScript，禁止 `any`，必要时用 `unknown` + type guard

## API Route 模式

```typescript
// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCategory } from "@/lib/services/category";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getCategories(session.user.id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const validated = createCategorySchema.parse(body);
  const result = await createCategory(session.user.id, validated);
  return NextResponse.json(result);
}
```

## Service 模式

```typescript
// lib/services/category.ts
import { db } from "@/lib/db";

export async function createCategory(userId: string, data: { name: string }) {
  const id = crypto.randomUUID();
  await db.run(
    "INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)",
    [id, userId, data.name]
  );
  return { id, name: data.name };
}
```

## Zod 校验

```typescript
import { z } from "zod";

export const createTaskSchema = z.object({
  subCategoryId: z.string().uuid(),
  content: z.string().min(1).max(500),
  isPriority: z.boolean().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

## 组件模式

- Server Component 优先，需要交互时用 Client Component (`"use client"`)
- Props 使用 TypeScript 接口定义
- 避免在组件内直接调用 API，优先用 Server Component 获取数据
