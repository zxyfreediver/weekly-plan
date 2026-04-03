import { supabase } from "@/lib/supabase";

const SUPABASE_BATCH_LIMIT = 1000;

async function batchQuery<T, R>(
  ids: T[],
  batchSize: number,
  queryFn: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await queryFn(batch);
    results.push(...batchResults);
  }
  return results;
}

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

type ProgressRow = {
  id: string;
  sub_task_id: string;
  content: string;
  assignee: string | null;
  is_priority: boolean | null;
  is_completed: boolean | null;
  due_date: string | null;
  sort_order: number | null;
};

function mapProgressRow(row: ProgressRow): Progress {
  return {
    id: row.id,
    subTaskId: row.sub_task_id,
    content: row.content,
    assignee: row.assignee ?? "",
    isPriority: Boolean(row.is_priority),
    isCompleted: Boolean(row.is_completed),
    dueDate: row.due_date ?? null,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function getProgressBySubTaskIds(
  subTaskIds: string[],
): Promise<Map<string, Progress[]>> {
  const progressBySubTaskId = new Map<string, Progress[]>();

  if (subTaskIds.length === 0) {
    return progressBySubTaskId;
  }

  for (const subTaskId of subTaskIds) {
    progressBySubTaskId.set(subTaskId, []);
  }

  const rows = await batchQuery(
    subTaskIds,
    SUPABASE_BATCH_LIMIT,
    async (batch) => {
      const { data } = await supabase
        .from("sub_task_progress")
        .select("id, sub_task_id, content, assignee, is_priority, is_completed, due_date, sort_order")
        .in("sub_task_id", batch)
        .order("sub_task_id")
        .order("sort_order")
        .order("created_at");
      return (data ?? []) as ProgressRow[];
    },
  );

  for (const row of rows) {
    const progress = mapProgressRow(row);
    const current = progressBySubTaskId.get(progress.subTaskId);

    if (current) {
      current.push(progress);
      continue;
    }

    progressBySubTaskId.set(progress.subTaskId, [progress]);
  }

  return progressBySubTaskId;
}

export async function getProgressBySubTaskId(
  subTaskId: string,
): Promise<Progress[]> {
  const progressBySubTaskId = await getProgressBySubTaskIds([subTaskId]);
  return progressBySubTaskId.get(subTaskId) ?? [];
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
