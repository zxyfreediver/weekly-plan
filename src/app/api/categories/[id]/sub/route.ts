import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategorySubCategories } from "@/lib/services/category";
import { getDb } from "@/lib/db";

const createSubCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const data = getCategorySubCategories(params.id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data.subCategories);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const json = await request.json();
    const body = createSubCategorySchema.parse(json);

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const sortRow = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM sub_categories WHERE category_id = ?",
      )
      .get(params.id) as { maxOrder: number };

    const stmt = db.prepare(
      `
      INSERT INTO sub_categories (
        id,
        category_id,
        name,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    );

    stmt.run(id, params.id, body.name, sortRow.maxOrder + 1, now, now);

    return NextResponse.json({ id, name: body.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create sub category",
      },
      { status: 400 },
    );
  }
}

