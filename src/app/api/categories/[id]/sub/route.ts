import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategorySubCategories } from "@/lib/services/category";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

const createSubCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getCategorySubCategories(id, userId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data.subCategories);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: categoryId } = await params;
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getCategorySubCategories(categoryId, userId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const json = await request.json();
    const body = createSubCategorySchema.parse(json);

    const { data: maxRow } = await supabase
      .from("sub_categories")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await supabase.from("sub_categories").insert({
      id,
      category_id: categoryId,
      name: body.name,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    });

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

