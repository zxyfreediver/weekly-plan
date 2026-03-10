import Link from "next/link";
import { getCategoriesWithStats } from "@/lib/services/category";

export default async function HomePage() {
  const categories = getCategoriesWithStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的分类</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理你的每周任务与目标
          </p>
        </div>
        <Link
          href="#"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
        >
          + 新建分类
        </Link>
      </div>

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
            className="card flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                📁
              </div>
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
        );})}
      </div>

      <div className="mt-4 text-center text-xs text-slate-400">
        管理分类显示设置
      </div>
    </div>
  );
}

