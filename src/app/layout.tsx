import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@/styles/globals.css";
import { HeaderUser } from "@/components/HeaderUser";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://weekly-plan.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "周记清单 - 周报月报年报智能总结 | 个人任务管理",
    template: "%s | 周记清单",
  },
  applicationName: "周记清单",
  description:
    "周记清单：个人周度任务管理工具，支持周报、月报、年报 AI 智能总结。按周组织待办清单，一键生成周报月报，职场人必备的效率工具。",
  keywords: [
    "周记",
    "清单",
    "周报",
    "月报",
    "年报",
    "智能总结",
    "AI 总结",
    "任务管理",
    "待办清单",
    "周度规划",
    "职场效率",
  ],
  authors: [{ name: "周记清单" }],
  openGraph: {
    title: "周记清单 - 周报月报年报智能总结",
    description:
      "个人周度任务管理工具，支持周报、月报、年报 AI 智能总结，按周组织待办清单。",
    url: "/",
    siteName: "周记清单",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "周记清单 - 周报月报年报智能总结",
    description: "个人周度任务管理，支持 AI 智能总结周报月报年报。",
  },
  robots: {
    index: true,
    follow: true,
  },
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
      <body className="flex min-h-screen w-full flex-col bg-background">
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-slate-800 transition-opacity duration-200 hover:opacity-80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-lg">
                📅
              </span>
              <span>周记清单</span>
            </Link>
            <HeaderUser />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 transition-opacity duration-200">
          {children}
        </main>
        <footer className="mt-auto shrink-0 border-t border-slate-200 bg-white">
          <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-center px-4 text-xs text-slate-400">
            © {new Date().getFullYear()} 周记清单 · Keep organized, stay productive.
          </div>
        </footer>
      </body>
    </html>
  );
}

