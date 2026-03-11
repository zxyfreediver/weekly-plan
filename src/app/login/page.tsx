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
    <div className="flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center">
      <div className="card w-full max-w-md px-8 py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white text-xl">
            📅
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            欢迎使用周记清单
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            管理你的每周任务与目标
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary focus:ring-1 focus:ring-primary"
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
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "登录中..." : "登录"}
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
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}

