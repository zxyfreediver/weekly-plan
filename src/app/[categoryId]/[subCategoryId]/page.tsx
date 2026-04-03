"use client";

import Link from "next/link";
import { startTransition, use, useEffect, useMemo, useState } from "react";
import { StarIcon } from "@/components/StarIcon";
import * as taskCache from "@/lib/taskCache";

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
  completedAt: string | null;
  subTasks: SubTask[];
};

type TaskStats = {
  total: number;
  completed: number;
  importantPending: number;
  unimportantPending: number;
  hasUrgent: boolean;
  hasOverdue: boolean;
};

type SubTaskView = {
  subTask: SubTask;
  isEffectivePriority: boolean;
  isDueDateUrgent: boolean;
  isDueDateOverdue: boolean;
  visibleProgress: Progress[];
};

type TaskView = {
  task: Task;
  stats: TaskStats;
  visibleSubTasks: SubTaskView[];
  subTaskCountLabel: string | null;
  summaryText: string;
};

interface WeeklyTasksPageProps {
  params: Promise<{ categoryId: string; subCategoryId: string }>;
}

const WEEK_STORAGE_KEY_PREFIX = "weekly-plan:selected-week:";
const WEEK_START_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function getDueDateStatus(dueDate: string | null) {
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
}

function isWithin24Hours(completedAt: string | null): boolean {
  if (!completedAt) return false;
  const diffMs = Date.now() - new Date(completedAt).getTime();
  return diffMs < 24 * 60 * 60 * 1000;
}

function sortSubTasks(subTasks: SubTask[]): SubTask[] {
  return [...subTasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
    return 0;
  });
}

function sortProgressItems(progress: Progress[]): Progress[] {
  return [...progress].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
    return 0;
  });
}

function buildTaskView(task: Task, hideCompleted: boolean, sortSubItems: boolean): TaskView {
  let completed = 0;
  let importantPending = 0;
  let unimportantPending = 0;
  let hasUrgent = false;
  let hasOverdue = false;

  const visibleSubTasks: SubTaskView[] = [];

  for (const subTask of sortSubItems ? sortSubTasks(task.subTasks) : task.subTasks) {
    const sortedProgress = sortSubItems ? sortProgressItems(subTask.progress ?? []) : (subTask.progress ?? []);
    const visibleProgress: Progress[] = [];
    let progressHasPriorityPending = false;
    let progressHasUrgent = false;
    let progressHasOverdue = false;

    for (const progress of sortedProgress) {
      if (!hideCompleted || !progress.isCompleted) {
        visibleProgress.push(progress);
      }

      if (progress.isCompleted) {
        continue;
      }

      if (progress.isPriority) {
        progressHasPriorityPending = true;
      }

      const progressDueStatus = getDueDateStatus(progress.dueDate);
      if (progressDueStatus === "overdue") {
        progressHasOverdue = true;
      } else if (progressDueStatus === "urgent") {
        progressHasUrgent = true;
      }
    }

    const subTaskDueStatus = !subTask.isCompleted
      ? getDueDateStatus(subTask.dueDate ?? null)
      : null;
    const isDueDateOverdue =
      subTaskDueStatus === "overdue" || progressHasOverdue;
    const isDueDateUrgent =
      !isDueDateOverdue &&
      (subTaskDueStatus === "urgent" || progressHasUrgent);
    const isEffectivePriority =
      subTask.isPriority || progressHasPriorityPending;

    if (subTask.isCompleted) {
      completed += 1;
    } else if (isEffectivePriority) {
      importantPending += 1;
    } else {
      unimportantPending += 1;
    }

    if (isDueDateOverdue) {
      hasOverdue = true;
    }
    if (isDueDateUrgent) {
      hasUrgent = true;
    }

    if (!hideCompleted || !subTask.isCompleted) {
      visibleSubTasks.push({
        subTask,
        isEffectivePriority,
        isDueDateUrgent,
        isDueDateOverdue,
        visibleProgress,
      });
    }
  }

  const stats: TaskStats = {
    total: task.subTasks.length,
    completed,
    importantPending,
    unimportantPending,
    hasUrgent,
    hasOverdue,
  };

  let summaryText = "暂无子任务";
  if (stats.total > 0) {
    const parts: string[] = [];
    if (stats.importantPending > 0) {
      parts.push(`${stats.importantPending} 高优未完成`);
    }
    if (stats.hasOverdue) {
      parts.push("含逾期");
    } else if (stats.hasUrgent) {
      parts.push("含临期");
    }
    if (stats.unimportantPending > 0) {
      parts.push(`${stats.unimportantPending} 普通未完成`);
    }
    if (stats.completed > 0) {
      parts.push(`${stats.completed} 已完成`);
    }
    summaryText = parts.join(" · ");
  }

  return {
    task,
    stats,
    visibleSubTasks,
    subTaskCountLabel:
      stats.total > 0 ? `（共 ${stats.total} 子任务）` : null,
    summaryText,
  };
}

export default function WeeklyTasksPage({ params }: WeeklyTasksPageProps) {
  const { categoryId, subCategoryId } = use(params);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getInitialWeekStart);
  const [isWeekReady, setIsWeekReady] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subCategoryName, setSubCategoryName] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");
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
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [addSubTaskLoading, setAddSubTaskLoading] = useState<string | null>(null);
  const [addProgressLoading, setAddProgressLoading] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return "";
    const [y, m, d] = dueDate.split("-").map(Number);
    return `${y}年${m}月${d}日`;
  };

  const formatCompletedTime = (completedAt: string | null) => {
    if (!completedAt) return "";
    const d = new Date(completedAt);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${month}月${day}日 ${hour}:${minute}`;
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

  const selectWeekStart = (weekStart: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `${WEEK_STORAGE_KEY_PREFIX}${subCategoryId}`,
        weekStart,
      );
    }
    startTransition(() => {
      setSelectedWeekStart(weekStart);
    });
  };

  const goPrevWeek = () => {
    const d = new Date(selectedWeekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    selectWeekStart(toDateString(d));
  };
  const goNextWeek = () => {
    const d = new Date(selectedWeekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    selectWeekStart(toDateString(d));
  };

  useEffect(() => {
    const storageKey = `${WEEK_STORAGE_KEY_PREFIX}${subCategoryId}`;
    const currentWeekStart = getInitialWeekStart();
    const savedWeekStart =
      typeof window !== "undefined"
        ? window.localStorage.getItem(storageKey)
        : null;

    if (savedWeekStart && WEEK_START_PATTERN.test(savedWeekStart)) {
      setSelectedWeekStart(savedWeekStart);
    } else {
      setSelectedWeekStart(currentWeekStart);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, currentWeekStart);
      }
    }

    setIsWeekReady(true);
  }, [subCategoryId]);

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

  const loadTasks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const url = `/api/tasks?subCategoryId=${encodeURIComponent(
        subCategoryId,
      )}&weekStart=${weekInfo.start}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: Task[] = await res.json();
      setTasks(data);
      await taskCache.setTasks(subCategoryId, weekInfo.start, data);
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const persistTasks = (data: Task[]) => {
    void taskCache.setTasks(subCategoryId, weekInfo.start, data);
  };

  useEffect(() => {
    if (!isWeekReady) {
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      const cached = await taskCache.getTasks(subCategoryId, weekInfo.start);
      if (cached !== null) {
        setTasks(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      try {
        const url = `/api/tasks?subCategoryId=${encodeURIComponent(
          subCategoryId,
        )}&weekStart=${weekInfo.start}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data: Task[] = await res.json();
        setTasks(data);
        await taskCache.setTasks(subCategoryId, weekInfo.start, data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") console.error(error);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [categoryId, isWeekReady, subCategoryId, weekInfo.start]);

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

  const taskViews = useMemo(
    () => tasks.map((task) => buildTaskView(task, hideCompleted, expandedTaskIds.has(task.id))),
    [tasks, hideCompleted, expandedTaskIds],
  );

  const sortedTaskViews = useMemo(() => {
    const copy = [...taskViews];
    copy.sort((a, b) => {
      const ap = a.stats.importantPending;
      const bp = b.stats.importantPending;
      if (ap !== bp) return bp - ap; // 高优先级未完成多的排前面
      if (a.task.isCompleted !== b.task.isCompleted) {
        return a.task.isCompleted ? 1 : -1; // 未完成排前面
      }
      return 0;
    });
    return copy;
  }, [taskViews]);

  const displayTaskViews = useMemo(() => {
    if (!hideCompleted) return sortedTaskViews;
    return sortedTaskViews.filter(({ task }) => !task.isCompleted);
  }, [sortedTaskViews, hideCompleted]);

  const handleToggleCompleted = async (task: Task) => {
    const nextCompleted = !task.isCompleted;
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
        t.id === task.id ? { ...t, isCompleted: nextCompleted } : t,
      );
      return nextTasks;
    });
    persistTasks(nextTasks);
    if (task.id.startsWith("temp_")) return;
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (error) {
      console.error(error);
      setSaveToast("同步失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditContent(task.content);
    setEditDescription(task.description);
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
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
        t.id === editTask.id
          ? { ...t, content: trimmed, description: editDescription }
          : t,
      );
      return nextTasks;
    });
    setEditTask(null);
    persistTasks(nextTasks);
    if (editTask.id.startsWith("temp_")) return;
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          description: editDescription,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "保存失败，正在刷新");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const prevTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(prevTasks);
    setDeleteConfirm(null);
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    persistTasks(prevTasks);
    if (taskId.startsWith("temp_")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "删除失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const handleAddTask = async () => {
    const content = newTask.trim();
    if (!content) return;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempTask: Task = {
      id: tempId,
      content,
      description: "",
      isCompleted: false,
      weekStart: weekInfo.start,
      completedAt: null,
      subTasks: [],
    };
    setTasks((prev) => {
      const next = [...prev, tempTask];
      persistTasks(next);
      return next;
    });
    setNewTask("");
    setAddTaskLoading(true);
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
      if (!res.ok) throw new Error("添加失败");
      const created: Task = await res.json();
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === tempId ? created : t));
        persistTasks(next);
        return next;
      });
    } catch (error) {
      setSaveToast(error instanceof Error ? error.message : "添加失败");
      setTimeout(() => setSaveToast(null), 3000);
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== tempId);
        persistTasks(next);
        return next;
      });
      void loadTasks(false);
    } finally {
      setAddTaskLoading(false);
    }
  };

  const handleAddSubTask = async (taskId: string) => {
    const content = newSubTaskContent.trim();
    if (!content) return;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempSubTask: SubTask = {
      id: tempId,
      taskId,
      content,
      description: newSubTaskDesc,
      assignee: newSubTaskAssignee.trim(),
      isCompleted: false,
      isPriority: newSubTaskPriority,
      sortOrder: 0,
      dueDate: newSubTaskDueDate.trim() || null,
      progress: [],
    };
    setAddSubTaskLoading(taskId);
    setNewSubTaskId(null);
    setNewSubTaskContent("");
    setNewSubTaskDesc("");
    setNewSubTaskAssignee("");
    setNewSubTaskPriority(false);
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: [...t.subTasks, { ...tempSubTask, progress: [] }],
            }
          : t,
      );
      persistTasks(next);
      return next;
    });
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
      if (!res.ok) throw new Error("添加失败");
      const created = (await res.json()) as SubTask;
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((s) =>
                  s.id === tempId ? { ...created, progress: created.progress ?? [] } : s,
                ),
              }
            : t,
        );
        persistTasks(next);
        return next;
      });
    } catch (error) {
      setSaveToast(error instanceof Error ? error.message : "添加失败");
      setTimeout(() => setSaveToast(null), 3000);
      setNewSubTaskId(taskId);
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.filter((s) => s.id !== tempId),
              }
            : t,
        );
        persistTasks(next);
        return next;
      });
      void loadTasks(false);
    } finally {
      setAddSubTaskLoading(null);
    }
  };

  const handleToggleSubTaskCompleted = async (taskId: string, st: SubTask) => {
    const nextCompleted = !st.isCompleted;
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === st.id ? { ...s, isCompleted: nextCompleted } : s,
              ),
            }
          : t,
      );
      return nextTasks;
    });
    persistTasks(nextTasks);
    if (st.id.startsWith("temp_")) return;
    try {
      await fetch(`/api/sub-tasks/${st.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (error) {
      console.error(error);
      setSaveToast("同步失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const handleToggleSubTaskPriority = async (taskId: string, st: SubTask) => {
    const nextPriority = !st.isPriority;
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === st.id ? { ...s, isPriority: nextPriority } : s,
              ),
            }
          : t,
      );
      return nextTasks;
    });
    persistTasks(nextTasks);
    if (st.id.startsWith("temp_")) return;
    try {
      await fetch(`/api/sub-tasks/${st.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPriority: nextPriority }),
      });
    } catch (error) {
      console.error(error);
      setSaveToast("同步失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
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
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
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
      );
      return nextTasks;
    });
    setEditSubTask(null);
    persistTasks(nextTasks);
    if (editSubTask.id.startsWith("temp_")) return;
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
      if (!res.ok) throw new Error("保存失败");
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "保存失败，正在刷新");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const handleDeleteSubTask = async (taskId: string, subTaskId: string) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.filter((s) => s.id !== subTaskId),
            }
          : t,
      );
      return nextTasks;
    });
    setDeleteSubTaskConfirm(null);
    setExpandedSubTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(subTaskId);
      return next;
    });
    persistTasks(nextTasks);
    if (subTaskId.startsWith("temp_")) return;
    try {
      const res = await fetch(`/api/sub-tasks/${subTaskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "删除失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
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
    if (taskViews.length === 0) return false;
    for (const { task } of taskViews) {
      if (!expandedTaskIds.has(task.id)) return false;
    }
    for (const { task } of taskViews) {
      for (const st of task.subTasks ?? []) {
        if ((st.progress ?? []).length > 0 && !expandedSubTaskIds.has(st.id))
          return false;
      }
    }
    return true;
  }, [taskViews, expandedTaskIds, expandedSubTaskIds]);

  const handleAddProgress = async (taskId: string, subTaskId: string) => {
    if (subTaskId.startsWith("temp_")) return;
    const content = newProgressContent.trim();
    if (!content) return;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempProgress: Progress = {
      id: tempId,
      subTaskId,
      content,
      assignee: newProgressAssignee.trim(),
      isPriority: newProgressPriority,
      isCompleted: false,
      dueDate: newProgressDueDate.trim() || null,
      sortOrder: 0,
    };
    const key = `${taskId}-${subTaskId}`;
    setAddProgressLoading(key);
    setNewProgressSubTaskId(null);
    setNewProgressContent("");
    setNewProgressAssignee("");
    setNewProgressPriority(false);
    setNewProgressDueDate("");
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subTasks: t.subTasks.map((s) =>
                s.id === subTaskId
                  ? {
                      ...s,
                      progress: [...(s.progress ?? []), tempProgress],
                    }
                  : s,
              ),
            }
          : t,
      );
      persistTasks(next);
      return next;
    });
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
      if (!res.ok) throw new Error("添加失败");
      const created = (await res.json()) as Progress;
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((s) =>
                  s.id === subTaskId
                    ? {
                        ...s,
                        progress: (s.progress ?? []).map((p) =>
                          p.id === tempId ? created : p,
                        ),
                      }
                    : s,
                ),
              }
            : t,
        );
        persistTasks(next);
        return next;
      });
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "添加失败");
      setTimeout(() => setSaveToast(null), 3000);
      setNewProgressSubTaskId(subTaskId);
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((s) =>
                  s.id === subTaskId
                    ? {
                        ...s,
                        progress: (s.progress ?? []).filter((p) => p.id !== tempId),
                      }
                    : s,
                ),
              }
            : t,
        );
        persistTasks(next);
        return next;
      });
      void loadTasks(false);
    } finally {
      setAddProgressLoading(null);
    }
  };

  const handleToggleProgressPriority = async (
    taskId: string,
    subTaskId: string,
    p: Progress,
  ) => {
    const nextPriority = !p.isPriority;
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
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
      );
      return nextTasks;
    });
    persistTasks(nextTasks);
    if (p.id.startsWith("temp_")) return;
    try {
      await fetch(`/api/progress/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPriority: nextPriority }),
      });
    } catch (err) {
      console.error(err);
      setSaveToast("同步失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
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
    const task = tasks.find((t) =>
      t.subTasks.some((s) => s.progress?.some((p) => p.id === editProgress.id)),
    );
    const subTask = task?.subTasks.find((s) =>
      s.progress?.some((p) => p.id === editProgress.id),
    );
    let nextTasks: Task[] = [];
    if (task && subTask) {
      setTasks((prev) => {
        nextTasks = prev.map((t) =>
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
        );
        return nextTasks;
      });
      persistTasks(nextTasks);
    }
    setEditProgress(null);
    if (editProgress.id.startsWith("temp_")) return;
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
      if (!res.ok) throw new Error("保存失败");
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "保存失败，正在刷新");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const handleDeleteProgress = async () => {
    if (!deleteProgressConfirm) return;
    const { id: progressId, taskId, subTaskId } = deleteProgressConfirm;
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
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
      );
      return nextTasks;
    });
    setDeleteProgressConfirm(null);
    persistTasks(nextTasks);
    if (progressId.startsWith("temp_")) return;
    try {
      const res = await fetch(`/api/progress/${progressId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
    } catch (err) {
      setSaveToast(err instanceof Error ? err.message : "删除失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  const completedSummary = useMemo(() => {
    type SubTaskGroup = { subTask: SubTask; progress: Progress[] };
    type CompletedGroup = {
      task: Task;
      hasTaskCompleted: boolean;
      subTaskGroups: SubTaskGroup[];
      isRecentlyCompleted: boolean;
    };
    const result: CompletedGroup[] = [];
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
          isRecentlyCompleted: hasTaskCompleted && isWithin24Hours(task.completedAt),
        });
      }
    }
    return result;
  }, [tasks]);

  const dashboardStats = useMemo(() => {
    const activeCount = displayTaskViews.filter(({ task }) => !task.isCompleted).length;
    const priorityCount = displayTaskViews.filter(
      ({ stats }) => stats.importantPending > 0,
    ).length;
    const attentionCount = displayTaskViews.filter(
      ({ stats }) => stats.hasOverdue || stats.hasUrgent,
    ).length;

    return {
      activeCount,
      priorityCount,
      attentionCount,
      completedCount: completedSummary.length,
    };
  }, [completedSummary.length, displayTaskViews]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildTaskSummaryText = (group: {
    task: Task;
    hasTaskCompleted: boolean;
    subTaskGroups: { subTask: SubTask; progress: Progress[] }[];
    isRecentlyCompleted: boolean;
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
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) =>
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
      );
      return nextTasks;
    });
    persistTasks(nextTasks);
    if (p.id.startsWith("temp_")) return;
    try {
      await fetch(`/api/progress/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (err) {
      console.error(err);
      setSaveToast("同步失败");
      setTimeout(() => setSaveToast(null), 3000);
      void loadTasks(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="stat-pill no-underline hover:text-slate-700">
                首页
              </Link>
              <span className="text-slate-300">/</span>
              <Link
                href={`/${categoryId}`}
                className="stat-pill no-underline hover:text-slate-700"
              >
                {categoryName ?? categoryId}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="stat-pill border-primary/10 bg-primary/10 text-primary">
                {subCategoryName ?? subCategoryId}
              </span>
            </nav>

            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/70">
                Weekly Board
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {subCategoryName ?? "周记清单"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                当前周内的主任务、子任务和进度都在这里维护，适合快速浏览和持续推进。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="stat-pill">
                {weekInfo.isoYear} 第{weekInfo.weekNumber}周
              </span>
              <span className="stat-pill">{dashboardStats.activeCount} 个进行中任务</span>
              <span className="stat-pill">{dashboardStats.priorityCount} 个高优任务</span>
              <span className="stat-pill">{dashboardStats.completedCount} 组已完成摘要</span>
              {dashboardStats.attentionCount > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {dashboardStats.attentionCount} 项需要关注
                </span>
              )}
            </div>
          </div>

          <div className="card min-w-[280px] max-w-sm px-5 py-5">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Current Week
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-900">
              {weekInfo.label}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              周切换、任务补录和 AI 总结都从这里开始。
            </p>
            <Link
              href={`/${categoryId}/${subCategoryId}/summary`}
              className="btn-primary mt-4 no-underline"
            >
              ✨ AI 总结
            </Link>
          </div>
        </div>
      </section>

      <section className="card space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              aria-label="选择年份"
              onChange={(e) => {
                const y = Number(e.target.value);
                const weeks = getWeeksInYear(y);
                const inYear = weeks.find((w) => w.start === selectedWeekStart);
                selectWeekStart(
                  inYear ? inYear.start : weeks[0]?.start ?? selectedWeekStart,
                );
              }}
              className="select-base"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                (y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ),
              )}
            </select>
            <button type="button" onClick={goPrevWeek} className="btn-ghost text-xs">
              上周
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setWeekPickerOpen((v) => !v)}
                className="btn-ghost px-4 text-xs font-medium text-slate-800"
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
                  <div className="absolute left-0 top-full z-50 mt-2 max-h-64 min-w-[280px] overflow-y-auto rounded-3xl border border-white/90 bg-white/92 p-2 shadow-[0_24px_60px_rgba(148,163,184,0.22)] backdrop-blur-xl">
                    {weeksInYear.map((w) => (
                      <button
                        key={w.start}
                        type="button"
                        onClick={() => {
                          selectWeekStart(w.start);
                          setWeekPickerOpen(false);
                        }}
                        className={`block w-full rounded-2xl px-3 py-2 text-left text-xs transition-colors duration-150 hover:bg-slate-50 ${
                          w.start === selectedWeekStart
                            ? "bg-primary/10 font-medium text-primary"
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
            <button type="button" onClick={goNextWeek} className="btn-ghost text-xs">
              下周
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={isAllExpanded ? collapseAll : expandAll}
              className="btn-ghost text-xs"
            >
              {isAllExpanded ? "一键收起" : "一键展开"}
            </button>
            <button
              type="button"
              onClick={handleImportFromLastWeek}
              disabled={importLoading}
              title="将上周未完成的主任务、子任务、进度复制到本周，与本周任务合并"
              className="btn-secondary text-xs"
            >
              {importLoading ? "导入中…" : "导入上周未完成"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
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

        {(importToast || saveToast) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {importToast && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
                {importToast}
              </span>
            )}
            {saveToast && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {saveToast}
              </span>
            )}
          </div>
        )}
      </section>

      <div className="card space-y-2 px-2 py-2 sm:px-3 sm:py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">本周任务</h2>
            <p className="mt-1 text-sm text-slate-500">
              任务已按优先级和完成状态整理，展开后可继续维护子任务与进度。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="stat-pill">{displayTaskViews.length} 个任务分组</span>
            <span className="stat-pill">{hideCompleted ? "已隐藏完成项" : "显示全部任务"}</span>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3 py-2 animate-in">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-3xl border border-white/80 bg-white/78 px-4 py-4 shadow-sm"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 shrink-0 skeleton" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-2.5 w-32 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayTaskViews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center animate-in">
            <div className="icon-badge h-16 w-16 rounded-full text-2xl">
              📝
            </div>
            <div className="text-base font-medium text-slate-900">
              {hideCompleted ? "暂无未完成任务" : "本周还没有任务"}
            </div>
            <div className="max-w-sm text-sm leading-6 text-slate-500">
              添加第一个任务，开始规划这一周吧
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {displayTaskViews.map(
              ({ task, visibleSubTasks, subTaskCountLabel, summaryText }) => (
              <li
                key={task.id}
                className={`rounded-2xl border px-3 py-2.5 shadow-[0_14px_32px_rgba(148,163,184,0.1)] transition-colors duration-200 ${
                  task.isCompleted
                    ? "border-slate-200/80 bg-white/70"
                    : "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,250,255,0.92))]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(task)}
                      className="mt-0.5 shrink-0 w-5 text-left text-xs text-slate-500 transition-colors duration-150 hover:text-slate-800"
                      title={expandedTaskIds.has(task.id) ? "收起" : "展开"}
                    >
                      <span
                        className={`inline-block transition-transform duration-150 ${
                          expandedTaskIds.has(task.id) ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▶
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCompleted(task)}
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-primary shadow-sm"
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
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {task.content}
                        {subTaskCountLabel ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                            {subTaskCountLabel}
                          </span>
                        ) : null}
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
                      <span className="mt-2 inline-flex rounded-full bg-slate-100/80 px-2.5 py-1 text-[11px] text-slate-500">
                        {summaryText}
                      </span>
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="btn-ghost h-8 w-8 p-0 text-sm"
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(task.id)}
                      className="btn-ghost h-8 w-8 p-0 text-sm"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {expandedTaskIds.has(task.id) && (
                  <div className="mt-2 space-y-1.5 border-t border-slate-100/90 pt-2">
                    <ul className="space-y-1">
                        {visibleSubTasks.map(
                          ({
                            subTask: st,
                            isEffectivePriority,
                            isDueDateUrgent,
                            isDueDateOverdue,
                            visibleProgress,
                          }) => (
                          <li
                            key={st.id}
                            className="rounded-xl border border-emerald-100/70 bg-emerald-50/55 px-2.5 py-2 shadow-[0_10px_24px_rgba(167,243,208,0.12)]"
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => toggleSubTaskExpand(st)}
                                className="mt-0.5 shrink-0 w-4 text-left text-[10px] text-slate-500 transition-colors duration-150 hover:text-slate-800"
                                title={expandedSubTaskIds.has(st.id) ? "收起进度" : "展开进度"}
                              >
                                <span
                                  className={`inline-block transition-transform duration-150 ${
                                    expandedSubTaskIds.has(st.id)
                                      ? "rotate-90"
                                      : "rotate-0"
                                  }`}
                                >
                                  ▶
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSubTaskCompleted(task.id, st)
                                }
                                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[8px] text-primary shadow-sm"
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
                                      : "text-slate-800"
                                  }`}
                                >
                                  {st.content}
                                  {isEffectivePriority ? (
                                    <span className="ml-1 text-xs text-amber-700">
                                      [高优]
                                    </span>
                                  ) : null}
                                  {isDueDateOverdue && (
                                    <span className="ml-1 text-xs text-red-600">
                                      逾期
                                    </span>
                                  )}
                                  {isDueDateUrgent && !isDueDateOverdue && (
                                      <span className="ml-1 text-xs text-orange-700">
                                        临期
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
                                  className={`btn-ghost h-7 w-7 p-0 text-xs ${
                                    isEffectivePriority
                                      ? "text-amber-500"
                                      : "text-slate-300"
                                  }`}
                                  title="优先级"
                                >
                                  <StarIcon size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditSubTask(st)}
                                  className="btn-ghost h-7 w-7 p-0 text-xs"
                                  title="编辑"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteSubTaskConfirm(st.id)
                                  }
                                  className="btn-ghost h-7 w-7 p-0 text-xs"
                                  title="删除"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            {expandedSubTaskIds.has(st.id) && (
                              <div className="mt-2 space-y-1.5 rounded-xl border border-white/75 bg-white/76 px-2.5 py-2">
                                <ul className="space-y-1">
                                  {visibleProgress.map((p) => (
                                    <li
                                      key={p.id}
                                      className="flex items-start gap-2 rounded-xl bg-white/86 px-2 py-1.5 text-xs shadow-sm"
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
                                        className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[8px] text-primary shadow-sm"
                                      >
                                        {p.isCompleted ? "✓" : ""}
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <span
                                          className={
                                            p.isCompleted
                                              ? "line-through text-slate-400"
                                              : "text-slate-700"
                                          }
                                        >
                                          {p.content}
                                          {p.isPriority && (
                                            <span className="ml-1 text-amber-700">
                                              [高优]
                                            </span>
                                          )}
                                          {!p.isCompleted &&
                                            getDueDateStatus(p.dueDate) === "urgent" && (
                                              <span className="ml-1 text-orange-700">
                                                临期
                                              </span>
                                            )}
                                          {!p.isCompleted &&
                                            getDueDateStatus(p.dueDate) === "overdue" && (
                                              <span className="ml-1 text-red-600">
                                                逾期
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
                                      <div className="flex shrink-0 gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleProgressPriority(
                                              task.id,
                                              st.id,
                                              p,
                                            )
                                          }
                                          className={`btn-ghost h-6 w-6 p-0 text-[10px] ${
                                            p.isPriority ? "text-amber-500" : "text-slate-300"
                                          }`}
                                          title="优先级"
                                        >
                                          <StarIcon size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditProgress(p)}
                                          className="btn-ghost h-6 w-6 p-0 text-[10px]"
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
                                          className="btn-ghost h-6 w-6 p-0 text-[10px]"
                                          title="删除"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                {newProgressSubTaskId === st.id ? (
                                  <div className="mt-2 space-y-2 rounded-3xl border border-slate-200/80 bg-white/92 p-3">
                                    <input
                                      type="text"
                                      value={newProgressContent}
                                      onChange={(e) =>
                                        setNewProgressContent(e.target.value)
                                      }
                                      placeholder="进度内容"
                                      className="input-base py-2 text-xs"
                                    />
                                    <input
                                      type="text"
                                      value={newProgressAssignee}
                                      onChange={(e) =>
                                        setNewProgressAssignee(e.target.value)
                                      }
                                      placeholder="对接人"
                                      className="input-base py-2 text-xs"
                                    />
                                    <input
                                      type="date"
                                      value={newProgressDueDate}
                                      onChange={(e) =>
                                        setNewProgressDueDate(e.target.value)
                                      }
                                      className="input-base py-2 text-xs"
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
                                          className="btn-secondary px-3 py-1.5 text-xs"
                                        >
                                          取消
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAddProgress(task.id, st.id)
                                          }
                                          disabled={
                                            !newProgressContent.trim() ||
                                            addProgressLoading ===
                                              `${task.id}-${st.id}`
                                          }
                                          className="btn-primary px-3 py-1.5 text-xs"
                                        >
                                          {addProgressLoading ===
                                          `${task.id}-${st.id}` ? (
                                            <span className="inline-flex items-center gap-1">
                                              <span className="h-2 w-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                              添加中
                                            </span>
                                          ) : (
                                            "添加"
                                          )}
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
                                    disabled={
                                      addProgressLoading ===
                                      `${task.id}-${st.id}`
                                    }
                                    className="mt-2 inline-flex rounded-full bg-white/90 px-3 py-1.5 text-left text-xs text-slate-500 shadow-sm transition-colors duration-150 hover:text-slate-800 disabled:opacity-70"
                                  >
                                    {addProgressLoading ===
                                    `${task.id}-${st.id}` ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                        添加中...
                                      </span>
                                    ) : (
                                      "+ 添加进度"
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                        {newSubTaskId === task.id ? (
                          <div className="mt-3 space-y-2 rounded-3xl border border-slate-200/80 bg-white/86 p-3">
                            <input
                              type="text"
                              value={newSubTaskContent}
                              onChange={(e) =>
                                setNewSubTaskContent(e.target.value)
                              }
                              placeholder="子任务内容"
                              className="input-base w-full"
                            />
                            <input
                              type="text"
                              value={newSubTaskAssignee}
                              onChange={(e) =>
                                setNewSubTaskAssignee(e.target.value)
                              }
                              placeholder="对接人"
                              className="input-base w-full"
                            />
                            <textarea
                              value={newSubTaskDesc}
                              onChange={(e) =>
                                setNewSubTaskDesc(e.target.value)
                              }
                              placeholder="描述"
                              rows={2}
                              className="input-base w-full resize-none"
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
                                  className="btn-secondary px-3 py-1.5 text-xs"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddSubTask(task.id)}
                                  disabled={
                                    !newSubTaskContent.trim() ||
                                    addSubTaskLoading === task.id
                                  }
                                  className="btn-primary px-3 py-1.5 text-xs"
                                >
                                  {addSubTaskLoading === task.id ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      添加中
                                    </span>
                                  ) : (
                                    "添加"
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setNewSubTaskId(task.id)}
                            disabled={addSubTaskLoading === task.id}
                            className="mt-2 inline-flex rounded-full bg-white/88 px-3 py-1.5 text-left text-xs text-slate-500 shadow-sm transition-colors duration-150 hover:text-slate-800 disabled:opacity-70"
                          >
                            {addSubTaskLoading === task.id ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                添加中...
                              </span>
                            ) : (
                              "+ 添加子任务"
                            )}
                          </button>
                        )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditTask(null)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
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
                  className="input-base"
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
                  className="input-base resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTask(null)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editContent.trim()}
                  className="btn-primary"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editSubTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditSubTask(null)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
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
                  value={editSubTaskAssignee}
                  onChange={(e) => setEditSubTaskAssignee(e.target.value)}
                  placeholder="输入对接人姓名"
                  className="input-base"
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
                  className="input-base resize-none"
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
                  className="btn-secondary"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditProgress(null)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
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
                  className="btn-secondary"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
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
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(deleteConfirm)}
                className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSubTaskConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setDeleteSubTaskConfirm(null)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
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
                className="btn-secondary"
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
                className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProgressConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setDeleteProgressConfirm(null)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
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
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteProgress();
                }}
                className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-800">添加任务</div>
            <p className="mt-1 text-xs text-slate-500">
              先写主任务，后续再补充子任务、描述和进度。
            </p>
          </div>
          <div className="icon-badge h-12 w-12 rounded-full text-xl">＋</div>
        </div>
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
        <div className="card overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-800">
                ✓ 本周已完成
              </h3>
              <button
                type="button"
                onClick={handleCopyAll}
                className="btn-ghost px-3 py-1 text-xs"
                title="复制全部"
              >
                {copiedId === "all" ? "已复制" : "复制全部"}
              </button>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              {weekInfo.label}
            </span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {completedSummary.map(({ task, hasTaskCompleted, subTaskGroups, isRecentlyCompleted }) => (
              <li
                key={task.id}
                className={`rounded-2xl border px-3 py-2 ${isRecentlyCompleted ? "border-amber-300 bg-amber-50/95 shadow-[0_4px_12px_rgba(251,191,36,0.15)]" : "border-slate-100/90 bg-white/72"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {hasTaskCompleted && (
                      <>
                        <span className="shrink-0 text-amber-500">✓</span>
                        <span className="font-semibold text-slate-800">
                          {task.content}
                        </span>
                        {task.completedAt && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                            {formatCompletedTime(task.completedAt)}
                          </span>
                        )}
                      </>
                    )}
                    {!hasTaskCompleted && subTaskGroups.length > 0 && (
                      <span className="font-medium text-slate-700">
                        {task.content}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTask(task.id)}
                    className="btn-ghost shrink-0 px-3 py-1 text-xs"
                    title="复制此项"
                  >
                    {copiedId === task.id ? "已复制" : "复制"}
                  </button>
                </div>
                {subTaskGroups.map(({ subTask, progress }) => (
                  <div
                    key={subTask.id}
                    className="mt-2 rounded-xl border border-slate-100/90 bg-white/78 px-3 py-2"
                  >
                    {subTask.isCompleted && (
                      <div className="flex items-center gap-2 py-0.5 text-slate-600">
                        <span className="shrink-0 text-slate-500">✓</span>
                        <span>{subTask.content}</span>
                      </div>
                    )}
                    {progress.length > 0 && !subTask.isCompleted && (
                      <div className="py-0.5 text-slate-700">
                        {subTask.content}
                      </div>
                    )}
                    <ul className="mt-0.5 space-y-0">
                      {progress.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 rounded-lg bg-slate-50/80 px-2.5 py-1.5 text-slate-600"
                        >
                          <span className="shrink-0 text-slate-500">✓</span>
                          <span>{p.content}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
