"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!username || !password) {
      setError("请输入账号和密码");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "登录失败，请检查账号和密码");
        setIsSubmitting(false);
        return;
      }

      const from = searchParams.get("from") ?? "/";
      router.push(from);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("网络异常，请稍后重试");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem-3.5rem)] items-center justify-center">
      <div className="surface-panel grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.1fr_0.9fr] animate-scale-in">
        <div className="relative hidden min-h-full overflow-hidden px-8 py-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,183,255,0.22),transparent_34%),linear-gradient(160deg,rgba(255,255,255,0.92),rgba(237,253,248,0.76))]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs text-primary shadow-sm">
                Weekly Journal Checklist
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
                每周都能轻一点，但别乱。
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
                用一个干净的工作台记录任务、拆解进度，再把结果沉淀成周报和总结。
              </p>
            </div>

            <div className="space-y-4">
              <div className="card px-5 py-5">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Included
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div>按周整理主任务、子任务和进度</div>
                  <div>按工作区拆分不同年份和主题</div>
                  <div>预留 AI 总结入口，周报整理更顺手</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="stat-pill">清新</span>
                <span className="stat-pill">简约</span>
                <span className="stat-pill">专注</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(103,183,255,0.98),rgba(45,168,150,0.98))] text-xl text-white shadow-[0_16px_30px_rgba(103,183,255,0.25)]">
                📅
              </div>
              <h2 className="mt-5 text-center text-2xl font-semibold tracking-tight text-slate-900">
                欢迎回来
              </h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                登录后继续管理这一周的任务与节奏。
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-xs font-medium text-slate-700"
                >
                  账号
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="例如：zhaoxing"
                  className="input-base"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700"
                >
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="输入您的密码"
                  className="input-base"
                />
              </div>
              <div className="flex items-center justify-end text-xs">
                <button
                  type="button"
                  className="text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
                >
                  忘记密码？
                </button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    登录中...
                  </span>
                ) : (
                  "登录"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              还没有账号？{" "}
              <button className="font-medium text-primary underline-offset-4 hover:underline">
                立即注册
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-4rem-3.5rem)] items-center justify-center">
      <div className="surface-panel grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.1fr_0.9fr] animate-in">
        <div className="hidden min-h-[420px] bg-white/40 lg:block" />
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex flex-col items-center">
              <div className="skeleton mb-4 h-12 w-12 rounded-2xl" />
              <div className="skeleton mb-2 h-6 w-28 rounded" />
              <div className="skeleton h-4 w-52 rounded" />
            </div>
            <div className="space-y-4">
              <div className="skeleton h-12 w-full rounded-2xl" />
              <div className="skeleton h-12 w-full rounded-2xl" />
              <div className="skeleton h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

