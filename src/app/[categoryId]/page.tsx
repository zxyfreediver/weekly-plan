import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategorySubCategories } from "@/lib/services/category";

interface CategoryPageProps {
  params: { categoryId: string };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const data = getCategorySubCategories(params.categoryId);

  if (!data) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700 hover:underline">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{data.name}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {data.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            管理你的{data.name}子分类
          </p>
        </div>
        <button className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600">
          + 新建子分类
        </button>
      </div>

      {data.subCategories.length === 0 ? (
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
          <button className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-600">
            新建子分类
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/${params.categoryId}/${sub.id}`}
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
    </div>
  );
}

