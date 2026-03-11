"use client";

import Link from "next/link";
import useSWR from "swr";
import { FormEvent, useState } from "react";

type SubCategory = {
  id: string;
  name: string;
  pendingCount: number;
};

type CategoryData = {
  name: string;
  subCategories: SubCategory[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CategoryPageClient({ categoryId }: { categoryId: string }) {
  const { data, isLoading, error: fetchError, mutate } = useSWR<CategoryData>(
    `/api/categories/${categoryId}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  const categoryName = data?.name ?? "";
  const subCategories = data?.subCategories ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<SubCategory | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        <nav className="h-4 w-48 rounded bg-slate-100 skeleton" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card flex items-center gap-3 px-4 py-4">
              <div className="h-9 w-9 rounded-lg bg-slate-100 skeleton" />
              <div className="h-4 w-32 rounded bg-slate-100 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-700 hover:underline">
            首页
          </Link>
        </nav>
        <div className="card py-12 text-center text-sm text-slate-500">
          分类不存在或加载失败
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700 hover:underline">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{categoryName}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {categoryName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            管理你的{categoryName}子分类
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary"
        >
          + 新建子分类
        </button>
      </div>

      {subCategories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
            📂
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-900">
              还没有子分类
            </div>
            <div className="text-xs text-slate-500">
              创建第一个子分类，开始记录你的周度任务
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary mt-2 text-xs"
          >
            新建子分类
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/${categoryId}/${sub.id}`}
              className="card card-hover flex items-center justify-between px-4 py-4"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg">
                  📁
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {sub.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {sub.pendingCount} 个待办事项
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
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {editTarget ? "编辑子分类" : "新建子分类"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              输入子分类名称，如：2025年工作、2026年工作
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
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
