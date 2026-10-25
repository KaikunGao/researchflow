import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <Header />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
        <footer className="border-t px-4 py-3 text-[11px] text-muted-foreground sm:px-6 lg:px-8">
          ResearchFlow · 数据来自导入文件并经自动标准化处理，发布前请复核，不构成投资建议。
        </footer>
      </div>
    </div>
  );
}
