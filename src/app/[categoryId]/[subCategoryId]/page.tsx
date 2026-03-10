"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  content: string;
  isCompleted: boolean;
  isPriority: boolean;
  weekStart: string;
};

interface WeeklyTasksPageProps {
  params: { categoryId: string; subCategoryId: string };
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState(false);

  const weekInfo = useMemo(() => getWeekInfo(weekOffset), [weekOffset]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const url = `/api/tasks?subCategoryId=${encodeURIComponent(
          `${params.categoryId}-${params.subCategoryId}`,
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
  }, [params.categoryId, params.subCategoryId, weekInfo.start]);

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

  const handleAddTask = async () => {
    const content = newTask.trim();
    if (!content) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId: `${params.categoryId}-${params.subCategoryId}`,
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
          href={`/${params.categoryId}`}
          className="hover:text-slate-700 hover:underline"
        >
          {params.categoryId === "work"
            ? "工作"
            : params.categoryId === "life"
              ? "生活"
              : "家庭"}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">
          {params.subCategoryId === "2025"
            ? "2025年工作"
            : `${params.subCategoryId}年`}
        </span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">周记清单</h1>
        <Link
          href={`/${params.categoryId}/${params.subCategoryId}/summary`}
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
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div className="flex flex-1 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(task)}
                    className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-primary"
                  >
                    {task.isCompleted ? "✓" : ""}
                  </button>
                  {task.isPriority && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      高优先级
                    </span>
                  )}
                  <span
                    className={`text-sm ${
                      task.isCompleted
                        ? "text-slate-400 line-through"
                        : "text-slate-900"
                    }`}
                  >
                    {task.content}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
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
                    className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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

