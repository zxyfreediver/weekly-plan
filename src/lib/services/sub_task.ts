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

import {
  getProgressBySubTaskId,
  getProgressBySubTaskIds,
  type Progress,
} from "./progress";

export type SubTask = {
  id: string;
  taskId: string;
  content: string;
  description: string;
  assignee: string;
  isCompleted: boolean;
  isPriority: boolean;
  sortOrder: number;
  dueDate: string | null;
  progress: Progress[];
};

type SubTaskRow = {
  id: string;
  task_id: string;
  content: string;
  description: string | null;
  assignee: string | null;
  is_completed: boolean | null;
  is_priority: boolean | null;
  sort_order: number | null;
  due_date: string | null;
};

function mapSubTaskRow(row: SubTaskRow): Omit<SubTask, "progress"> {
  return {
    id: row.id,
    taskId: row.task_id,
    content: row.content,
    description: row.description ?? "",
    assignee: row.assignee ?? "",
    isCompleted: Boolean(row.is_completed),
    isPriority: Boolean(row.is_priority),
    sortOrder: row.sort_order ?? 0,
    dueDate: row.due_date ?? null,
  };
}

export async function getSubTasksByTaskIds(
  taskIds: string[],
): Promise<Map<string, SubTask[]>> {
  const subTasksByTaskId = new Map<string, SubTask[]>();

  if (taskIds.length === 0) {
    return subTasksByTaskId;
  }

  for (const taskId of taskIds) {
    subTasksByTaskId.set(taskId, []);
  }

  const baseSubTasks = await batchQuery(
    taskIds,
    SUPABASE_BATCH_LIMIT,
    async (batch) => {
      const { data } = await supabase
        .from("sub_tasks")
        .select("id, task_id, content, description, assignee, is_completed, is_priority, sort_order, due_date")
        .in("task_id", batch)
        .order("task_id")
        .order("sort_order")
        .order("is_completed")
        .order("is_priority", { ascending: false })
        .order("created_at");
      return (data ?? []) as SubTaskRow[];
    },
  ).then((rows) => rows.map(mapSubTaskRow));

  const progressBySubTaskId = await getProgressBySubTaskIds(
    baseSubTasks.map((subTask) => subTask.id),
  );

  for (const subTask of baseSubTasks) {
    const fullSubTask: SubTask = {
      ...subTask,
      progress: progressBySubTaskId.get(subTask.id) ?? [],
    };
    const current = subTasksByTaskId.get(subTask.taskId);

    if (current) {
      current.push(fullSubTask);
      continue;
    }

    subTasksByTaskId.set(subTask.taskId, [fullSubTask]);
  }

  return subTasksByTaskId;
}

export async function getSubTasksByTaskId(taskId: string): Promise<SubTask[]> {
  const subTasksByTaskId = await getSubTasksByTaskIds([taskId]);
  return subTasksByTaskId.get(taskId) ?? [];
}

export async function createSubTask(input: {
  taskId: string;
  content: string;
  description?: string;
  assignee?: string;
  isPriority?: boolean;
  dueDate?: string | null;
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

  const dueDate = input.dueDate?.trim() || null;

  const { error } = await supabase.from("sub_tasks").insert({
    id,
    task_id: input.taskId,
    content: input.content,
    description: input.description ?? "",
    assignee: input.assignee ?? "",
    is_completed: false,
    is_priority: Boolean(input.isPriority),
    sort_order: sortOrder,
    due_date: dueDate,
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
    dueDate,
    progress: [],
  };
}

export async function updateSubTask(
  id: string,
  updates: Partial<
    Pick<SubTask, "content" | "description" | "assignee" | "isCompleted" | "isPriority" | "dueDate">
  >,
): Promise<SubTask | null> {
  const { data: existing } = await supabase
    .from("sub_tasks")
    .select("id, task_id, content, description, assignee, is_completed, is_priority, sort_order, due_date")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const nextContent = updates.content ?? existing.content;
  const nextDescription = updates.description ?? existing.description ?? "";
  const nextAssignee = updates.assignee ?? existing.assignee ?? "";
  const nextCompleted = updates.isCompleted ?? Boolean(existing.is_completed);
  const nextPriority = updates.isPriority ?? Boolean(existing.is_priority);
  const nextDueDate =
    updates.dueDate !== undefined
      ? (updates.dueDate?.trim() || null)
      : (existing.due_date ?? null);

  const { error } = await supabase
    .from("sub_tasks")
    .update({
      content: nextContent,
      description: nextDescription,
      assignee: nextAssignee,
      is_completed: nextCompleted,
      is_priority: nextPriority,
      due_date: nextDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  const progress = await getProgressBySubTaskId(existing.id);
  return {
    id: existing.id,
    taskId: existing.task_id,
    content: nextContent,
    description: nextDescription,
    assignee: nextAssignee,
    isCompleted: nextCompleted,
    isPriority: nextPriority,
    sortOrder: existing.sort_order ?? 0,
    dueDate: nextDueDate,
    progress,
  };
}

export async function deleteSubTask(id: string): Promise<void> {
  const { error } = await supabase.from("sub_tasks").delete().eq("id", id);
  if (error) throw error;
}
