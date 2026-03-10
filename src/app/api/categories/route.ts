import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategoriesWithStats } from "@/lib/services/category";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = getCategoriesWithStats(userId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const body = createCategorySchema.parse(json);

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `
      INSERT INTO categories (id, user_id, name, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    );

    const sortOrderRow = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM categories WHERE user_id = ?",
      )
      .get(userId) as { maxOrder: number };

    stmt.run(
      id,
      userId,
      body.name,
      sortOrderRow.maxOrder + 1,
      now,
      now,
    );

    return NextResponse.json({ id, name: body.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create category",
      },
      { status: 400 },
    );
  }
}

