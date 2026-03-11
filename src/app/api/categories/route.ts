import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategoriesWithStats } from "@/lib/services/category";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getCategoriesWithStats(userId);
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

    const { data: maxRow } = await supabase
      .from("categories")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await supabase.from("categories").insert({
      id,
      user_id: userId,
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
          error instanceof Error ? error.message : "Failed to create category",
      },
      { status: 400 },
    );
  }
}

