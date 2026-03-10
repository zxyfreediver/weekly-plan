"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

interface SummaryPageProps {
  params: { categoryId: string; subCategoryId: string };
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const [startDate, setStartDate] = useState("2025-01-05");
  const [endDate, setEndDate] = useState("2025-01-11");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSummary(null);

    setTimeout(() => {
      setSummary(
        "这是占位文案：未来这里会展示根据已完成任务生成的 AI 总结内容。当前版本尚未接入真实 AI 服务。",
      );
      setIsLoading(false);
    }, 900);
  };

  const handleCopy = () => {
    if (!summary) return;
    void navigator.clipboard.writeText(summary);
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
        <Link
          href={`/${params.categoryId}/${params.subCategoryId}`}
          className="hover:text-slate-700 hover:underline"
        >
          {params.subCategoryId === "2025"
            ? "2025年工作"
            : `${params.subCategoryId}年`}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">AI 总结</span>
      </nav>

      <h1 className="text-xl font-semibold text-slate-900">周记 AI 总结</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="card flex flex-col gap-4 px-5 py-5"
        >
          <div>
            <div className="text-sm font-medium text-slate-800">
              选择总结范围
            </div>
            <p className="mt-1 text-xs text-slate-500">
              选择一个时间段，生成该时间段内已完成任务的总结。
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <label
                htmlFor="startDate"
                className="block text-xs font-medium text-slate-700"
              >
                开始日期
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="endDate"
                className="block text-xs font-medium text-slate-700"
              >
                结束日期
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "生成中..." : "⚡ 生成总结"}
          </button>
          <div className="mt-2 text-xs text-slate-400">
            * 当前为占位功能，后续会接入真实 AI 服务。
          </div>
        </form>

        <div className="card flex flex-col px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">
                AI 生成总结
              </div>
              <p className="mt-1 text-xs text-slate-500">
                生成前，这里会显示占位说明；生成后展示总结内容。
              </p>
            </div>
            <button
              type="button"
              disabled={!summary}
              onClick={handleCopy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              复制内容
            </button>
          </div>

          <div className="relative mt-1 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-700">
            {isLoading && (
              <div className="space-y-2 text-xs text-slate-400">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
                <div>正在生成总结，请稍候...</div>
              </div>
            )}
            {!isLoading && !summary && (
              <div className="space-y-2 text-xs text-slate-400">
                <p>选择时间范围后点击「生成总结」，这里会展示总结结果。</p>
                <p>
                  示例：系统会自动梳理本周完成的关键任务、项目进展和下一步计划，帮你快速完成周报。
                </p>
              </div>
            )}
            {!isLoading && summary && (
              <p className="whitespace-pre-line text-sm text-slate-700">
                {summary}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

