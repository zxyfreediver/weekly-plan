import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createTask,
  getTasksForSubCategory,
} from "@/lib/services/task";

const listTasksSchema = z.object({
  subCategoryId: z.string().min(1),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createTaskSchema = z.object({
  subCategoryId: z.string().min(1),
  content: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  isPriority: z.boolean().optional(),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listTasksSchema.safeParse({
    subCategoryId: searchParams.get("subCategoryId"),
    weekStart: searchParams.get("weekStart"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const tasks = await getTasksForSubCategory(
    parsed.data.subCategoryId,
    parsed.data.weekStart,
  );
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = createTaskSchema.parse(json);
    const task = await createTask(body);
    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create task",
      },
      { status: 400 },
    );
  }
}

