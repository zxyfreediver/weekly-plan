import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "周记清单",
    template: "%s - 周记清单",
  },
  applicationName: "周记清单",
  description: "个人周度任务管理工具",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "周记清单",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-slate-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-lg">
                📅
              </span>
              <span>周记清单</span>
            </button>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="hidden sm:inline">保持专注，高效工作</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                U
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex h-12 max-w-4xl items-center justify-center px-4 text-xs text-slate-400">
            © {new Date().getFullYear()} 周记清单 · Keep organized, stay productive.
          </div>
        </footer>
      </body>
    </html>
  );
}

