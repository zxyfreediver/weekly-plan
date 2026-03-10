import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategoriesWithStats } from "@/lib/services/category";
import { getDb } from "@/lib/db";

const DEMO_USER_ID = "demo-user";

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const data = getCategoriesWithStats();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
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
      .prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM categories")
      .get() as { maxOrder: number };

    stmt.run(
      id,
      DEMO_USER_ID,
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

