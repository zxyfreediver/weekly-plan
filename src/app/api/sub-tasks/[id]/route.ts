import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteSubTask, updateSubTask } from "@/lib/services/sub_task";

const updateSubTaskSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  assignee: z.string().max(100).optional(),
  isCompleted: z.boolean().optional(),
  isPriority: z.boolean().optional(),
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
    const body = updateSubTaskSchema.parse(json);
    const subTask = await updateSubTask(id, body);
    if (!subTask) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(subTask);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update sub task",
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
    await deleteSubTask(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete sub task",
      },
      { status: 500 },
    );
  }
}
