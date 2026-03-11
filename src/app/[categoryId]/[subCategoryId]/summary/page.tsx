"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

function getMondayOfWeek(d: Date): Date {
  const m = new Date(d);
  const day = m.getDay() || 7;
  m.setDate(m.getDate() - day + 1);
  return m;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getWeekInfoFromStart(start: string): {
  label: string;
  start: string;
  weekNumber: number;
  isoYear: number;
} {
  const monday = new Date(start + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const week1 = getMondayOfWeek(new Date(isoYear, 0, 4));
  const diffMs = monday.getTime() - week1.getTime();
  const weekNumber = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return {
    label: `${format(monday)} - ${format(sunday)}`,
    start,
    weekNumber,
    isoYear,
  };
}

function getWeeksInYear(
  year: number,
): { label: string; start: string; weekNumber: number; weekIndex: number }[] {
  const week1 = getMondayOfWeek(new Date(year, 0, 4));
  const weeks: {
    label: string;
    start: string;
    weekNumber: number;
    weekIndex: number;
  }[] = [];
  const cur = new Date(week1);
  while (cur.getFullYear() <= year) {
    const info = getWeekInfoFromStart(toDateString(cur));
    weeks.push({ ...info, weekIndex: weeks.length + 1 });
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

const WEEK_PRESETS = [
  { label: "单周", count: 1 },
  { label: "半月报（2周）", count: 2 },
  { label: "月报（4周）", count: 4 },
  { label: "自定义", count: 0 },
] as const;

interface SummaryPageProps {
  params: Promise<{ categoryId: string; subCategoryId: string }>;
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const { categoryId, subCategoryId } = use(params);
  const [reportType, setReportType] = useState<"annual" | "weekly">("weekly");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [weekPreset, setWeekPreset] = useState<(typeof WEEK_PRESETS)[number]["label"]>("单周");
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>("");
  const [selectedWeekStarts, setSelectedWeekStarts] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subCategoryName, setSubCategoryName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weeks = useMemo(() => getWeeksInYear(year), [year]);
  const thisWeekStart = useMemo(() => toDateString(getMondayOfWeek(new Date())), []);

  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekStart) {
      const current = weeks.find((w) => w.start >= thisWeekStart) ?? weeks[weeks.length - 1];
      setSelectedWeekStart(current!.start);
    }
  }, [weeks, thisWeekStart, selectedWeekStart]);

  useEffect(() => {
    if (reportType !== "weekly" || !selectedWeekStart || weeks.length === 0)
      return;
    const idx = weeks.findIndex((w) => w.start === selectedWeekStart);
    if (idx < 0) return;
    const preset = WEEK_PRESETS.find((p) => p.label === weekPreset);
    const count = preset?.count ?? 0;
    if (count === 0) {
      setSelectedWeekStarts((prev) =>
        prev.size > 0 ? prev : new Set([selectedWeekStart]),
      );
      return;
    }
    const starts = new Set<string>();
    for (let i = 0; i < count && idx + i < weeks.length; i++) {
      starts.add(weeks[idx + i]!.start);
    }
    setSelectedWeekStarts(starts);
  }, [reportType, selectedWeekStart, weekPreset, weeks]);

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
          const sub = data.subCategories.find((s) => s.id === subCategoryId);
          setSubCategoryName(sub?.name ?? null);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      }
    };
    void load();
    return () => controller.abort();
  }, [categoryId, subCategoryId]);

  const handleToggleWeek = (start: string) => {
    setWeekPreset("自定义");
    setSelectedWeekStarts((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSummary(null);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        subCategoryId,
        reportType,
        year,
      };
      if (reportType === "weekly") {
        const starts = Array.from(selectedWeekStarts).sort();
        if (starts.length === 0) {
          setError("请至少选择一周");
          setIsLoading(false);
          return;
        }
        payload.weekStarts = starts;
      }
      if (template.trim()) payload.template = template.trim();

      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `请求失败 (${res.status})`);
        return;
      }
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setIsLoading(false);
    }
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
          href={`/${categoryId}`}
          className="hover:text-slate-700 hover:underline"
        >
          {categoryName ?? categoryId}
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/${categoryId}/${subCategoryId}`}
          className="hover:text-slate-700 hover:underline"
        >
          {subCategoryName ?? subCategoryId}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">AI 总结</span>
      </nav>

      <h1 className="text-xl font-semibold text-slate-900">AI 智能总结</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="card flex flex-col gap-4 px-5 py-5"
        >
          <div>
            <div className="text-sm font-medium text-slate-800">报告类型</div>
            <p className="mt-1 text-xs text-slate-500">
              年报：按年份生成；周报：选择具体周，可多选合并为半月报/月报。
            </p>
          </div>

          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="reportType"
                checked={reportType === "annual"}
                onChange={() => setReportType("annual")}
                className="text-primary"
              />
              <span className="text-sm">年报</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="reportType"
                checked={reportType === "weekly"}
                onChange={() => setReportType("weekly")}
                className="text-primary"
              />
              <span className="text-sm">周报</span>
            </label>
          </div>

          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                年份
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                    {y === CURRENT_YEAR ? "（今年，截至今日）" : ""}
                  </option>
                ))}
              </select>
            </div>

            {reportType === "weekly" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    周范围
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setWeekPreset(p.label)}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                          weekPreset === p.label
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    {weekPreset === "自定义" ? "选择周（可多选）" : "起始周"}
                  </label>
                  <select
                    value={selectedWeekStart}
                    onChange={(e) => setSelectedWeekStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {weeks.map((w) => (
                      <option key={w.start} value={w.start}>
                        第{w.weekIndex}周 {w.label}
                        {year === CURRENT_YEAR && w.start === thisWeekStart
                          ? " （本周）"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {weekPreset === "自定义" && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {weeks.map((w) => (
                      <label
                        key={w.start}
                        className="flex cursor-pointer items-center gap-2 py-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWeekStarts.has(w.start)}
                          onChange={() => handleToggleWeek(w.start)}
                          className="rounded text-primary"
                        />
                        <span>
                          第{w.weekIndex}周 {w.label}
                          {year === CURRENT_YEAR && w.start === thisWeekStart
                            ? " （本周）"
                            : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedWeekStarts.size > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-600">
                      已选 {selectedWeekStarts.size} 周：
                    </p>
                    <ul className="max-h-24 space-y-0.5 overflow-y-auto rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                      {Array.from(selectedWeekStarts)
                        .sort()
                        .map((start) => {
                          const w = weeks.find((x) => x.start === start);
                          return (
                            <li key={start}>
                              第{w?.weekIndex ?? "?"}周 {w?.label ?? start}
                              {year === CURRENT_YEAR && start === thisWeekStart
                                ? " （本周）"
                                : ""}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              自定义模板（可选）
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="粘贴你的参考模板，AI 将按此格式生成。例如：&#10;一、本周完成&#10;1. xxx&#10;2. xxx&#10;二、下周计划"
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "生成中..." : "⚡ 生成总结"}
          </button>
        </form>

        <div className="card flex flex-col px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">
                AI 生成总结
              </div>
              <p className="mt-1 text-xs text-slate-500">
                支持年报、周报、半月报、月报，可自定义模板让 AI 按格式输出。
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
                <p>选择报告类型与范围后点击「生成总结」。</p>
                <p>
                  年报：今年则截至今日；周报可多选周，适配半月报、月报需求。
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
