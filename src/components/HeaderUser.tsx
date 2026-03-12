"use client";

import { useRouter } from "next/navigation";
import * as taskCache from "@/lib/taskCache";

export function HeaderUser() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    taskCache.clearTasks();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-sm text-slate-500">
        保持专注，高效工作
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
      >
        退出
      </button>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
        U
      </div>
    </div>
  );
}
