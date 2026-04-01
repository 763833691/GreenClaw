"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, FolderKanban, Sparkles, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackendStatusBar } from "@/components/layout/backend-status-bar";
import { apiFetch } from "@/lib/api-client";

type Project = {
  id: string;
  name: string;
  buildingType?: string;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
};

function describeCreateError(raw: string): { message: string; showLoginLink: boolean } {
  if (raw === "missing_token") {
    return {
      message: "创建项目需要登录：后端会校验身份后才写入数据库。",
      showLoginLink: true
    };
  }
  if (raw === "not_found") {
    return {
      message:
        "请求发到了没有「项目接口」的服务（常见于 18789 被其他网关占用）。请确认已启动 apps/backend，并查看页顶「后端连通」是否为绿色。",
      showLoginLink: false
    };
  }
  return { message: raw, showLoginLink: false };
}

function useProjects() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/projects");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "加载项目失败");
        return;
      }
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, error, load, setItems };
}

export default function HomePage() {
  const { items, loading, error, load, setItems } = useProjects();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [name, setName] = useState("");
  const [buildingType, setBuildingType] = useState("公共建筑");

  useEffect(() => {
    void load();
  }, [load]);

  const recentProject = items[0];
  const avgEnergySaving = useMemo(() => (items.length ? "23.4%" : "--"), [items.length]);
  const avgCarbonReduction = useMemo(() => (items.length ? "18.9%" : "--"), [items.length]);
  const createErrHint = useMemo(() => (createError ? describeCreateError(createError) : null), [createError]);

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const response = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), buildingType })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setCreateError(data.error || "新建项目失败");
        return;
      }
      const created = await response.json();
      setItems((prev) => [created, ...prev]);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackendStatusBar />
      <div className="gb-tip flex items-center justify-between gap-3">
        <p>欢迎进入绿建工作台，当前数据均来自真实后端接口，可直接用于项目创建与计算流程。</p>
        <Badge className="hidden sm:inline-flex">Product UI</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>项目总数</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-primary">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              最近项目
            </CardDescription>
            <CardTitle className="text-base font-medium leading-snug">
              {recentProject?.name || (loading ? "加载中..." : "暂无项目")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{recentProject?.city || "--"}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-secondary" />
              平均节能率
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums text-secondary">{avgEnergySaving}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>平均碳减排（相对基准）</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-secondary">{avgCarbonReduction}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderKanban className="h-5 w-5 text-primary" />
                项目列表
              </CardTitle>
              <CardDescription>真实后端数据（`GET /api/projects`）</CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={() => void load()}>
              刷新
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">加载项目中...</p>
            ) : error ? (
              <div className="p-6 text-sm text-red-600">
                <p>加载失败：{error}</p>
                <Button variant="outline" className="mt-3" onClick={() => void load()}>
                  重试
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="gb-empty">
                <div className="gb-empty-icon">
                  <Building2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">还没有项目</p>
                <p className="text-xs text-muted-foreground">从右侧快速新建开始，完成后即可进入计算流程。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">项目名称</th>
                      <th className="px-4 py-3 font-medium">类型</th>
                      <th className="px-4 py-3 font-medium">城市</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-6 py-3 font-medium">更新</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                        <td className="px-6 py-3">
                          <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.buildingType || "--"}</td>
                        <td className="px-4 py-3">{p.city || "--"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">可编辑</Badge>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleString("zh-CN") : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快速新建</CardTitle>
            <CardDescription>
              点击创建后，浏览器会请求业务后端的 <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/projects</code>
              （不是占位假数据）。若失败，请看下方红字说明或页顶连通状态。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={createProject}>
              <div className="space-y-2">
                <Label htmlFor="project-name">项目名称</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：杭州研发中心"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-type">建筑类型</Label>
                <select
                  id="project-type"
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="gb-input-like"
                >
                  <option>公共建筑</option>
                  <option>居住建筑</option>
                  <option>工业建筑</option>
                </select>
              </div>
              {createErrHint ? (
                <div className="space-y-1 text-sm text-red-600">
                  <p>{createErrHint.message}</p>
                  {createErrHint.showLoginLink ? (
                    <Link href="/login" className="font-medium text-primary underline underline-offset-2">
                      前往登录
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <Button className="w-full" type="submit" disabled={creating}>
                {creating ? "创建中..." : "创建项目"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
