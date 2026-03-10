import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTask, updateTask } from "@/lib/services/task";

const updateTaskSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  isCompleted: z.boolean().optional(),
  isPriority: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const json = await request.json();
    const body = updateTaskSchema.parse(json);
    const task = updateTask(params.id, body);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update task",
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
    deleteTask(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete task",
      },
      { status: 500 },
    );
  }
}

