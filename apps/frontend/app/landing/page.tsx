import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Leaf, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 py-6">
      <section className="rounded-2xl border bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-8 md:p-12">
        <div className="max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            GreenClaw · 绿建计算智能体
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            面向建筑行业的一站式
            <span className="text-primary"> 绿建计算平台</span>
          </h1>
          <p className="text-muted-foreground md:text-lg">
            基于 OpenClaw 理念，集成项目管理、能耗碳排、GB/T 50378 评分、优化建议和报告输出。支持本地化 Docker
            一键部署，适配设计院与咨询公司团队使用。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/">
                进入工作台
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noreferrer">
                OpenClaw 参考项目
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: BarChart3, title: "计算中心", desc: "一键触发能耗、碳排与绿建评分，图表实时展示。" },
          { icon: MessageSquare, title: "优化助手", desc: "自然语言调参并重算，如“外墙保温加厚5cm”场景。" },
          { icon: FileText, title: "报告导出", desc: "自动生成 PDF/Word 报告，便于汇报和审查。" },
          { icon: Leaf, title: "规则契合", desc: "围绕 GB/T 50378 组织指标与建议，强调可追溯性。" }
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <item.icon className="h-5 w-5 text-primary" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.desc}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>产品截图占位</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              可在 `apps/frontend/public/screenshots/` 放置真实截图，README 和此页面可直接引用。
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. 复制环境变量：`cp .env.example .env`</p>
            <p>2. 一键启动：`docker compose -f infra/compose/docker-compose.yml --env-file .env up -d`</p>
            <p>3. 打开 `http://localhost:3000/landing` 查看产品主页</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
