export async function calculateProject(project) {
  console.log(`[Calculation] 开始处理项目 → ${project.name} (${project.id})`);
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return {
    params: {
      ...(project.params || {}),
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
