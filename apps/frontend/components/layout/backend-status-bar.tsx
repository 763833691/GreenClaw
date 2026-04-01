"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getApiBaseCandidates,
  getConfiguredApiBaseUrl,
  probeApiHealth,
  type BackendHealthProbe
} from "@/lib/api-client";

function isGreenClawBackend(service: string | undefined): boolean {
  return service === "backend";
}

export function BackendStatusBar() {
  const configured = getConfiguredApiBaseUrl();
  const candidates = useMemo(() => getApiBaseCandidates(), []);
  const [primary, setPrimary] = useState<BackendHealthProbe | null>(null);
  const [secondary, setSecondary] = useState<BackendHealthProbe | null>(null);
  const [loading, setLoading] = useState(true);

  const runProbe = useCallback(async () => {
    setLoading(true);
    const p = await probeApiHealth(candidates[0] ?? configured);
    setPrimary(p);
    if (candidates.length > 1) {
      setSecondary(await probeApiHealth(candidates[1]));
    } else {
      setSecondary(null);
    }
    setLoading(false);
  }, [configured, candidates]);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  const primaryIsBackend = primary?.ok && isGreenClawBackend(primary.service);
  const primaryWrongService =
    primary?.ok && primary.service !== undefined && !isGreenClawBackend(primary.service);
  const fallbackIsBackend = secondary?.ok && isGreenClawBackend(secondary.service);
  const secondaryIsOtherGateway =
    secondary?.ok && Boolean(secondary.service) && !isGreenClawBackend(secondary.service);

  let tone: "ok" | "warn" | "err" = "err";
  let Icon = WifiOff;
  let title = "后端未连通";
  let detail = "";

  if (loading) {
    tone = "warn";
    Icon = Loader2;
    title = "正在检测后端…";
  } else if (primaryIsBackend) {
    tone = "ok";
    Icon = CheckCircle2;
    title = "已连接 GreenClaw 业务后端";
    detail = `接口基址：${configured}`;
  } else if (primaryWrongService) {
    tone = "warn";
    Icon = AlertCircle;
    title = "端口可访问，但不是本项目业务后端";
    detail = `当前 ${configured} 返回 service="${primary?.service ?? "?"}"，项目 API（如 /api/projects）可能不可用。请确认阿里云后端服务已运行且可公网访问。`;
    if (fallbackIsBackend && candidates[1] && candidates[1] !== configured) {
      detail += ` 检测到地址 ${candidates[1]} 为业务后端。`;
    }
  } else if (primary?.ok && !primary.service) {
    tone = "warn";
    Icon = AlertCircle;
    title = "健康检查响应异常";
    detail = `请确认 ${configured} 是否为 GreenClaw backend。`;
  } else {
    tone = "err";
    Icon = WifiOff;
    title = "无法连接配置的后端";
    if (!primary?.ok && secondaryIsOtherGateway && candidates[1]) {
      detail = `${configured} 上没有本项目的 Node 服务（请先启动 apps/backend）。探测到 ${candidates[1]} 可访问且为「${secondary.service}」，属于其他项目网关，不能代替本项目的 /api/projects。请在仓库根目录新开终端执行：pnpm run dev:gateway 或 .\\scripts\\start-gateway-local.ps1，保持窗口运行后再点「重新检测」。`;
    } else {
      detail = primary?.error
        ? `${configured}：${primary.error}`
        : "请确认阿里云后端服务已启动，且 4000 端口对外可访问。";
      if (fallbackIsBackend && candidates[1]) {
        detail += ` 地址 ${candidates[1]} 可连通业务后端。`;
      }
    }
  }

  const borderClass =
    tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-destructive/40 bg-destructive/5";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${borderClass}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${loading ? "animate-spin text-amber-600" : tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-destructive"}`}
        />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          {detail ? <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p> : null}
          {!loading ? (
            <p className="font-mono text-[11px] text-muted-foreground/90 break-all">
              配置：{configured}
              {candidates.length > 1 ? ` · 亦探测：${candidates.slice(1).join("、")}` : ""}
            </p>
          ) : null}
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => void runProbe()} disabled={loading}>
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        重新检测
      </Button>
    </div>
  );
}
