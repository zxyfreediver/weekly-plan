import { supabase } from "@/lib/supabase";

export type SubTask = {
  id: string;
  taskId: string;
  content: string;
  description: string;
  assignee: string;
  isCompleted: boolean;
  isPriority: boolean;
  sortOrder: number;
};

export async function getSubTasksByTaskId(taskId: string): Promise<SubTask[]> {
  const { data } = await supabase
    .from("sub_tasks")
    .select("id, task_id, content, description, assignee, is_completed, is_priority, sort_order")
    .eq("task_id", taskId)
    .order("sort_order")
    .order("is_completed")
    .order("is_priority", { ascending: false })
    .order("created_at");

  return (data ?? []).map((r) => ({
    id: r.id,
    taskId: r.task_id,
    content: r.content,
    description: r.description ?? "",
    assignee: r.assignee ?? "",
    isCompleted: Boolean(r.is_completed),
    isPriority: Boolean(r.is_priority),
    sortOrder: r.sort_order ?? 0,
  }));
}

export async function createSubTask(input: {
  taskId: string;
  content: string;
  description?: string;
  assignee?: string;
  isPriority?: boolean;
}): Promise<SubTask> {
  const id = crypto.randomUUID();

  const { data: maxRow } = await supabase
    .from("sub_tasks")
    .select("sort_order")
    .eq("task_id", input.taskId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("sub_tasks").insert({
    id,
    task_id: input.taskId,
    content: input.content,
    description: input.description ?? "",
    assignee: input.assignee ?? "",
    is_completed: false,
    is_priority: Boolean(input.isPriority),
    sort_order: sortOrder,
  });

  if (error) throw error;

  return {
    id,
    taskId: input.taskId,
    content: input.content,
    description: input.description ?? "",
    assignee: input.assignee ?? "",
    isCompleted: false,
    isPriority: Boolean(input.isPriority),
    sortOrder,
  };
}

export async function updateSubTask(
  id: string,
  updates: Partial<
    Pick<SubTask, "content" | "description" | "assignee" | "isCompleted" | "isPriority">
  >,
): Promise<SubTask | null> {
  const { data: existing } = await supabase
    .from("sub_tasks")
    .select("id, task_id, content, description, assignee, is_completed, is_priority, sort_order")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const nextContent = updates.content ?? existing.content;
  const nextDescription = updates.description ?? existing.description ?? "";
  const nextAssignee = updates.assignee ?? existing.assignee ?? "";
  const nextCompleted = updates.isCompleted ?? Boolean(existing.is_completed);
  const nextPriority = updates.isPriority ?? Boolean(existing.is_priority);

  const { error } = await supabase
    .from("sub_tasks")
    .update({
      content: nextContent,
      description: nextDescription,
      assignee: nextAssignee,
      is_completed: nextCompleted,
      is_priority: nextPriority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return {
    id: existing.id,
    taskId: existing.task_id,
    content: nextContent,
    description: nextDescription,
    assignee: nextAssignee,
    isCompleted: nextCompleted,
    isPriority: nextPriority,
    sortOrder: existing.sort_order ?? 0,
  };
}

export async function deleteSubTask(id: string): Promise<void> {
  const { error } = await supabase.from("sub_tasks").delete().eq("id", id);
  if (error) throw error;
}
