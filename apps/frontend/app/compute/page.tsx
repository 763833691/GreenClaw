"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { EChartsClient } from "@/components/charts/echarts-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const steps = [12, 35, 58, 82, 100];

export default function ComputePage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("就绪");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    setStepLabel("正在校验参数…");
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i >= steps.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setRunning(false);
        setStepLabel("计算完成");
        return;
      }
      setProgress(steps[i]);
      const labels = ["正在校验参数…", "简化热平衡 / 引擎计算…", "绿建条文匹配…", "碳排因子核算…", "汇总结果"];
      setStepLabel(labels[i] ?? "计算中");
      i += 1;
    }, 900);
  }, [running]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">计算中心</h1>
        <p className="text-sm text-muted-foreground">一键触发能耗、绿建评分与碳排放综合计算（演示进度与示例图表）</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>开始计算</CardTitle>
            <CardDescription>{stepLabel}</CardDescription>
          </div>
          <Button onClick={start} disabled={running} className="gap-2 shrink-0">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                计算中
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                开始计算
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">进度：{progress}%</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">能耗 Breakdown</CardTitle>
            <CardDescription>按终端用途占比（示例数据）</CardDescription>
          </CardHeader>
          <CardContent>
            <EChartsClient
              height={300}
              option={{
                tooltip: { trigger: "item" },
                series: [
                  {
                    type: "pie",
                    radius: ["42%", "68%"],
                    label: { formatter: "{b}\n{d}%" },
                    data: [
                      { value: 38, name: "空调" },
                      { value: 24, name: "照明" },
                      { value: 17, name: "新风" },
                      { value: 12, name: "水泵" },
                      { value: 9, name: "其他" }
                    ]
                  }
                ]
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">绿色评价雷达图</CardTitle>
            <CardDescription>GB/T 50378 维度得分示意</CardDescription>
          </CardHeader>
          <CardContent>
            <EChartsClient
              height={300}
              option={{
                tooltip: {},
                radar: {
                  indicator: [
                    { name: "节地与室外环境", max: 100 },
                    { name: "节能与能源利用", max: 100 },
                    { name: "节水", max: 100 },
                    { name: "节材与材料", max: 100 },
                    { name: "室内环境", max: 100 }
                  ],
                  splitArea: { areaStyle: { color: ["rgba(14,165,233,0.05)", "rgba(20,184,166,0.08)"] } }
                },
                series: [
                  {
                    type: "radar",
                    data: [{ value: [82, 88, 76, 71, 85], name: "当前方案", areaStyle: { opacity: 0.25 } }]
                  }
                ]
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">碳排放对比（kgCO₂e/m²·a）</CardTitle>
          <CardDescription>基准与方案对比（示例）</CardDescription>
        </CardHeader>
        <CardContent>
          <EChartsClient
            height={320}
            option={{
              tooltip: { trigger: "axis" },
              grid: { left: 48, right: 24, bottom: 32, top: 24 },
              xAxis: { type: "category", data: ["基准", "方案 A", "方案 B", "当前"] },
              yAxis: { type: "value", name: "强度" },
              series: [
                {
                  type: "bar",
                  data: [56, 48, 43, 45],
                  itemStyle: {
                    color: {
                      type: "linear",
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: "#0ea5e9" },
                        { offset: 1, color: "#14b8a6" }
                      ]
                    }
                  }
                }
              ]
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
