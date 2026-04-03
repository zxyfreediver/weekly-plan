import { supabase } from "@/lib/supabase";
import { getSubTasksByTaskId, getSubTasksByTaskIds } from "./sub_task";
import type { SubTask } from "./sub_task";

export type Task = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  weekStart: string;
  completedAt: string | null;
  subTasks: SubTask[];
};

type TaskRow = {
  id: string;
  content: string;
  description: string | null;
  is_completed: boolean | null;
  week_start: string;
  completed_at: string | null;
};

export async function getTasksForSubCategory(
  subCategoryId: string,
  weekStart: string,
): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed, week_start, completed_at")
    .eq("sub_category_id", subCategoryId)
    .eq("week_start", weekStart)
    .order("is_completed")
    .order("created_at");

  const taskRows = (data ?? []) as TaskRow[];
  const subTasksByTaskId = await getSubTasksByTaskIds(
    taskRows.map((task) => task.id),
  );

  return taskRows.map((task) => ({
    id: task.id,
    content: task.content,
    description: task.description ?? "",
    isCompleted: Boolean(task.is_completed),
    weekStart: task.week_start,
    completedAt: task.completed_at ?? null,
    subTasks: subTasksByTaskId.get(task.id) ?? [],
  }));
}

export async function createTask(input: {
  subCategoryId: string;
  content: string;
  description?: string;
  weekStart: string;
}): Promise<Task> {
  const id = crypto.randomUUID();
  const desc = input.description ?? "";

  const { error } = await supabase.from("tasks").insert({
    id,
    sub_category_id: input.subCategoryId,
    content: input.content,
    description: desc,
    is_completed: false,
    week_start: input.weekStart,
  });

  if (error) throw error;

  return {
    id,
    content: input.content,
    description: desc,
    isCompleted: false,
    weekStart: input.weekStart,
    completedAt: null,
    subTasks: [],
  };
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, "content" | "description" | "isCompleted">>,
): Promise<Task | null> {
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed, week_start, completed_at")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const nextContent = updates.content ?? existing.content;
  const nextDescription = updates.description ?? existing.description ?? "";
  const nextCompleted = updates.isCompleted ?? Boolean(existing.is_completed);

  const wasCompleted = Boolean(existing.is_completed);
  const completedAt = !wasCompleted && nextCompleted
    ? new Date().toISOString()
    : wasCompleted && !nextCompleted
      ? null
      : existing.completed_at;

  const { error } = await supabase
    .from("tasks")
    .update({
      content: nextContent,
      description: nextDescription,
      is_completed: nextCompleted,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  const subTasks = await getSubTasksByTaskId(id);
  return {
    id: existing.id,
    content: nextContent,
    description: nextDescription,
    isCompleted: nextCompleted,
    weekStart: existing.week_start,
    completedAt,
    subTasks,
  };
}

export async function deleteTask(id: string): Promise<void> {
  await supabase.from("tasks").delete().eq("id", id);
}
