import { supabase } from "@/lib/supabase";

export type Progress = {
  id: string;
  subTaskId: string;
  content: string;
  assignee: string;
  isPriority: boolean;
  isCompleted: boolean;
  dueDate: string | null;
  sortOrder: number;
};

export async function getProgressBySubTaskId(
  subTaskId: string,
): Promise<Progress[]> {
  const { data } = await supabase
    .from("sub_task_progress")
    .select("id, sub_task_id, content, assignee, is_priority, is_completed, due_date, sort_order")
    .eq("sub_task_id", subTaskId)
    .order("sort_order")
    .order("created_at");

  return (data ?? []).map((r) => ({
    id: r.id,
    subTaskId: r.sub_task_id,
    content: r.content,
    assignee: r.assignee ?? "",
    isPriority: Boolean(r.is_priority),
    isCompleted: Boolean(r.is_completed),
    dueDate: r.due_date ?? null,
    sortOrder: r.sort_order ?? 0,
  }));
}

export async function createProgress(input: {
  subTaskId: string;
  content: string;
  assignee?: string;
  isPriority?: boolean;
  dueDate?: string | null;
}): Promise<Progress> {
  const id = crypto.randomUUID();

  const { data: maxRow } = await supabase
    .from("sub_task_progress")
    .select("sort_order")
    .eq("sub_task_id", input.subTaskId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;
  const dueDate = input.dueDate?.trim() || null;

  const { error } = await supabase.from("sub_task_progress").insert({
    id,
    sub_task_id: input.subTaskId,
    content: input.content,
    assignee: input.assignee ?? "",
    is_priority: Boolean(input.isPriority),
    due_date: dueDate,
    sort_order: sortOrder,
  });

  if (error) throw error;

  return {
    id,
    subTaskId: input.subTaskId,
    content: input.content,
    assignee: input.assignee ?? "",
    isPriority: Boolean(input.isPriority),
    isCompleted: false,
    dueDate,
    sortOrder,
  };
}

export async function updateProgress(
  id: string,
  updates: Partial<
    Pick<Progress, "content" | "assignee" | "isPriority" | "isCompleted" | "dueDate">
  >,
): Promise<Progress | null> {
  const { data: existing } = await supabase
    .from("sub_task_progress")
    .select("id, sub_task_id, content, assignee, is_priority, is_completed, due_date, sort_order")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const nextContent = updates.content ?? existing.content;
  const nextAssignee = updates.assignee ?? existing.assignee ?? "";
  const nextPriority = updates.isPriority ?? Boolean(existing.is_priority);
  const nextCompleted = updates.isCompleted ?? Boolean(existing.is_completed);
  const nextDueDate =
    updates.dueDate !== undefined
      ? (updates.dueDate?.trim() || null)
      : (existing.due_date ?? null);

  const { error } = await supabase
    .from("sub_task_progress")
    .update({
      content: nextContent,
      assignee: nextAssignee,
      is_priority: nextPriority,
      is_completed: nextCompleted,
      due_date: nextDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return {
    id: existing.id,
    subTaskId: existing.sub_task_id,
    content: nextContent,
    assignee: nextAssignee,
    isPriority: nextPriority,
    isCompleted: nextCompleted,
    dueDate: nextDueDate,
    sortOrder: existing.sort_order ?? 0,
  };
}

export async function deleteProgress(id: string): Promise<void> {
  const { error } = await supabase
    .from("sub_task_progress")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
