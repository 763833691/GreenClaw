"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

const AUTH_PATHS = ["/login", "/register"];

export function RootFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isAuthPage) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
