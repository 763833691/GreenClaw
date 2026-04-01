"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Building2, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type Project = {
  id: string;
  name: string;
  buildingType?: string;
  city?: string;
  updatedAt?: string;
};

export default function ProjectsListPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/projects");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "加载失败");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">我的项目</h1>
        <p className="text-sm text-muted-foreground">
          从列表进入真实项目详情（侧栏原先的「demo」仅为占位路径，已改为本页）。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderKanban className="h-5 w-5 text-primary" />
              项目列表
            </CardTitle>
            <CardDescription>点击名称进入 `/projects/[项目ID]` 详情与参数编辑</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <Link href="/">
              去首页新建
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">加载中…</p>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">
              <p>加载失败：{error}</p>
              <Button variant="outline" className="mt-3" size="sm" onClick={() => void load()}>
                重试
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="gb-empty">
              <div className="gb-empty-icon">
                <Building2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">暂无项目</p>
              <p className="text-xs text-muted-foreground">请在首页「快速新建」创建后再回到此处。</p>
              <Button className="mt-4" asChild>
                <Link href="/">返回首页</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">项目名称</th>
                    <th className="px-4 py-3 font-medium">类型</th>
                    <th className="px-4 py-3 font-medium">城市</th>
                    <th className="px-6 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 hover:bg-muted/40">
                      <td className="px-6 py-3">
                        <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.buildingType || "—"}</td>
                      <td className="px-4 py-3">{p.city || "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant="outline">可编辑</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
