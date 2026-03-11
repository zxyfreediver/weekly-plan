import { NextResponse } from "next/server";
import { z } from "zod";
import { createSubTask } from "@/lib/services/sub_task";

const createSubTaskSchema = z.object({
  content: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  assignee: z.string().max(100).optional(),
  isPriority: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;
  try {
    const json = await request.json();
    const body = createSubTaskSchema.parse(json);
    const subTask = await createSubTask({
      taskId,
      content: body.content,
      description: body.description,
      assignee: body.assignee,
      isPriority: body.isPriority,
    });
    return NextResponse.json(subTask);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create sub task",
      },
      { status: 400 },
    );
  }
}
