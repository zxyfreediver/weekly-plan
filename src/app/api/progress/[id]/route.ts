import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteProgress, updateProgress } from "@/lib/services/progress";

const updateProgressSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  assignee: z.string().max(100).optional(),
  isPriority: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
    .optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const json = await request.json();
    const body = updateProgressSchema.parse(json);
    const progress = await updateProgress(id, body);
    if (!progress) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(progress);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update progress",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteProgress(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete progress",
      },
      { status: 500 },
    );
  }
}
