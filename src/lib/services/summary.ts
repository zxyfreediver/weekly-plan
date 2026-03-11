import { supabase } from "@/lib/supabase";
import { getSubTasksByTaskId } from "./sub_task";

export type CompletedItem = {
  type: "task" | "sub_task" | "progress";
  content: string;
  weekStart: string;
  assignee?: string;
  dueDate?: string | null;
};

/**
 * 获取指定子分类、日期范围内已完成的任务/子任务/进度，用于 AI 总结。
 * 周重叠条件：week_start + 6 >= startDate 且 week_start <= endDate
 */
export async function getCompletedTasksForSummary(
  subCategoryId: string,
  startDate: string,
  endDate: string,
): Promise<CompletedItem[]> {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");
  const minWeekStart = new Date(start);
  minWeekStart.setDate(minWeekStart.getDate() - 6);
  const minWeekStr = minWeekStart.toISOString().slice(0, 10);
  const maxWeekStr = endDate;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, content, is_completed, week_start")
    .eq("sub_category_id", subCategoryId)
    .gte("week_start", minWeekStr)
    .lte("week_start", maxWeekStr)
    .order("week_start");

  const items: CompletedItem[] = [];

  for (const t of tasks ?? []) {
    if (t.is_completed) {
      items.push({
        type: "task",
        content: t.content,
        weekStart: t.week_start,
      });
    }

    const subTasks = await getSubTasksByTaskId(t.id);
    for (const st of subTasks) {
      if (st.isCompleted) {
        items.push({
          type: "sub_task",
          content: st.content,
          weekStart: t.week_start,
          assignee: st.assignee || undefined,
          dueDate: st.dueDate,
        });
      }
      for (const p of st.progress) {
        if (p.isCompleted) {
          items.push({
            type: "progress",
            content: p.content,
            weekStart: t.week_start,
            assignee: p.assignee || undefined,
            dueDate: p.dueDate,
          });
        }
      }
    }
  }

  return items;
}
