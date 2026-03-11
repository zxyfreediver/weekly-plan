import { supabase } from "@/lib/supabase";

export type Task = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  isPriority: boolean;
  weekStart: string;
};

export async function getTasksForSubCategory(
  subCategoryId: string,
  weekStart: string,
): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed, is_priority, week_start")
    .eq("sub_category_id", subCategoryId)
    .eq("week_start", weekStart)
    .order("is_completed")
    .order("is_priority", { ascending: false })
    .order("created_at");

  return (data ?? []).map((r) => ({
    id: r.id,
    content: r.content,
    description: r.description ?? "",
    isCompleted: Boolean(r.is_completed),
    isPriority: Boolean(r.is_priority),
    weekStart: r.week_start,
  }));
}

export async function createTask(input: {
  subCategoryId: string;
  content: string;
  description?: string;
  isPriority?: boolean;
  weekStart: string;
}): Promise<Task> {
  const id = crypto.randomUUID();
  const desc = input.description ?? "";

  await supabase.from("tasks").insert({
    id,
    sub_category_id: input.subCategoryId,
    content: input.content,
    description: desc,
    is_completed: false,
    is_priority: Boolean(input.isPriority),
    week_start: input.weekStart,
  });

  return {
    id,
    content: input.content,
    description: desc,
    isCompleted: false,
    isPriority: Boolean(input.isPriority),
    weekStart: input.weekStart,
  };
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<Task, "content" | "description" | "isCompleted" | "isPriority">,
  >,
): Promise<Task | null> {
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed, is_priority, week_start")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const nextContent = updates.content ?? existing.content;
  const nextDescription = updates.description ?? existing.description ?? "";
  const nextCompleted = updates.isCompleted ?? Boolean(existing.is_completed);
  const nextPriority = updates.isPriority ?? Boolean(existing.is_priority);

  await supabase
    .from("tasks")
    .update({
      content: nextContent,
      description: nextDescription,
      is_completed: nextCompleted,
      is_priority: nextPriority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return {
    id: existing.id,
    content: nextContent,
    description: nextDescription,
    isCompleted: nextCompleted,
    isPriority: nextPriority,
    weekStart: existing.week_start,
  };
}

export async function deleteTask(id: string): Promise<void> {
  await supabase.from("tasks").delete().eq("id", id);
}
