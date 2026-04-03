"use client";

import Link from "next/link";
import useSWR from "swr";
import { FormEvent, useMemo, useState } from "react";

type SubCategory = {
  id: string;
  name: string;
  pendingCount: number;
};

type CategoryData = {
  name: string;
  subCategories: SubCategory[];
};

function getErrorMessage(payload: unknown, fallback: string): string {
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

function isCategoryData(payload: unknown): payload is CategoryData {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as {
    name?: unknown;
    subCategories?: unknown;
  };

  if (
    typeof candidate.name !== "string" ||
    !Array.isArray(candidate.subCategories)
  ) {
    return false;
  }

  return candidate.subCategories.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.pendingCount === "number",
  );
}

async function fetchCategory(url: string): Promise<CategoryData> {
  const res = await fetch(url);
  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(getErrorMessage(payload, "分类加载失败"));
  }

  if (!isCategoryData(payload)) {
    throw new Error("分类数据格式错误");
  }

  return payload;
}

export function CategoryPageClient({ categoryId }: { categoryId: string }) {
  const { data, isLoading, error: fetchError, mutate } = useSWR<CategoryData>(
    `/api/categories/${categoryId}`,
    fetchCategory,
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  const categoryName = data?.name ?? "";
  const subCategories = data?.subCategories ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<SubCategory | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const totalPending = useMemo(
    () => subCategories.reduce((sum, subCategory) => sum + subCategory.pendingCount, 0),
    [subCategories],
  );

  const openCreate = () => {
    setEditTarget(null);
    setName("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (sub: SubCategory, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTarget(sub);
    setName(sub.name);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const trimmed = name.trim();
      if (editTarget) {
        const res = await fetch(`/api/sub-categories/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string };
          setFormError(data?.error ?? "更新失败");
          setSubmitting(false);
          return;
        }
      } else {
        const res = await fetch(`/api/categories/${categoryId}/sub`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string };
          setFormError(data?.error ?? "创建失败");
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
      setFormError("网络异常");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="surface-panel space-y-4 px-6 py-6 sm:px-7 sm:py-7">
          <div className="h-5 w-32 rounded-full skeleton" />
          <div className="h-10 w-56 rounded-2xl skeleton" />
          <div className="h-4 w-72 rounded skeleton" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card flex items-center gap-4 px-5 py-5">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 skeleton" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-100 skeleton" />
                <div className="h-3 w-24 rounded bg-slate-100 skeleton" />
              </div>
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
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="stat-pill no-underline hover:text-slate-700">
              首页
            </Link>
          </nav>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            分类工作区
          </h1>
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
            <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="stat-pill no-underline hover:text-slate-700">
                首页
              </Link>
              <span className="text-slate-300">/</span>
              <span className="stat-pill border-primary/10 bg-primary/10 text-primary">
                {categoryName}
              </span>
            </nav>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/70">
                Category
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {categoryName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                用子分类拆开不同年份、项目或主题，再进入每周清单持续推进。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="stat-pill">{subCategories.length} 个子分类</span>
              <span className="stat-pill">{totalPending} 项待办</span>
            </div>
          </div>

          <div className="card min-w-[250px] max-w-sm px-5 py-5">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Scope
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-900">
              {subCategories.length}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              当前分类下的工作区数量
            </p>
            <button type="button" onClick={openCreate} className="btn-primary mt-4">
              + 新建子分类
            </button>
          </div>
        </div>
      </section>

      {subCategories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="icon-badge h-16 w-16 rounded-full text-2xl">
            📂
          </div>
          <div className="space-y-1">
            <div className="text-base font-medium text-slate-900">
              还没有子分类
            </div>
            <div className="max-w-sm text-sm leading-6 text-slate-500">
              创建第一个子分类，开始记录你的周度任务
            </div>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary mt-2">
            新建子分类
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/${categoryId}/${sub.id}`}
              className="card card-hover group flex items-center justify-between gap-4 px-5 py-5 no-underline"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="icon-badge">📁</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-base font-semibold text-slate-900 transition-colors duration-200 group-hover:text-slate-950">
                      {sub.name}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {sub.pendingCount} 项待办
                    </span>
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">
                    进入后按周查看主任务、子任务和进度拆分。
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openEdit(sub, e);
                }}
                className="btn-ghost h-9 w-9 p-0 text-base text-slate-400 hover:text-slate-600"
                title="编辑"
              >
                ✏️
              </button>
            </Link>
          ))}
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
              {editTarget ? "编辑子分类" : "新建子分类"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              输入子分类名称，例如：2026、求职、个人成长
            </p>
            {formError && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="子分类名称"
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
    </div>
  );
}
