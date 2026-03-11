import { NextResponse } from "next/server";
import { z } from "zod";
import { createProgress } from "@/lib/services/progress";

const createProgressSchema = z.object({
  content: z.string().min(1).max(500),
  assignee: z.string().max(100).optional(),
  isPriority: z.boolean().optional(),
  dueDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: subTaskId } = await params;
  try {
    const json = await request.json();
    const body = createProgressSchema.parse(json);
    const progress = await createProgress({
      subTaskId,
      content: body.content,
      assignee: body.assignee,
      isPriority: body.isPriority,
      dueDate: body.dueDate ?? undefined,
    });
    return NextResponse.json(progress);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create progress",
      },
      { status: 400 },
    );
  }
}
