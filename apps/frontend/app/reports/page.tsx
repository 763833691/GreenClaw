"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);

  const generate = () => {
    setGenerating(true);
    setReady(false);
    setTimeout(() => {
      setGenerating(false);
      setReady(true);
    }, 1500);
  };

  const downloadPdf = () => {
    const blob = new Blob(
      ["GreenClaw 报告占位 PDF\n\n正式版本由后端生成二进制流或对象存储 URL。"],
      { type: "application/pdf" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "greenclaw-report-demo.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = () => {
    const blob = new Blob(
      ["GreenClaw 报告占位 Word\n\n正式版本由后端 python-docx / 模板引擎生成。"],
      { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "greenclaw-report-demo.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">报告中心</h1>
        <p className="text-sm text-muted-foreground">生成绿建与能耗综合报告，支持 PDF / Word 下载（预览联调后端后替换为真实文件）</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">生成报告</CardTitle>
              <CardDescription>汇总当前项目参数、计算结果与绿建条文结论</CardDescription>
            </div>
          </div>
          <Button onClick={generate} disabled={generating} className="gap-2 shrink-0">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中
              </>
            ) : (
              "生成并刷新预览"
            )}
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            <div className="border-b bg-card px-4 py-2 text-xs font-medium text-muted-foreground">预览</div>
            <div className="flex min-h-[420px] items-center justify-center p-8">
              {ready ? (
                <div className="max-w-lg space-y-3 text-sm text-foreground">
                  <p className="text-base font-semibold">GreenClaw 绿建与能耗简报（示例）</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    <li>项目：上海商务中心 A 座 · 夏热冬冷</li>
                    <li>节能率（相对基准）：23.4%</li>
                    <li>绿建星级预估：二星级（示意）</li>
                    <li>碳排强度：45 kgCO₂e/m²·a</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">正式 PDF 预览可使用浏览器内嵌或 react-pdf；此处为占位 HTML。</p>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {generating ? "正在组装报告…" : "点击「生成并刷新预览」查看摘要；联调后此处嵌入 PDF 或 Word 在线预览。"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" className="gap-2" onClick={downloadPdf} disabled={!ready}>
              <Download className="h-4 w-4" />
              下载 PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadDocx} disabled={!ready}>
              <Download className="h-4 w-4" />
              下载 Word
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
