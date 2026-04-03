"use client";

import Link from "next/link";
import useSWR from "swr";
import { FormEvent, useMemo, useState } from "react";

type CategoryWithStats = {
  id: string;
  name: string;
  taskCount: number;
  completedCount: number;
};

function getErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.length > 0
  ) {
    return payload.error;
  }
  return fallback;
}

function isCategoryWithStatsArray(payload: unknown): payload is CategoryWithStats[] {
  return (
    Array.isArray(payload) &&
    payload.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.taskCount === "number" &&
        typeof item.completedCount === "number",
    )
  );
}

async function fetchCategories(url: string): Promise<CategoryWithStats[]> {
  const res = await fetch(url);
  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(getErrorMessage(payload, "分类加载失败"));
  }

  if (!isCategoryWithStatsArray(payload)) {
    throw new Error("分类数据格式错误");
  }

  return payload;
}

export function HomePageClient() {
  const { data, error: fetchError, isLoading, mutate } = useSWR<CategoryWithStats[]>(
    "/api/categories",
    fetchCategories,
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );
  const categories = data ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryWithStats | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalTasks = useMemo(
    () => categories.reduce((sum, category) => sum + category.taskCount, 0),
    [categories],
  );
  const totalCompleted = useMemo(
    () => categories.reduce((sum, category) => sum + category.completedCount, 0),
    [categories],
  );
  const completionRate = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

  const openCreate = () => {
    setEditTarget(null);
    setName("");
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryWithStats, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTarget(cat);
    setName(cat.name);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const trimmed = name.trim();
      if (editTarget) {
        const res = await fetch(`/api/categories/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string };
          setError(data?.error ?? "更新失败");
          setSubmitting(false);
          return;
        }
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string };
          setError(data?.error ?? "创建失败");
          setSubmitting(false);
          return;
        }
      }
      setName("");
      setEditTarget(null);
      setModalOpen(false);
      setSubmitting(false);
      void mutate();
    } catch (err) {
      console.error(err);
      setError("网络异常");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="surface-panel space-y-4 px-6 py-6 sm:px-7 sm:py-7">
          <div className="h-5 w-24 rounded-full skeleton" />
          <div className="h-10 w-56 rounded-2xl skeleton" />
          <div className="h-4 w-72 rounded skeleton" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 rounded-full skeleton" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card flex flex-col gap-4 p-5">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 skeleton" />
              <div className="h-4 w-24 rounded bg-slate-100 skeleton" />
              <div className="h-3 w-40 rounded bg-slate-100 skeleton" />
              <div className="h-2 rounded-full bg-slate-100 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <section className="surface-panel px-6 py-6 sm:px-7 sm:py-7">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/70">
            Workspace
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            我的分类
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            管理你的每周任务与目标。
          </p>
        </section>
        <div className="card py-12 text-center text-sm text-slate-500">
          {fetchError instanceof Error ? fetchError.message : "分类加载失败"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden px-6 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/70">
              Workspace
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                我的分类
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                先按领域整理，再进入每周清单。工作、生活、年度目标都可以拆成独立空间。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="stat-pill">{categories.length} 个分类</span>
              <span className="stat-pill">{totalTasks} 项任务</span>
              <span className="stat-pill">{totalCompleted} 项已完成</span>
            </div>
          </div>

          <div className="card min-w-[260px] max-w-sm px-5 py-5">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Overview
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold text-slate-900">
                  {completionRate}%
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  当前分类整体完成度
                </p>
              </div>
              <button type="button" onClick={openCreate} className="btn-primary">
                + 新建分类
              </button>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-[linear-gradient(135deg,#67b7ff,#2da896)]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {categories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
          <div className="icon-badge h-16 w-16 rounded-full text-3xl">
            📁
          </div>
          <div className="space-y-1">
            <div className="text-base font-medium text-slate-900">
              还没有分类
            </div>
            <div className="max-w-sm text-sm leading-6 text-slate-500">
              点击下方按钮创建第一个分类，开始管理你的周度任务
            </div>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            新建分类
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const progress =
              category.taskCount === 0
                ? 0
                : category.completedCount / category.taskCount;
            return (
              <Link
                key={category.id}
                href={`/${category.id}`}
                className="card card-hover group flex h-full flex-col gap-5 p-5 no-underline"
              >
                <div className="flex items-start justify-between">
                  <div className="icon-badge">
                    📁
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEdit(category, e);
                    }}
                    className="btn-ghost h-9 w-9 p-0 text-base text-slate-400 hover:text-slate-600"
                    title="编辑"
                  >
                    ✏️
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold text-slate-900 transition-colors duration-200 group-hover:text-slate-950">
                      {category.name}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {category.taskCount === 0
                        ? "空白"
                        : `${category.completedCount}/${category.taskCount}`}
                    </span>
                  </div>
                  <div className="text-sm leading-6 text-slate-500">
                    {category.taskCount} 个待办任务，适合按周持续推进。
                  </div>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>完成进度</span>
                    <span>{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(135deg,#67b7ff,#2da896)]"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="modal-panel w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {editTarget ? "编辑分类" : "新建分类"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              输入分类名称，如：工作、生活、家庭
            </p>
            {error && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="分类名称"
                className="input-base"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !submitting && setModalOpen(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="btn-primary"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {editTarget ? "保存中..." : "创建中..."}
                    </span>
                  ) : (
                    "确定"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-4 text-center text-xs text-slate-400">
          进入分类后可继续拆分子分类和周任务。
        </div>
      )}
    </div>
  );
}
