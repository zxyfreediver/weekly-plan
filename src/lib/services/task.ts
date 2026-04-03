import { supabase } from "@/lib/supabase";
import { getSubTasksByTaskId, getSubTasksByTaskIds } from "./sub_task";
import type { SubTask } from "./sub_task";

export type Task = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  weekStart: string;
  subTasks: SubTask[];
};

type TaskRow = {
  id: string;
  content: string;
  description: string | null;
  is_completed: boolean | null;
  week_start: string;
};

export async function getTasksForSubCategory(
  subCategoryId: string,
  weekStart: string,
): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed, week_start")
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
    subTasks: [],
  };
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, "content" | "description" | "isCompleted">>,
): Promise<Task | null> {
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed, week_start")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const nextContent = updates.content ?? existing.content;
  const nextDescription = updates.description ?? existing.description ?? "";
  const nextCompleted = updates.isCompleted ?? Boolean(existing.is_completed);

  const { error } = await supabase
    .from("tasks")
    .update({
      content: nextContent,
      description: nextDescription,
      is_completed: nextCompleted,
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
    subTasks,
  };
}

export async function deleteTask(id: string): Promise<void> {
  await supabase.from("tasks").delete().eq("id", id);
}
