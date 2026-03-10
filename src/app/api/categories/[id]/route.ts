import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategorySubCategories } from "@/lib/services/category";
import { getDb } from "@/lib/db";

const updateCategorySchema = z.object({
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
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const json = await request.json();
    const body = updateCategorySchema.parse(json);

    const db = getDb();
    const stmt = db.prepare(
      `
      UPDATE categories
      SET name = ?, updated_at = ?
      WHERE id = ?
    `,
    );
    stmt.run(body.name, new Date().toISOString(), params.id);

    return NextResponse.json({ id: params.id, name: body.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update category",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM categories WHERE id = ?");
    stmt.run(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete category",
      },
      { status: 500 },
    );
  }
}

