"use client";

import { useState } from "react";
import { BarChart3, CheckCircle2, Loader2, Rocket, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export default function ComputePage() {
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // 触发计算
  const handleCalculate = async () => {
    if (!projectId) return alert("请选择项目");
    setLoading(true);
    setResult(null);

    try {
      const res = await apiFetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });

      const data = await res.json();
      if (data.jobId) {
        setJobId(data.jobId);
        pollStatus(data.jobId); // 开始轮询
      }
    } catch (err) {
      console.error(err);
      alert("调用计算接口失败");
    } finally {
      setLoading(false);
    }
  };

  // 轮询任务状态
  const pollStatus = async (jid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/calculate/status/${jid}`);
        const data = await res.json();

        setStatus(data);

        if (data.status === "completed") {
          clearInterval(interval);
          setResult(data.result);
          alert("✅ 计算完成！");
        } else if (data.status === "failed") {
          clearInterval(interval);
          alert("❌ 计算失败");
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500); // 每 1.5 秒轮询一次
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="gb-tip">
        已接入后端真实链路：触发计算后自动轮询状态，任务完成会展示最终评分与明细结果。
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-6 w-6 text-primary" />
              计算中心
            </CardTitle>
            <CardDescription>输入项目 ID 后触发计算任务（`POST /api/calculate`）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">项目 ID</p>
              <Input
                type="text"
                placeholder="例如：proj_001"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>

            <Button onClick={handleCalculate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在提交任务...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  开始计算
                </>
              )}
            </Button>

            {!jobId ? (
              <div className="gb-empty rounded-xl border border-dashed border-border/80 bg-muted/20">
                <div className="gb-empty-icon">
                  <Timer className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">尚未触发任务</p>
                <p className="text-xs text-muted-foreground">输入项目 ID 后点击“开始计算”即可。</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Job ID</p>
                <p className="mt-1 break-all font-mono text-sm">{jobId}</p>
                {status ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline">状态</Badge>
                    <span className="text-sm font-medium">{status.status}</span>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">执行说明</CardTitle>
            <CardDescription>核心链路保持不变，仅优化页面视觉与交互体验。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. 提交计算任务后，系统每 1.5 秒轮询一次任务状态。</p>
            <p>2. 当状态为 completed 时，页面将自动展示最终结果。</p>
            <p>3. 若状态为 failed，会弹出失败提示并停止轮询。</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-secondary" />
              计算结果
            </CardTitle>
            <CardDescription>任务完成后自动填充结果数据</CardDescription>
          </div>
          {result ? <Badge className="bg-secondary">已完成</Badge> : <Badge variant="outline">等待中</Badge>}
        </CardHeader>
        <CardContent>
          {result ? (
            <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-5 text-xs text-emerald-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <div className="gb-empty rounded-xl border border-dashed border-border/80 bg-muted/20">
              <div className="gb-empty-icon">
                <BarChart3 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">暂无结果</p>
              <p className="text-xs text-muted-foreground">任务完成后，这里会展示完整 JSON 输出。</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
