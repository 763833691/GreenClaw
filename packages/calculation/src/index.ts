export interface CalculationResult {
  params: Record<string, any>; // 计算后的参数
  metrics: {
    energyConsumption?: number; // kWh
    carbonEmission?: number; // tCO2
    costEstimate?: number; // 元
    score?: number; // 综合评分 0-100
    [key: string]: any;
  };
  recommendations: string[];
  rawData?: any; // 原始计算数据（给客户调试用）
}

export async function calculateProject(project: any): Promise<CalculationResult> {
  console.log(`[Calculation] 开始处理项目 → ${project.name} (${project.id})`);

  // ==================== 这里是占位逻辑 ====================
  // 等客户给出方案后，直接替换这里的代码即可
  await new Promise((r) => setTimeout(r, 1200)); // 模拟计算耗时

  return {
    params: {
      ...project.params,
      calculated: true,
      version: "1.0"
    },
    metrics: {
      energyConsumption: 12480,
      carbonEmission: 8.7,
      costEstimate: 456000,
      score: 87
    },
    recommendations: ["等待客户提供最终计算方案后，此处将替换为真实算法", "当前为框架占位版本"],
    rawData: { note: "客户方案接入点" }
  };
}
