import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateSubCategory } from "@/lib/services/category";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const body = updateSchema.parse(json);
    const ok = await updateSubCategory(id, userId, body.name);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ id, name: body.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 400 },
    );
  }
}
