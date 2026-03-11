"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

type SubTask = {
  id: string;
  taskId: string;
  content: string;
  description: string;
  assignee: string;
  isCompleted: boolean;
  isPriority: boolean;
  sortOrder: number;
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

function getWeekInfo(offset: number): { label: string; start: string } {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1 + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const label = `${format(monday)} - ${format(sunday)}`;
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  const start = `${yyyy}-${mm}-${dd}`;
  return { label, start };
}

export default function WeeklyTasksPage({ params }: WeeklyTasksPageProps) {
  const { categoryId, subCategoryId } = use(params);
  const [weekOffset, setWeekOffset] = useState(0);
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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubTaskId, setNewSubTaskId] = useState<string | null>(null);
  const [newSubTaskContent, setNewSubTaskContent] = useState("");
  const [newSubTaskDesc, setNewSubTaskDesc] = useState("");
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState("");
  const [newSubTaskPriority, setNewSubTaskPriority] = useState(false);
  const [editSubTask, setEditSubTask] = useState<SubTask | null>(null);
  const [editSubTaskContent, setEditSubTaskContent] = useState("");
  const [editSubTaskDesc, setEditSubTaskDesc] = useState("");
  const [editSubTaskAssignee, setEditSubTaskAssignee] = useState("");
  const [editSubTaskPriority, setEditSubTaskPriority] = useState(false);
  const [deleteSubTaskConfirm, setDeleteSubTaskConfirm] = useState<string | null>(null);

  const weekInfo = useMemo(() => getWeekInfo(weekOffset), [weekOffset]);

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

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));
    return copy;
  }, [tasks]);

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
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      setNewSubTaskId(null);
      setEditSubTask(null);
      return;
    }
    setExpandedTaskId(task.id);
    setNewSubTaskContent("");
    setNewSubTaskDesc("");
    setNewSubTaskAssignee("");
    setNewSubTaskPriority(false);
  };

  const getTaskStats = (task: Task) => {
    const total = task.subTasks.length;
    const completed = task.subTasks.filter((s) => s.isCompleted).length;
    const importantPending = task.subTasks.filter(
      (s) => s.isPriority && !s.isCompleted,
    ).length;
    const unimportantPending = task.subTasks.filter(
      (s) => !s.isCompleted && !s.isPriority,
    ).length;
    return { total, completed, importantPending, unimportantPending };
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
      if (expandedTaskId === taskId) setExpandedTaskId(null);
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
        }),
      });
      if (!res.ok) return;
      const created: SubTask = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subTasks: [...t.subTasks, created] }
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
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
        >
          ✨ AI 总结
        </Link>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v - 1)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            上周
          </button>
          <div className="font-medium text-slate-800">{weekInfo.label}</div>
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v + 1)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            下周
          </button>
        </div>
      </div>

      <div className="card space-y-3 px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            <div className="text-xs text-slate-500">加载任务中...</div>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <div className="text-2xl">📝</div>
            <div className="text-sm font-medium text-slate-900">
              本周还没有任务
            </div>
            <div className="text-xs text-slate-500">
              添加第一个任务，开始规划这一周吧
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedTasks.map((task) => (
              <li
                key={task.id}
                className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex flex-1 items-center gap-3">
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
                              <>
                                <span>暂无子任务</span>
                                <span>
                                  {expandedTaskId === task.id ? "▲ 收起" : "▼ 展开"}
                                </span>
                              </>
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
                              <span>
                                {expandedTaskId === task.id ? "▲ 收起" : "▼ 展开"}
                              </span>
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
                {expandedTaskId === task.id && (
                  <div className="border-t border-slate-100 bg-white px-3 py-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-500">
                        子任务
                      </div>
                      <ul className="space-y-1.5">
                        {sortedSubTasks(task.subTasks).map((st) => (
                          <li
                            key={st.id}
                            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                          >
                            <button
                                type="button"
                                onClick={() =>
                                  handleToggleSubTaskCompleted(task.id, st)
                                }
                                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[8px] text-primary"
                              >
                                {st.isCompleted ? "✓" : ""}
                              </button>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`text-sm ${
                                    st.isCompleted
                                      ? "line-through text-slate-400"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {st.content}
                                  {st.isPriority ? (
                                    <span className="ml-1.5 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                      高优先级
                                    </span>
                                  ) : null}
                                </span>
                                {(st.description || st.assignee) && (
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
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleSubTaskPriority(task.id, st)
                                  }
                                  className="rounded px-1 py-0.5 text-xs hover:bg-slate-100"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !editSubmitting && setEditTask(null)}
        >
          <div
            className="card w-full max-w-md p-6"
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
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-70"
                >
                  {editSubmitting ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editSubTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setEditSubTask(null)}
        >
          <div
            className="card w-full max-w-md p-6"
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
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-70"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="card w-full max-w-md p-6"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteSubTaskConfirm(null)}
        >
          <div
            className="card w-full max-w-md p-6"
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

      <div className="card flex flex-col gap-3 px-4 py-4">
        <div className="text-sm font-medium text-slate-800">添加任务</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="添加新任务..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="w-full flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleAddTask}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-600"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
