"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Upload } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Project = {
  id: string;
  name: string;
  buildingType?: string;
  city?: string;
  params?: Record<string, unknown>;
};

type FormState = {
  buildingType: string;
  area: string;
  floors: string;
  wwr: string;
  wallU: string;
  roofU: string;
  windowU: string;
  shgc: string;
  cop: string;
  erv: string;
  lpd: string;
  fanPower: string;
  zone: string;
  city: string;
};

const DEFAULT_FORM: FormState = {
  buildingType: "公共建筑",
  area: "32500",
  floors: "18",
  wwr: "0.42",
  wallU: "0.48",
  roofU: "0.35",
  windowU: "1.8",
  shgc: "0.38",
  cop: "4.2",
  erv: "65",
  lpd: "7.5",
  fanPower: "0.25",
  zone: "hot_summer_cold_winter",
  city: "上海"
};

function toStr(v: unknown, fallback: string) {
  return typeof v === "string" || typeof v === "number" ? String(v) : fallback;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setLoading(true);
      setError("");
      const res = await apiFetch(`/api/projects/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "加载失败");
        setLoading(false);
        return;
      }
      const data: Project = await res.json();
      setProject(data);
      const p = (data.params || {}) as Record<string, unknown>;
      setForm({
        buildingType: toStr(data.buildingType, DEFAULT_FORM.buildingType),
        area: toStr(p.area, DEFAULT_FORM.area),
        floors: toStr(p.floors, DEFAULT_FORM.floors),
        wwr: toStr(p.wwr, DEFAULT_FORM.wwr),
        wallU: toStr(p.wallU, DEFAULT_FORM.wallU),
        roofU: toStr(p.roofU, DEFAULT_FORM.roofU),
        windowU: toStr(p.windowU, DEFAULT_FORM.windowU),
        shgc: toStr(p.shgc, DEFAULT_FORM.shgc),
        cop: toStr(p.cop, DEFAULT_FORM.cop),
        erv: toStr(p.erv, DEFAULT_FORM.erv),
        lpd: toStr(p.lpd, DEFAULT_FORM.lpd),
        fanPower: toStr(p.fanPower, DEFAULT_FORM.fanPower),
        zone: toStr(p.zone, DEFAULT_FORM.zone),
        city: toStr(data.city, DEFAULT_FORM.city)
      });
      setLoading(false);
    };
    void run();
  }, [id]);

  const patch = useMemo(
    () => ({
      area: Number(form.area),
      floors: Number(form.floors),
      wwr: Number(form.wwr),
      wallU: Number(form.wallU),
      roofU: Number(form.roofU),
      windowU: Number(form.windowU),
      shgc: Number(form.shgc),
      cop: Number(form.cop),
      erv: Number(form.erv),
      lpd: Number(form.lpd),
      fanPower: Number(form.fanPower),
      zone: form.zone
    }),
    [form]
  );

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!id) return;
    setSaving(true);
    setHint("");
    const res = await apiFetch(`/api/projects/${id}/params`, {
      method: "PATCH",
      body: JSON.stringify({
        patch,
        meta: { buildingType: form.buildingType, city: form.city }
      })
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHint(`保存失败：${data.error || "unknown"}`);
      return;
    }
    setHint("保存成功");
  }

  async function calc() {
    if (!id) return;
    const res = await apiFetch("/api/calculate", {
      method: "POST",
      body: JSON.stringify({ projectId: id })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHint(`触发计算失败：${data.error || "unknown"}`);
      return;
    }
    const data = await res.json();
    setHint(`已触发计算：${data.jobId}`);
  }

  if (loading) return <p className="text-sm text-muted-foreground">加载项目中...</p>;
  if (error) return <p className="text-sm text-red-600">加载失败：{error}</p>;
  if (!project) return <p className="text-sm text-muted-foreground">项目不存在</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">项目详情 · {project.name}</h1>
          <p className="text-sm text-muted-foreground">项目 ID：{id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={calc}>
            触发计算
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "保存中..." : "保存参数"}
          </Button>
        </div>
      </div>
      {hint ? <p className="text-sm text-primary">{hint}</p> : null}

      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="envelope">围护结构</TabsTrigger>
          <TabsTrigger value="hvac">设备系统</TabsTrigger>
          <TabsTrigger value="climate">气候分区</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>建筑类型</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.buildingType} onChange={(e) => setField("buildingType", e.target.value)}>
                  <option>公共建筑</option>
                  <option>居住建筑</option>
                  <option>工业建筑</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>总建筑面积</Label>
                <Input value={form.area} onChange={(e) => setField("area", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>层数</Label>
                <Input value={form.floors} onChange={(e) => setField("floors", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>窗墙比</Label>
                <Input value={form.wwr} onChange={(e) => setField("wwr", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="envelope">
          <Card>
            <CardHeader>
              <CardTitle>围护结构</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>外墙U</Label><Input value={form.wallU} onChange={(e) => setField("wallU", e.target.value)} /></div>
              <div className="space-y-2"><Label>屋面U</Label><Input value={form.roofU} onChange={(e) => setField("roofU", e.target.value)} /></div>
              <div className="space-y-2"><Label>外窗U</Label><Input value={form.windowU} onChange={(e) => setField("windowU", e.target.value)} /></div>
              <div className="space-y-2"><Label>SHGC</Label><Input value={form.shgc} onChange={(e) => setField("shgc", e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hvac">
          <Card>
            <CardHeader>
              <CardTitle>设备系统</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>COP</Label><Input value={form.cop} onChange={(e) => setField("cop", e.target.value)} /></div>
              <div className="space-y-2"><Label>热回收效率</Label><Input value={form.erv} onChange={(e) => setField("erv", e.target.value)} /></div>
              <div className="space-y-2"><Label>LPD</Label><Input value={form.lpd} onChange={(e) => setField("lpd", e.target.value)} /></div>
              <div className="space-y-2"><Label>风机耗功</Label><Input value={form.fanPower} onChange={(e) => setField("fanPower", e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="climate">
          <Card>
            <CardHeader>
              <CardTitle>气候分区与外部数据</CardTitle>
              <CardDescription>上传接口下一步联调</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>气候分区</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.zone} onChange={(e) => setField("zone", e.target.value)}>
                    <option value="severe_cold">严寒</option>
                    <option value="cold">寒冷</option>
                    <option value="hot_summer_cold_winter">夏热冬冷</option>
                    <option value="hot_summer_warm_winter">夏热冬暖</option>
                    <option value="mild">温和</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>城市</Label>
                  <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center gap-3">
                  <Upload className="h-6 w-6 text-primary" />
                  <Input type="file" accept=".xlsx,.xls,.xml,.gbxml" className="max-w-md cursor-pointer" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
