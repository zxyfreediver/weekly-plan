import { supabase } from "@/lib/supabase";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ImportResult = {
  imported: number;
  skipped: number;
  message?: string;
};

export async function importFromLastWeek(
  subCategoryId: string,
  thisWeekStart: string,
): Promise<ImportResult> {
  const lastWeekStart = addDays(thisWeekStart, -7);

  const { data: lastWeekTasks } = await supabase
    .from("tasks")
    .select("id, content, description, is_completed")
    .eq("sub_category_id", subCategoryId)
    .eq("week_start", lastWeekStart)
    .eq("is_completed", false);

  if (!lastWeekTasks || lastWeekTasks.length === 0) {
    return { imported: 0, skipped: 0, message: "上周暂无未完成任务" };
  }

  const { data: thisWeekTasks } = await supabase
    .from("tasks")
    .select("id, source_task_id")
    .eq("sub_category_id", subCategoryId)
    .eq("week_start", thisWeekStart);

  const existingSourceIds = new Set(
    (thisWeekTasks ?? [])
      .map((t) => t.source_task_id)
      .filter((id): id is string => !!id),
  );

  let imported = 0;
  let skipped = 0;

  for (const task of lastWeekTasks) {
    if (existingSourceIds.has(task.id)) {
      skipped++;
      continue;
    }

    const newTaskId = crypto.randomUUID();
    const { error: taskErr } = await supabase.from("tasks").insert({
      id: newTaskId,
      sub_category_id: subCategoryId,
      content: task.content,
      description: task.description ?? "",
      is_completed: false,
      week_start: thisWeekStart,
      source_task_id: task.id,
    });

    if (taskErr) throw taskErr;
    imported++;
    existingSourceIds.add(task.id);

    const { data: subTasks } = await supabase
      .from("sub_tasks")
      .select("id, content, description, assignee, is_completed, is_priority, due_date, sort_order")
      .eq("task_id", task.id)
      .eq("is_completed", false);

    for (const st of subTasks ?? []) {
      const newSubTaskId = crypto.randomUUID();
      const { error: stErr } = await supabase.from("sub_tasks").insert({
        id: newSubTaskId,
        task_id: newTaskId,
        content: st.content,
        description: st.description ?? "",
        assignee: st.assignee ?? "",
        is_completed: false,
        is_priority: st.is_priority ?? false,
        due_date: st.due_date ?? null,
        sort_order: st.sort_order ?? 0,
        source_sub_task_id: st.id,
      });

      if (stErr) throw stErr;

      const { data: progressList } = await supabase
        .from("sub_task_progress")
        .select("id, content, assignee, is_priority, is_completed, due_date, sort_order")
        .eq("sub_task_id", st.id)
        .eq("is_completed", false);

      for (const p of progressList ?? []) {
        const newProgressId = crypto.randomUUID();
        const { error: pErr } = await supabase.from("sub_task_progress").insert({
          id: newProgressId,
          sub_task_id: newSubTaskId,
          content: p.content,
          assignee: p.assignee ?? "",
          is_priority: p.is_priority ?? false,
          is_completed: false,
          due_date: p.due_date ?? null,
          sort_order: p.sort_order ?? 0,
          source_progress_id: p.id,
        });

        if (pErr) throw pErr;
      }
    }
  }

  return { imported, skipped };
}
