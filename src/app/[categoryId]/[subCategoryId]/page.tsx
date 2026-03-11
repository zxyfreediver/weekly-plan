"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  isPriority: boolean;
  weekStart: string;
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
  const [newPriority, setNewPriority] = useState(false);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subCategoryName, setSubCategoryName] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [inlineContent, setInlineContent] = useState("");
  const [inlineDescription, setInlineDescription] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

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
          const sub = data.subCategories.find(
            (s) => s.id === subCategoryId,
          );
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
        if ((error as Error).name !== "AbortError") {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [categoryId, subCategoryId, weekInfo.start]);

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.isPriority !== b.isPriority) {
        return a.isPriority ? -1 : 1;
      }
      return 0;
    });
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

  const handleTogglePriority = async (task: Task) => {
    const nextPriority = !task.isPriority;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, isPriority: nextPriority } : t,
      ),
    );
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPriority: nextPriority }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditContent(task.content);
    setEditDescription(task.description);
    setEditPriority(task.isPriority);
    setEditSubmitting(false);
  };

  const toggleExpand = (task: Task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(task.id);
    setInlineContent(task.content);
    setInlineDescription(task.description ?? "");
  };

  const handleInlineSave = async () => {
    if (!expandedTaskId) return;
    const trimmed = inlineContent.trim();
    if (!trimmed) return;
    setInlineSaving(true);
    try {
      const res = await fetch(`/api/tasks/${expandedTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          description: inlineDescription,
        }),
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === expandedTaskId
            ? { ...t, content: trimmed, description: inlineDescription }
            : t,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setInlineSaving(false);
    }
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
          isPriority: editPriority,
        }),
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editTask.id
            ? {
                ...t,
                content: trimmed,
                description: editDescription,
                isPriority: editPriority,
              }
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
          subCategoryId: subCategoryId,
          content,
          isPriority: newPriority,
          weekStart: weekInfo.start,
        }),
      });
      if (!res.ok) return;
      const created: Task = await res.json();
      setTasks((prev) => [...prev, created]);
      setNewTask("");
      setNewPriority(false);
    } catch (error) {
      console.error(error);
    }
  };

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
                        className={`flex items-center gap-1.5 text-sm ${
                          task.isCompleted
                            ? "line-through text-slate-400"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        <span className="truncate">{task.content}</span>
                        {task.isPriority && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            高优先级
                          </span>
                        )}
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
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {expandedTaskId === task.id ? "▲ 收起" : "▼ 展开详情"}
                      </span>
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleTogglePriority(task)}
                      className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                      title="切换优先级"
                    >
                      ⭐
                    </button>
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
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          任务内容
                        </label>
                        <input
                          type="text"
                          value={inlineContent}
                          onChange={(e) => setInlineContent(e.target.value)}
                          placeholder="任务内容"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          具体描述
                        </label>
                        <textarea
                          value={inlineDescription}
                          onChange={(e) =>
                            setInlineDescription(e.target.value)
                          }
                          placeholder="添加具体描述..."
                          rows={4}
                          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleInlineSave}
                          disabled={
                            inlineSaving || !inlineContent.trim()
                          }
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-70"
                        >
                          {inlineSaving ? "保存中..." : "保存"}
                        </button>
                      </div>
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
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editPriority}
                  onChange={(e) => setEditPriority(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
                />
                高优先级
              </label>
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
              确定要删除该任务吗？此操作不可恢复。
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
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={newPriority}
                onChange={(e) => setNewPriority(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              高优先级
            </label>
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
    </div>
  );
}

