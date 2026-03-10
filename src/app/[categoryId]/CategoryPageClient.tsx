"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SubCategory = {
  id: string;
  name: string;
  pendingCount: number;
};

export function CategoryPageClient({
  categoryId,
  categoryName,
  subCategories,
}: {
  categoryId: string;
  categoryName: string;
  subCategories: SubCategory[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/sub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        setError(data?.error ?? "创建失败");
        setSubmitting(false);
        return;
      }
      setName("");
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
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
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
            onClick={() => setModalOpen(true)}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-600"
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
              className="card flex items-center justify-between px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
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
              新建子分类
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              输入子分类名称，如：2025年工作、2026年工作
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
                placeholder="子分类名称"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-70"
                >
                  {submitting ? "创建中..." : "确定"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
