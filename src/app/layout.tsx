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
  themeColor: "#8fd7d0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute right-[-5rem] top-10 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="absolute bottom-[-7rem] left-1/3 h-96 w-96 rounded-full bg-cyan-100/35 blur-3xl" />
        </div>
        <header className="sticky top-0 z-40 shrink-0 border-b border-white/60 bg-white/68 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-3 no-underline transition-opacity duration-200 hover:opacity-90"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(103,183,255,0.96),rgba(45,168,150,0.96))] text-lg text-white shadow-[0_12px_24px_rgba(103,183,255,0.28)]">
                📅
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold tracking-[0.02em] text-slate-800">
                  周记清单
                </span>
                <span className="hidden text-[11px] text-slate-400 sm:inline">
                  Weekly Focus Workspace
                </span>
              </span>
            </Link>
            <HeaderUser />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-6 transition-opacity duration-200 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
        <footer className="mt-auto shrink-0 border-t border-white/60 bg-white/46 backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-full max-w-[1160px] items-center justify-center px-4 text-xs text-slate-400 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} 周记清单 · Keep organized, stay productive.
          </div>
        </footer>
      </body>
    </html>
  );
}

