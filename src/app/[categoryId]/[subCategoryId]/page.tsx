"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

type Progress = {
  id: string;
  subTaskId: string;
  content: string;
  assignee: string;
  isPriority: boolean;
  isCompleted: boolean;
  dueDate: string | null;
  sortOrder: number;
};

type SubTask = {
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

type Task = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  weekStart: string;
  subTasks: SubTask[];
};

interface WeeklyTasksPageProps {
  params: Promise<{ categoryId: string; subCategoryId: string }>;
}

function getMondayOfWeek(d: Date): Date {
  const m = new Date(d);
  const day = m.getDay() || 7;
  m.setDate(m.getDate() - day + 1);
  return m;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getWeekInfoFromStart(start: string): {
  label: string;
  start: string;
  weekNumber: number;
  isoYear: number;
} {
  const monday = new Date(start + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const week1 = getMondayOfWeek(new Date(isoYear, 0, 4));
  const diffMs = monday.getTime() - week1.getTime();
  const weekNumber = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return {
    label: `${format(monday)} - ${format(sunday)}`,
    start,
    weekNumber,
    isoYear,
  };
}

function getWeeksInYear(
  year: number,
): { label: string; start: string; weekNumber: number; weekIndex: number }[] {
  const week1 = getMondayOfWeek(new Date(year, 0, 4));
  const weeks: { label: string; start: string; weekNumber: number; weekIndex: number }[] = [];
  const cur = new Date(week1);
  let idx = 0;
  while (cur.getFullYear() <= year) {
    idx++;
    const info = getWeekInfoFromStart(toDateString(cur));
    weeks.push({ ...info, weekIndex: idx });
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

function getInitialWeekStart(): string {
  const monday = getMondayOfWeek(new Date());
  return toDateString(monday);
}

export default function WeeklyTasksPage({ params }: WeeklyTasksPageProps) {
  const { categoryId, subCategoryId } = use(params);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getInitialWeekStart);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subCategoryName, setSubCategoryName] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [newSubTaskId, setNewSubTaskId] = useState<string | null>(null);
  const [newSubTaskContent, setNewSubTaskContent] = useState("");
  const [newSubTaskDesc, setNewSubTaskDesc] = useState("");
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState("");
  const [newSubTaskPriority, setNewSubTaskPriority] = useState(false);
  const [newSubTaskDueDate, setNewSubTaskDueDate] = useState("");
  const [editSubTask, setEditSubTask] = useState<SubTask | null>(null);
  const [editSubTaskContent, setEditSubTaskContent] = useState("");
  const [editSubTaskDesc, setEditSubTaskDesc] = useState("");
  const [editSubTaskAssignee, setEditSubTaskAssignee] = useState("");
  const [editSubTaskPriority, setEditSubTaskPriority] = useState(false);
  const [editSubTaskDueDate, setEditSubTaskDueDate] = useState("");
  const [deleteSubTaskConfirm, setDeleteSubTaskConfirm] = useState<string | null>(null);
  const [expandedSubTaskIds, setExpandedSubTaskIds] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [newProgressSubTaskId, setNewProgressSubTaskId] = useState<string | null>(null);
  const [newProgressContent, setNewProgressContent] = useState("");
  const [newProgressAssignee, setNewProgressAssignee] = useState("");
  const [newProgressPriority, setNewProgressPriority] = useState(false);
  const [newProgressDueDate, setNewProgressDueDate] = useState("");
  const [editProgress, setEditProgress] = useState<Progress | null>(null);
  const [editProgressContent, setEditProgressContent] = useState("");
  const [editProgressAssignee, setEditProgressAssignee] = useState("");
  const [editProgressPriority, setEditProgressPriority] = useState(false);
  const [editProgressDueDate, setEditProgressDueDate] = useState("");
  const [deleteProgressConfirm, setDeleteProgressConfirm] = useState<{
    id: string;
    taskId: string;
    subTaskId: string;
  } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importToast, setImportToast] = useState<string | null>(null);

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue";
    if (diffDays <= 3) return "urgent";
    return null;
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return "";
    const [y, m, d] = dueDate.split("-").map(Number);
    return `${y}年${m}月${d}日`;
  };

  const weekInfo = useMemo(
    () => getWeekInfoFromStart(selectedWeekStart),
    [selectedWeekStart],
  );
  const selectedYear = useMemo(
    () => new Date(selectedWeekStart + "T00:00:00").getFullYear(),
    [selectedWeekStart],
  );
  const weeksInYear = useMemo(() => getWeeksInYear(selectedYear), [selectedYear]);

  const goPrevWeek = () => {
    const d = new Date(selectedWeekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setSelectedWeekStart(toDateString(d));
  };
  const goNextWeek = () => {
    const d = new Date(selectedWeekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setSelectedWeekStart(toDateString(d));
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/categories/${categoryId}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as {
            name: string;
            subCategories: { id: string; name: string }[];
          };
          setCategoryName(data.name);
          const sub = data.subCategories.find((s) => s.id === subCategoryId);
          setSubCategoryName(sub?.name ?? null);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      }
    };
    void load();
    return () => controller.abort();
  }, [categoryId, subCategoryId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const url = `/api/tasks?subCategoryId=${encodeURIComponent(
        subCategoryId,
      )}&weekStart=${weekInfo.start}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: Task[] = await res.json();
      setTasks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const url = `/api/tasks?subCategoryId=${encodeURIComponent(
          subCategoryId,
        )}&weekStart=${weekInfo.start}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data: Task[] = await res.json();
        setTasks(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") console.error(error);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [categoryId, subCategoryId, weekInfo.start]);

  const handleImportFromLastWeek = async () => {
    setImportLoading(true);
    setImportToast(null);
    try {
      const res = await fetch("/api/tasks/import-from-last-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId,
          weekStart: weekInfo.start,
        }),
      });
      const data = (await res.json()) as {
        imported?: number;
        skipped?: number;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setImportToast(data.error ?? "导入失败");
        return;
      }
      if (data.message) {
        setImportToast(data.message);
      } else if ((data.imported ?? 0) > 0 || (data.skipped ?? 0) > 0) {
        setImportToast(
          `已导入 ${data.imported ?? 0} 项${(data.skipped ?? 0) > 0 ? `，跳过 ${data.skipped} 项（已存在）` : ""}`,
        );
      }
      if ((data.imported ?? 0) > 0) {
        await loadTasks();
      }
    } catch (error) {
      console.error(error);
      setImportToast("导入失败");
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportToast(null), 3000);
    }
  };

  const isEffectivePriority = (st: SubTask) =>
    st.isPriority ||
    (st.progress?.some((p) => p.isPriority && !p.isCompleted) ?? false);

  const getTaskStats = (task: Task) => {
    const total = task.subTasks.length;
    const completed = task.subTasks.filter((s) => s.isCompleted).length;
    const importantPending = task.subTasks.filter(
      (s) => isEffectivePriority(s) && !s.isCompleted,
    ).length;
    const unimportantPending = task.subTasks.filter(
      (s) => !s.isCompleted && !isEffectivePriority(s),
    ).length;
    return { total, completed, importantPending, unimportantPending };
  };

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      const ap = getTaskStats(a).importantPending;
      const bp = getTaskStats(b).importantPending;
      if (ap !== bp) return bp - ap; // 高优先级未完成多的排前面
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1; // 未完成排前面
      return 0;
    });
    return copy;
  }, [tasks]);

  const displayTasks = useMemo(() => {
    if (!hideCompleted) return sortedTasks;
    return sortedTasks.filter((t) => !t.isCompleted);
  }, [sortedTasks, hideCompleted]);

  const handleToggleCompleted = async (task: Task) => {
    const nextCompleted = !task.isCompleted;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, isCompleted: nextCompleted } : t,
      ),
    );
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditContent(task.content);
    setEditDescription(task.description);
    setEditSubmitting(false);
  };

  const toggleExpand = (task: Task) => {
    if (expandedTaskIds.has(task.id)) {
      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setNewSubTaskId(null);
      setEditSubTask(null);
      return;
    }
    setExpandedTaskIds((prev) => new Set(prev).add(task.id));
    setNewSubTaskContent("");
    setNewSubTaskDesc("");
    setNewSubTaskAssignee("");
    setNewSubTaskPriority(false);
    setNewSubTaskDueDate("");
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          description: editDescription,
        }),
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editTask.id
            ? { ...t, content: trimmed, description: editDescription }
            : t,
        ),
      );
      setEditTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) return;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDeleteConfirm(null);
      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async () => {
    const content = newTask.trim();
    if (!content) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId,
          content,
          weekStart: weekInfo.start,
        }),
      });
      if (!res.ok) return;
      const created: Task = await res.json();
      setTasks((prev) => [...prev, created]);
      setNewTask("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddSubTask = async (taskId: string) => {
    const content = newSubTaskContent.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/sub-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          description: newSubTaskDesc,
          assignee: newSubTaskAssignee.trim(),
          isPriority: newSubTaskPriority,
          dueDate: newSubTaskDueDate.trim() || null,
        }),
      });
      if (!res.ok) return;
      const created = (await res.json()) as SubTask;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: [
                  ...t.subTasks,
                  { ...created, progress: created.progress ?? [] },
                ],
              }
            : t,
        ),
      );
      setNewSubTaskContent("");
      setNewSubTaskDesc("");
      setNewSubTaskAssignee("");
      setNewSubTaskPriority(false);
      setNewSubTaskId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleSubTaskCompleted = async (taskId: string, st: SubTask) => {
    const nextCompleted = !st.isCompleted;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === st.id ? { ...s, isCompleted: nextCompleted } : s,
              ),
            }
          : t,
      ),
    );
    try {
      await fetch(`/api/sub-tasks/${st.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleSubTaskPriority = async (taskId: string, st: SubTask) => {
    const nextPriority = !st.isPriority;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === st.id ? { ...s, isPriority: nextPriority } : s,
              ),
            }
          : t,
      ),
    );
    try {
      await fetch(`/api/sub-tasks/${st.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPriority: nextPriority }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const openEditSubTask = (st: SubTask) => {
    setEditSubTask(st);
    setEditSubTaskContent(st.content);
    setEditSubTaskDesc(st.description);
    setEditSubTaskAssignee(st.assignee);
    setEditSubTaskPriority(st.isPriority);
    setEditSubTaskDueDate(st.dueDate ?? "");
  };

  const handleEditSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubTask) return;
    const trimmed = editSubTaskContent.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/sub-tasks/${editSubTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          description: editSubTaskDesc,
          assignee: editSubTaskAssignee.trim(),
          isPriority: editSubTaskPriority,
          dueDate: editSubTaskDueDate.trim() || null,
        }),
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editSubTask.taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((s) =>
                  s.id === editSubTask.id
                    ? {
                        ...s,
                        content: trimmed,
                        description: editSubTaskDesc,
                        assignee: editSubTaskAssignee.trim(),
                        isPriority: editSubTaskPriority,
                        dueDate: editSubTaskDueDate.trim() || null,
                      }
                    : s,
                ),
              }
            : t,
        ),
      );
      setEditSubTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubTask = async (taskId: string, subTaskId: string) => {
    try {
      const res = await fetch(`/api/sub-tasks/${subTaskId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.filter((s) => s.id !== subTaskId),
              }
            : t,
        ),
      );
      setDeleteSubTaskConfirm(null);
      setExpandedSubTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(subTaskId);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSubTaskExpand = (st: SubTask) => {
    if (expandedSubTaskIds.has(st.id)) {
      setExpandedSubTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(st.id);
        return next;
      });
      setNewProgressSubTaskId(null);
      setEditProgress(null);
      return;
    }
    setExpandedSubTaskIds((prev) => new Set(prev).add(st.id));
    setNewProgressContent("");
    setNewProgressAssignee("");
    setNewProgressPriority(false);
    setNewProgressDueDate("");
  };

  const expandAll = () => {
    const taskIds = new Set<string>();
    const subTaskIds = new Set<string>();
    for (const task of tasks) {
      taskIds.add(task.id);
      for (const st of task.subTasks ?? []) {
        if ((st.progress ?? []).length > 0) subTaskIds.add(st.id);
      }
    }
    setExpandedTaskIds(taskIds);
    setExpandedSubTaskIds(subTaskIds);
  };

  const collapseAll = () => {
    setExpandedTaskIds(new Set());
    setExpandedSubTaskIds(new Set());
    setNewSubTaskId(null);
    setNewProgressSubTaskId(null);
    setEditSubTask(null);
    setEditProgress(null);
  };

  const isAllExpanded = useMemo(() => {
    if (tasks.length === 0) return false;
    for (const t of tasks) {
      if (!expandedTaskIds.has(t.id)) return false;
    }
    for (const t of tasks) {
      for (const st of t.subTasks ?? []) {
        if ((st.progress ?? []).length > 0 && !expandedSubTaskIds.has(st.id))
          return false;
      }
    }
    return true;
  }, [tasks, expandedTaskIds, expandedSubTaskIds]);

  const handleAddProgress = async (taskId: string, subTaskId: string) => {
    const content = newProgressContent.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/sub-tasks/${subTaskId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          assignee: newProgressAssignee.trim(),
          isPriority: newProgressPriority,
          dueDate: newProgressDueDate.trim() || null,
        }),
      });
      if (!res.ok) return;
      const created: Progress = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((s) =>
                  s.id === subTaskId
                    ? {
                        ...s,
                        progress: [...(s.progress ?? []), created],
                      }
                    : s,
                ),
              }
            : t,
        ),
      );
      setNewProgressContent("");
      setNewProgressAssignee("");
      setNewProgressPriority(false);
      setNewProgressDueDate("");
      setNewProgressSubTaskId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProgressPriority = async (
    taskId: string,
    subTaskId: string,
    p: Progress,
  ) => {
    const nextPriority = !p.isPriority;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === subTaskId
                  ? {
                      ...s,
                      progress: (s.progress ?? []).map((pr) =>
                        pr.id === p.id ? { ...pr, isPriority: nextPriority } : pr,
                      ),
                    }
                  : s,
              ),
            }
          : t,
      ),
    );
    try {
      await fetch(`/api/progress/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPriority: nextPriority }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const openEditProgress = (p: Progress) => {
    setEditProgress(p);
    setEditProgressContent(p.content);
    setEditProgressAssignee(p.assignee);
    setEditProgressPriority(p.isPriority);
    setEditProgressDueDate(p.dueDate ?? "");
  };

  const handleEditProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProgress) return;
    const trimmed = editProgressContent.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/progress/${editProgress.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          assignee: editProgressAssignee.trim(),
          isPriority: editProgressPriority,
          dueDate: editProgressDueDate.trim() || null,
        }),
      });
      if (!res.ok) return;
      const task = tasks.find((t) =>
        t.subTasks.some((s) => s.progress?.some((p) => p.id === editProgress.id)),
      );
      if (task) {
        const subTask = task.subTasks.find((s) =>
          s.progress?.some((p) => p.id === editProgress.id),
        );
        if (subTask) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    subTasks: t.subTasks.map((s) =>
                      s.id === subTask.id
                        ? {
                            ...s,
                            progress: (s.progress ?? []).map((pr) =>
                              pr.id === editProgress.id
                                ? {
                                    ...pr,
                                    content: trimmed,
                                    assignee: editProgressAssignee.trim(),
                                    isPriority: editProgressPriority,
                                    dueDate: editProgressDueDate.trim() || null,
                                  }
                                : pr,
                            ),
                          }
                        : s,
                    ),
                  }
                : t,
            ),
          );
        }
      }
      setEditProgress(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProgress = async () => {
    if (!deleteProgressConfirm) return;
    const { id: progressId, taskId, subTaskId } = deleteProgressConfirm;
    try {
      const res = await fetch(`/api/progress/${progressId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((s) =>
                  s.id === subTaskId
                    ? {
                        ...s,
                        progress: (s.progress ?? []).filter((p) => p.id !== progressId),
                      }
                    : s,
                ),
              }
            : t,
        ),
      );
      setDeleteProgressConfirm(null);
    } catch (err) {
      console.error(err);
    }
  };

  const sortedProgress = (progress: Progress[]) =>
    [...(progress ?? [])].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return 0;
    });

  const completedSummary = useMemo(() => {
    type SubTaskGroup = { subTask: SubTask; progress: Progress[] };
    const result: {
      task: Task;
      hasTaskCompleted: boolean;
      subTaskGroups: SubTaskGroup[];
    }[] = [];
    for (const task of tasks) {
      const subTaskMap = new Map<string, SubTaskGroup>();
      for (const st of task.subTasks ?? []) {
        const completedProgress = (st.progress ?? []).filter((p) => p.isCompleted);
        if (st.isCompleted || completedProgress.length > 0) {
          subTaskMap.set(st.id, { subTask: st, progress: completedProgress });
        }
      }
      const hasTaskCompleted = task.isCompleted;
      if (hasTaskCompleted || subTaskMap.size > 0) {
        result.push({
          task,
          hasTaskCompleted,
          subTaskGroups: Array.from(subTaskMap.values()),
        });
      }
    }
    return result;
  }, [tasks]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildTaskSummaryText = (group: {
    task: Task;
    hasTaskCompleted: boolean;
    subTaskGroups: { subTask: SubTask; progress: Progress[] }[];
  }) => {
    const lines: string[] = [];
    lines.push(
      group.hasTaskCompleted ? `✓ ${group.task.content}` : group.task.content,
    );
    for (const { subTask, progress } of group.subTaskGroups) {
      if (subTask.isCompleted) {
        lines.push(`  ✓ ${subTask.content}`);
      }
      if (progress.length > 0) {
        if (!subTask.isCompleted) {
          lines.push(`  ${subTask.content}`);
        }
        for (const p of progress) {
          lines.push(`    ✓ ${p.content}`);
        }
      }
    }
    return lines.join("\n");
  };

  const buildFullSummaryText = () => {
    const header = `本周已完成 (${weekInfo.label})\n\n`;
    const body = completedSummary
      .map((g) => buildTaskSummaryText(g))
      .filter((s) => s.trim())
      .join("\n\n");
    return header + body;
  };

  const handleCopyTask = async (taskId: string) => {
    const group = completedSummary.find((g) => g.task.id === taskId);
    if (!group) return;
    const text = buildTaskSummaryText(group);
    await navigator.clipboard.writeText(text);
    setCopiedId(taskId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(buildFullSummaryText());
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleToggleProgressCompleted = async (
    taskId: string,
    subTaskId: string,
    p: Progress,
  ) => {
    const nextCompleted = !p.isCompleted;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === subTaskId
                  ? {
                      ...s,
                      progress: (s.progress ?? []).map((pr) =>
                        pr.id === p.id ? { ...pr, isCompleted: nextCompleted } : pr,
                      ),
                    }
                  : s,
              ),
            }
          : t,
      ),
    );
    try {
      await fetch(`/api/progress/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const sortedSubTasks = (subTasks: SubTask[]) =>
    [...subTasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return 0;
    });

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700 hover:underline">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/${categoryId}`}
          className="hover:text-slate-700 hover:underline"
        >
          {categoryName ?? categoryId}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">
          {subCategoryName ?? subCategoryId}
        </span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">周记清单</h1>
        <Link
          href={`/${categoryId}/${subCategoryId}/summary`}
          className="btn-primary"
        >
          ✨ AI 总结
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            aria-label="选择年份"
            onChange={(e) => {
              const y = Number(e.target.value);
              const weeks = getWeeksInYear(y);
              const inYear = weeks.find((w) => w.start === selectedWeekStart);
              setSelectedWeekStart(inYear ? inYear.start : weeks[0]?.start ?? selectedWeekStart);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            onClick={goPrevWeek}
            className="btn-ghost rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
          >
            上周
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setWeekPickerOpen((v) => !v)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
              title="选择周"
            >
              {weekInfo.label} ▾
            </button>
            {weekPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setWeekPickerOpen(false)}
                  aria-hidden
                />
                <div className="absolute left-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {weeksInYear.map((w) => (
                    <button
                      key={w.start}
                      type="button"
                      onClick={() => {
                        setSelectedWeekStart(w.start);
                        setWeekPickerOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        w.start === selectedWeekStart
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-700"
                      }`}
                    >
                      第{w.weekIndex}周 {w.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={goNextWeek}
            className="btn-ghost rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
          >
            下周
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={isAllExpanded ? collapseAll : expandAll}
            className="btn-ghost rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            {isAllExpanded ? "一键收起" : "一键展开"}
          </button>
          <button
            type="button"
            onClick={handleImportFromLastWeek}
            disabled={importLoading}
            title="将上周未完成的主任务、子任务、进度复制到本周，与本周任务合并"
            className="btn-ghost rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {importLoading ? "导入中…" : "导入上周未完成"}
          </button>
          {importToast && (
            <span className="text-xs text-slate-500">{importToast}</span>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            不展示已完成
          </label>
        </div>
      </div>

      <div className="card space-y-3 px-4 py-4">
        {loading ? (
          <div className="space-y-3 py-2 animate-in">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-4 w-4 shrink-0 rounded border border-slate-200 skeleton" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-16 skeleton rounded" />
                  <div className="h-3 w-24 skeleton rounded" />
                </div>
              </div>
            ))}
            <div className="flex justify-center pt-2">
              <div className="h-3 w-20 skeleton rounded" />
            </div>
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center animate-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              📝
            </div>
            <div className="text-sm font-medium text-slate-900">
              {hideCompleted ? "暂无未完成任务" : "本周还没有任务"}
            </div>
            <div className="text-xs text-slate-500">
              添加第一个任务，开始规划这一周吧
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {displayTasks.map((task) => (
              <li
                key={task.id}
                className={`overflow-hidden rounded-lg border transition-all duration-200 ${
                  expandedTaskIds.has(task.id)
                    ? "border-primary/25 bg-white shadow-md"
                    : "border-slate-100 bg-slate-50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(task)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
                        expandedTaskIds.has(task.id)
                          ? "bg-primary/15 text-primary"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      }`}
                      title={expandedTaskIds.has(task.id) ? "收起" : "展开"}
                    >
                      <span
                        className={`inline-block text-xs transition-transform duration-200 ${
                          expandedTaskIds.has(task.id) ? "rotate-0" : "-rotate-90"
                        }`}
                      >
                        ▼
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCompleted(task)}
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-primary"
                    >
                      {task.isCompleted ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(task)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`flex min-h-5 flex-wrap items-center gap-x-1.5 text-sm ${
                          task.isCompleted
                            ? "line-through text-slate-400"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {task.content}
                        {(() => {
                          const { total } = getTaskStats(task);
                          return total > 0 ? (
                            <span className="text-xs font-normal text-slate-500">
                              （共 {total} 子任务）
                            </span>
                          ) : null;
                        })()}
                      </span>
                      {(task.description ?? "") && (
                        <span
                          className={`mt-0.5 block line-clamp-1 text-xs text-slate-500 ${
                            task.isCompleted ? "line-through" : ""
                          }`}
                        >
                          {task.description}
                        </span>
                      )}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        {(() => {
                          const {
                            total,
                            completed,
                            importantPending,
                            unimportantPending,
                          } = getTaskStats(task);
                          if (total === 0) {
                            return (
                              <span className="text-slate-400">暂无子任务</span>
                            );
                          }
                          return (
                            <>
                              {importantPending > 0 && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                  {importantPending} 高优先级未完成
                                </span>
                              )}
                              {unimportantPending > 0 && (
                                <span>{unimportantPending} 普通未完成</span>
                              )}
                              {completed > 0 && (
                                <span>{completed} 已完成</span>
                              )}
                            </>
                          );
                        })()}
                      </span>
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(task.id)}
                      className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {expandedTaskIds.has(task.id) && (
                  <div className="animate-slide-down border-l-4 border-l-primary/40 border-t border-slate-100 bg-slate-50/50 px-3 py-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span>子任务</span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                      <ul className="space-y-1.5">
                        {sortedSubTasks(task.subTasks)
                          .filter((st) => !hideCompleted || !st.isCompleted)
                          .map((st) => (
                          <li
                            key={st.id}
                            className={`overflow-hidden rounded-lg border transition-colors ${
                              expandedSubTaskIds.has(st.id)
                                ? "border-primary/30 bg-white shadow-sm"
                                : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => toggleSubTaskExpand(st)}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
                                  expandedSubTaskIds.has(st.id)
                                    ? "bg-primary/15 text-primary"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                }`}
                                title={expandedSubTaskIds.has(st.id) ? "收起进度" : "展开进度"}
                              >
                                <span
                                  className={`inline-block text-[10px] transition-transform duration-200 ${
                                    expandedSubTaskIds.has(st.id)
                                      ? "rotate-0"
                                      : "-rotate-90"
                                  }`}
                                >
                                  ▼
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSubTaskCompleted(task.id, st)
                                }
                                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[8px] text-primary"
                              >
                                {st.isCompleted ? "✓" : ""}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSubTaskExpand(st)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span
                                  className={`text-sm ${
                                    st.isCompleted
                                      ? "line-through text-slate-400"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {st.content}
                                  {isEffectivePriority(st) ? (
                                    <span className="ml-1.5 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                      高优先级
                                    </span>
                                  ) : null}
                                  {!st.isCompleted &&
                                    getDueDateStatus(st.dueDate ?? null) ===
                                      "urgent" && (
                                      <span className="ml-1.5 shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                                        临期
                                      </span>
                                    )}
                                  {!st.isCompleted &&
                                    getDueDateStatus(st.dueDate ?? null) ===
                                      "overdue" && (
                                      <span className="ml-1.5 shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                                        已逾期
                                      </span>
                                    )}
                                </span>
                                {(st.description ||
                                  st.assignee ||
                                  (st.dueDate ?? "")) && (
                                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                                    {st.description && (
                                      <span className="line-clamp-1">
                                        {st.description}
                                      </span>
                                    )}
                                    {st.assignee && (
                                      <span className="text-slate-600">
                                        对接人: {st.assignee}
                                      </span>
                                    )}
                                    {st.dueDate && (
                                      <span className="text-slate-500">
                                        截止: {formatDueDate(st.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleSubTaskPriority(task.id, st)
                                  }
                                  className={`rounded px-1 py-0.5 text-xs hover:bg-slate-100 ${
                                    isEffectivePriority(st)
                                      ? "text-amber-600"
                                      : ""
                                  }`}
                                  title="优先级"
                                >
                                  ⭐
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditSubTask(st)}
                                  className="rounded px-1 py-0.5 text-xs hover:bg-slate-100"
                                  title="编辑"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteSubTaskConfirm(st.id)
                                  }
                                  className="rounded px-1 py-0.5 text-xs hover:bg-slate-100"
                                  title="删除"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            {expandedSubTaskIds.has(st.id) && (
                              <div className="animate-slide-down border-l-2 border-l-primary/30 border-t border-slate-100 bg-slate-50/80 px-2 py-2">
                                <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-600">
                                  <span className="h-px flex-1 bg-slate-200" />
                                  <span>进度</span>
                                  <span className="h-px flex-1 bg-slate-200" />
                                </div>
                                <ul className="space-y-1">
                                  {sortedProgress(st.progress ?? [])
                                    .filter((p) => !hideCompleted || !p.isCompleted)
                                    .map((p) => (
                                    <li
                                      key={p.id}
                                      className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50/80 px-2 py-1.5"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleProgressCompleted(
                                            task.id,
                                            st.id,
                                            p,
                                          )
                                        }
                                        className="flex h-3 w-3 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[8px] text-primary"
                                      >
                                        {p.isCompleted ? "✓" : ""}
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <span
                                          className={`text-xs ${
                                            p.isCompleted
                                              ? "line-through text-slate-400"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {p.content}
                                          {p.isPriority && (
                                            <span className="ml-1 rounded-full bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                                              高优先级
                                            </span>
                                          )}
                                          {!p.isCompleted &&
                                            getDueDateStatus(p.dueDate) === "urgent" && (
                                              <span className="ml-1 rounded-full bg-orange-100 px-1 py-0.5 text-[10px] font-medium text-orange-700">
                                                临期
                                              </span>
                                            )}
                                          {!p.isCompleted &&
                                            getDueDateStatus(p.dueDate) === "overdue" && (
                                              <span className="ml-1 rounded-full bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700">
                                                已逾期
                                              </span>
                                            )}
                                        </span>
                                        {(p.assignee || p.dueDate) && (
                                          <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                                            {p.assignee && (
                                              <span>对接人: {p.assignee}</span>
                                            )}
                                            {p.dueDate && (
                                              <span>
                                                截止: {formatDueDate(p.dueDate)}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex shrink-0 gap-0.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleProgressPriority(
                                              task.id,
                                              st.id,
                                              p,
                                            )
                                          }
                                          className={`rounded px-1 py-0.5 text-[10px] hover:bg-slate-100 ${
                                            p.isPriority ? "text-amber-600" : ""
                                          }`}
                                          title="优先级"
                                        >
                                          ⭐
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditProgress(p)}
                                          className="rounded px-1 py-0.5 text-[10px] hover:bg-slate-100"
                                          title="编辑"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteProgressConfirm({
                                              id: p.id,
                                              taskId: task.id,
                                              subTaskId: st.id,
                                            })
                                          }
                                          className="rounded px-1 py-0.5 text-[10px] hover:bg-slate-100"
                                          title="删除"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                {newProgressSubTaskId === st.id ? (
                                  <div className="mt-2 space-y-1.5 rounded border border-slate-200 bg-slate-50/80 p-2">
                                    <input
                                      type="text"
                                      value={newProgressContent}
                                      onChange={(e) =>
                                        setNewProgressContent(e.target.value)
                                      }
                                      placeholder="进度内容"
                                      className="input-base py-1.5 text-xs"
                                    />
                                    <input
                                      type="text"
                                      value={newProgressAssignee}
                                      onChange={(e) =>
                                        setNewProgressAssignee(e.target.value)
                                      }
                                      placeholder="对接人"
                                      className="input-base py-1.5 text-xs"
                                    />
                                    <input
                                      type="date"
                                      value={newProgressDueDate}
                                      onChange={(e) =>
                                        setNewProgressDueDate(e.target.value)
                                      }
                                      className="input-base py-1.5 text-xs"
                                    />
                                    <div className="flex items-center justify-between">
                                      <label className="flex items-center gap-1 text-xs text-slate-600">
                                        <input
                                          type="checkbox"
                                          checked={newProgressPriority}
                                          onChange={(e) =>
                                            setNewProgressPriority(
                                              e.target.checked,
                                            )
                                          }
                                          className="h-3 w-3 rounded border-slate-300 text-primary"
                                        />
                                        高优先级
                                      </label>
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setNewProgressSubTaskId(null);
                                            setNewProgressContent("");
                                            setNewProgressAssignee("");
                                            setNewProgressPriority(false);
                                            setNewProgressDueDate("");
                                          }}
                                          className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                                        >
                                          取消
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAddProgress(task.id, st.id)
                                          }
                                          disabled={!newProgressContent.trim()}
                                          className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-70"
                                        >
                                          添加
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewProgressSubTaskId(st.id);
                                      setNewProgressContent("");
                                      setNewProgressAssignee("");
                                      setNewProgressPriority(false);
                                      setNewProgressDueDate("");
                                    }}
                                    className="mt-2 rounded border border-dashed border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    + 添加进度
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                          ))}
                        </ul>
                        {newSubTaskId === task.id ? (
                          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <input
                              type="text"
                              value={newSubTaskContent}
                              onChange={(e) =>
                                setNewSubTaskContent(e.target.value)
                              }
                              placeholder="子任务内容"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="text"
                              value={newSubTaskAssignee}
                              onChange={(e) =>
                                setNewSubTaskAssignee(e.target.value)
                              }
                              placeholder="对接人"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <textarea
                              value={newSubTaskDesc}
                              onChange={(e) =>
                                setNewSubTaskDesc(e.target.value)
                              }
                              placeholder="描述"
                              rows={2}
                              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <div>
                              <label className="mb-1 block text-xs text-slate-500">
                                截止日期（选填）
                              </label>
                              <input
                                type="date"
                                value={newSubTaskDueDate}
                                onChange={(e) =>
                                  setNewSubTaskDueDate(e.target.value)
                                }
                                className="input-base"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={newSubTaskPriority}
                                  onChange={(e) =>
                                    setNewSubTaskPriority(e.target.checked)
                                  }
                                  className="h-3 w-3 rounded border-slate-300 text-primary"
                                />
                                高优先级
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewSubTaskId(null);
                                    setNewSubTaskContent("");
                                    setNewSubTaskDesc("");
                                    setNewSubTaskAssignee("");
                                    setNewSubTaskPriority(false);
                                    setNewSubTaskDueDate("");
                                  }}
                                  className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddSubTask(task.id)}
                                  disabled={!newSubTaskContent.trim()}
                                  className="rounded bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-70"
                                >
                                  添加
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setNewSubTaskId(task.id)}
                            className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                          >
                            + 添加子任务
                          </button>
                        )}
                      </div>
                    </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => !editSubmitting && setEditTask(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">编辑任务</h2>
            <form onSubmit={handleEditTask} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  任务内容
                </label>
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="任务内容"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  具体描述
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="添加具体描述..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !editSubmitting && setEditTask(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editContent.trim()}
                  className="btn-primary"
                >
                  {editSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      保存中...
                    </span>
                  ) : (
                    "保存"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editSubTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setEditSubTask(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">编辑子任务</h2>
            <form onSubmit={handleEditSubTask} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  子任务内容
                </label>
                <input
                  type="text"
                  value={editSubTaskContent}
                  onChange={(e) => setEditSubTaskContent(e.target.value)}
                  placeholder="子任务内容"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  对接人
                </label>
                <input
                  type="text"
                  value={editSubTaskAssignee}
                  onChange={(e) => setEditSubTaskAssignee(e.target.value)}
                  placeholder="输入对接人姓名"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  描述
                </label>
                <textarea
                  value={editSubTaskDesc}
                  onChange={(e) => setEditSubTaskDesc(e.target.value)}
                  placeholder="添加描述..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  截止日期（选填）
                </label>
                <input
                  type="date"
                  value={editSubTaskDueDate}
                  onChange={(e) => setEditSubTaskDueDate(e.target.value)}
                  className="input-base"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editSubTaskPriority}
                  onChange={(e) => setEditSubTaskPriority(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
                />
                高优先级
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditSubTask(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editSubTaskContent.trim()}
                  className="btn-primary"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProgress && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setEditProgress(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">编辑进度</h2>
            <form onSubmit={handleEditProgress} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  进度内容
                </label>
                <input
                  type="text"
                  value={editProgressContent}
                  onChange={(e) => setEditProgressContent(e.target.value)}
                  placeholder="进度内容"
                  className="input-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  对接人
                </label>
                <input
                  type="text"
                  value={editProgressAssignee}
                  onChange={(e) => setEditProgressAssignee(e.target.value)}
                  placeholder="对接人"
                  className="input-base"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  截止日期（选填）
                </label>
                <input
                  type="date"
                  value={editProgressDueDate}
                  onChange={(e) => setEditProgressDueDate(e.target.value)}
                  className="input-base"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editProgressPriority}
                  onChange={(e) => setEditProgressPriority(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
                />
                高优先级
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProgress(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editProgressContent.trim()}
                  className="btn-primary"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">删除任务</h2>
            <p className="mt-2 text-sm text-slate-600">
              确定要删除该任务吗？其下所有子任务也将被删除，此操作不可恢复。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSubTaskConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setDeleteSubTaskConfirm(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">删除子任务</h2>
            <p className="mt-2 text-sm text-slate-600">
              确定要删除该子任务吗？
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteSubTaskConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const task = tasks.find((t) =>
                    t.subTasks.some((s) => s.id === deleteSubTaskConfirm),
                  );
                  if (task)
                    handleDeleteSubTask(task.id, deleteSubTaskConfirm);
                  setDeleteSubTaskConfirm(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProgressConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setDeleteProgressConfirm(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">删除进度</h2>
            <p className="mt-2 text-sm text-slate-600">
              确定要删除该进度吗？
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteProgressConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteProgress();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-3 px-4 py-4">
        <div className="text-sm font-medium text-slate-800">添加任务</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="添加新任务..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="input-base flex-1"
          />
          <button
            type="button"
            onClick={handleAddTask}
            className="btn-primary text-xs"
          >
            添加
          </button>
        </div>
      </div>

      {completedSummary.length > 0 && !hideCompleted && (
        <div className="card overflow-hidden px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                ✓ 本周已完成
              </h3>
              <button
                type="button"
                onClick={handleCopyAll}
                className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                title="复制全部"
              >
                {copiedId === "all" ? "已复制" : "复制全部"}
              </button>
            </div>
            <span className="text-xs text-slate-500">{weekInfo.label}</span>
          </div>
          <div className="space-y-3">
            {completedSummary.map(({ task, hasTaskCompleted, subTaskGroups }) => (
              <div
                key={task.id}
                className="rounded-lg bg-slate-50/80 py-2"
              >
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {hasTaskCompleted && (
                      <>
                        <span className="shrink-0 text-primary">✓</span>
                        <span className="text-sm font-medium text-slate-800">
                          {task.content}
                        </span>
                      </>
                    )}
                    {!hasTaskCompleted && subTaskGroups.length > 0 && (
                      <span className="text-sm font-medium text-slate-700">
                        {task.content}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTask(task.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    title="复制此项"
                  >
                    {copiedId === task.id ? "已复制" : "复制"}
                  </button>
                </div>
                {subTaskGroups.map(({ subTask, progress }) => (
                  <div key={subTask.id} className="pl-4">
                    {subTask.isCompleted && (
                      <div className="flex items-center gap-2 px-2 py-0.5">
                        <span className="shrink-0 text-[10px] text-primary">
                          ✓
                        </span>
                        <span className="text-sm text-slate-600">
                          {subTask.content}
                        </span>
                      </div>
                    )}
                    {progress.length > 0 && !subTask.isCompleted && (
                      <div className="px-2 py-0.5 text-sm font-medium text-slate-600">
                        {subTask.content}
                      </div>
                    )}
                    {progress.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 pl-6 pr-2 py-0.5"
                      >
                        <span className="shrink-0 text-[10px] text-primary">
                          ✓
                        </span>
                        <span className="text-sm text-slate-600">
                          {p.content}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
