import "./globals.css";
import type { Metadata } from "next";
import { RootFrame } from "@/components/layout/root-frame";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GreenClaw | 绿建计算智能体",
  description: "绿建专属 Web UI：项目管理、参数录入、计算与报告"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <RootFrame>{children}</RootFrame>
      </body>
    </html>
  );
}
