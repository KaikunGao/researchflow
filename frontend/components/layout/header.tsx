"use client";

import { Menu, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { findNavItem } from "@/lib/navigation";

export function Header() {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="打开导航菜单" />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            <SheetDescription className="sr-only">ResearchFlow 页面导航</SheetDescription>
            <Brand />
          </SheetHeader>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">ResearchFlow</span>
        <span className="hidden text-muted-foreground/60 sm:inline">/</span>
        <span className="truncate text-sm font-medium">{current?.label ?? "页面"}</span>
        {current && (
          <span className="hidden truncate text-xs text-muted-foreground md:inline">· {current.labelEn}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border px-2 py-1">
          <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-3.5" />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-medium">行业研究员</div>
            <div className="text-[10px] text-muted-foreground">医药生物组</div>
          </div>
        </div>
      </div>
    </header>
  );
}
