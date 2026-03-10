import { getDb } from "@/lib/db";

export type Task = {
  id: string;
  content: string;
  isCompleted: boolean;
  isPriority: boolean;
  weekStart: string;
};

export function getTasksForSubCategory(
  subCategoryId: string,
  weekStart: string,
): Task[] {
  const db = getDb();
  const stmt = db.prepare<unknown, Task>(
    `
    SELECT
      id,
      content,
      is_completed AS isCompleted,
      is_priority AS isPriority,
      week_start AS weekStart
    FROM tasks
    WHERE sub_category_id = ? AND week_start = ?
    ORDER BY is_completed ASC, is_priority DESC, created_at ASC
  `,
  );
  return stmt.all(subCategoryId, weekStart);
}

export function createTask(input: {
  subCategoryId: string;
  content: string;
  isPriority?: boolean;
  weekStart: string;
}): Task {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(
    `
    INSERT INTO tasks (
      id,
      sub_category_id,
      content,
      is_completed,
      is_priority,
      week_start,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  );

  stmt.run(
    id,
    input.subCategoryId,
    input.content,
    0,
    input.isPriority ? 1 : 0,
    input.weekStart,
    now,
    now,
  );

  return {
    id,
    content: input.content,
    isCompleted: false,
    isPriority: Boolean(input.isPriority),
    weekStart: input.weekStart,
  };
}

export function updateTask(
  id: string,
  updates: Partial<Pick<Task, "content" | "isCompleted" | "isPriority">>,
): Task | null {
  const db = getDb();

  const existing = db
    .prepare<
      unknown,
      | {
          id: string;
          content: string;
          isCompleted: number;
          isPriority: number;
          weekStart: string;
        }
      | undefined
    >(
      `
      SELECT
        id,
        content,
        is_completed AS isCompleted,
        is_priority AS isPriority,
        week_start AS weekStart
      FROM tasks
      WHERE id = ?
    `,
    )
    .get(id);

  if (!existing) {
    return null;
  }

  const nextContent =
    updates.content !== undefined ? updates.content : existing.content;
  const nextCompleted =
    updates.isCompleted !== undefined
      ? updates.isCompleted
      : Boolean(existing.isCompleted);
  const nextPriority =
    updates.isPriority !== undefined
      ? updates.isPriority
      : Boolean(existing.isPriority);

  const stmt = db.prepare(
    `
    UPDATE tasks
    SET
      content = ?,
      is_completed = ?,
      is_priority = ?,
      updated_at = ?
    WHERE id = ?
  `,
  );

  stmt.run(
    nextContent,
    nextCompleted ? 1 : 0,
    nextPriority ? 1 : 0,
    new Date().toISOString(),
    id,
  );

  return {
    id: existing.id,
    content: nextContent,
    isCompleted: nextCompleted,
    isPriority: nextPriority,
    weekStart: existing.weekStart,
  };
}

export function deleteTask(id: string) {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  stmt.run(id);
}

