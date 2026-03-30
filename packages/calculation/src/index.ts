export interface CalculationResult {
  params: Record<string, any>;
  metrics: {
    energyConsumption: number;
    carbonEmission: number;
    costEstimate: number;
    [key: string]: any;
  };
  recommendations: string[];
}

export async function calculateProject(project: any): Promise<CalculationResult> {
  console.log(`🚀 开始计算项目: ${project.name} (${project.id})`);

  // 这里放你的真实计算逻辑（可调用其他包）
  // 目前先给一个示例结果，后续可以替换成真实引擎
  await new Promise((resolve) => setTimeout(resolve, 800)); // 模拟计算耗时

  return {
    params: {
      ...project.params,
      calculated: true
    },
    metrics: {
      energyConsumption: 12480, // kWh
      carbonEmission: 8.7, // tCO2
      costEstimate: 456000, // 元
      score: 87
    },
    recommendations: [
      "建议增加自然通风设计，可降低能耗 12%",
      "屋顶光伏覆盖率提升至 35% 可显著减少碳排放",
      "建筑朝向优化后年节能约 8.4%"
    ]
  };
}
