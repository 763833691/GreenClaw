"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, FileText, Home, Leaf, MessageSquare, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuthHeader } from "@/components/layout/auth-header";

const nav = [
  { href: "/", label: "首页", icon: Home },
  { href: "/projects", label: "我的项目", icon: Building2 },
  { href: "/compute", label: "计算中心", icon: BarChart3 },
  { href: "/assistant", label: "优化助手", icon: MessageSquare },
  { href: "/reports", label: "报告中心", icon: FileText }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="gb-page-bg min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/70 bg-card/95 px-3 py-6 backdrop-blur lg:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">GreenClaw</p>
              <p className="text-xs text-muted-foreground">绿建计算智能体</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : item.href.startsWith("/projects")
                    ? pathname.startsWith("/projects")
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-4" />
          <p className="px-2 text-xs text-muted-foreground">GB/T 50378 · 本地优先</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border/70 bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6">
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-semibold">GreenClaw</p>
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="text-sm font-semibold text-foreground">绿建项目工作台</p>
              <p className="text-xs text-muted-foreground">能耗模拟 · 绿建评分 · 碳排分析 · 优化建议</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AuthHeader />
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">设置</span>
              </Button>
            </div>
          </header>
          <div className="border-b bg-card px-2 py-2 lg:hidden">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {nav.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : item.href.startsWith("/projects")
                      ? pathname.startsWith("/projects")
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
