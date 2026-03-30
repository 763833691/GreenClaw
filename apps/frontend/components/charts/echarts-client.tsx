"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const chartColors = ["#0ea5e9", "#14b8a6", "#22c55e", "#64748b", "#0d9488"];

export function EChartsClient({ option, height = 320 }: { option: EChartsOption; height?: number }) {
  return (
    <ReactECharts
      option={{ color: chartColors, ...option }}
      style={{ height }}
      notMerge
      lazyUpdate
      opts={{ renderer: "canvas" }}
    />
  );
}
