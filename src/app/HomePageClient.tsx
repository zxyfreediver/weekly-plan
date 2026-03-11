"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CategoryWithStats = {
  id: string;
  name: string;
  taskCount: number;
  completedCount: number;
};

export function HomePageClient({
  categories,
}: {
  categories: CategoryWithStats[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryWithStats | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("网络异常");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的分类</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理你的每周任务与目标
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary"
        >
          + 新建分类
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-3xl">
            📁
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-900">
              还没有分类
            </div>
            <div className="text-xs text-slate-500">
              点击下方按钮创建第一个分类，开始管理你的周度任务
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary"
          >
            新建分类
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => {
            const progress =
              category.taskCount === 0
                ? 0
                : category.completedCount / category.taskCount;
            return (
              <Link
                key={category.id}
                href={`/${category.id}`}
                className="card card-hover flex flex-col gap-3 p-4 block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                    📁
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEdit(category, e);
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="编辑"
                  >
                    ✏️
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {category.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {category.taskCount} 个待办任务
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {Math.round(progress * 100)}%
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {editTarget ? "编辑分类" : "新建分类"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
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

      {categories.length > 0 && (
        <div className="mt-4 text-center text-xs text-slate-400">
          管理分类显示设置
        </div>
      )}
    </div>
  );
}
