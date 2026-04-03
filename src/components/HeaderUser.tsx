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
      <span className="hidden rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs text-slate-500 shadow-sm backdrop-blur-sm lg:inline-flex">
        本周轻一点，也稳一点
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="btn-ghost px-3 py-1.5 text-xs"
      >
        退出
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/80 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
        U
      </div>
    </div>
  );
}
