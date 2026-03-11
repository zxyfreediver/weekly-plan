import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { importFromLastWeek } from "@/lib/services/import";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  subCategoryId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const body = schema.parse(json);

    const { data: sub } = await supabase
      .from("sub_categories")
      .select("id, category_id")
      .eq("id", body.subCategoryId)
      .single();

    if (!sub) {
      return NextResponse.json({ error: "子分类不存在" }, { status: 404 });
    }

    const { data: cat } = await supabase
      .from("categories")
      .select("user_id")
      .eq("id", sub.category_id)
      .single();

    if (!cat || cat.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const result = await importFromLastWeek(body.subCategoryId, body.weekStart);

    if (result.message && result.imported === 0 && result.skipped === 0) {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[import-from-last-week]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "导入失败",
      },
      { status: 500 },
    );
  }
}
