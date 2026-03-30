export async function calculateProject(project) {
  console.log(`🚀 开始计算项目: ${project.name} (${project.id})`);
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    params: {
      ...(project.params || {}),
      calculated: true
    },
    metrics: {
      energyConsumption: 12480,
      carbonEmission: 8.7,
      costEstimate: 456000,
      score: 87
    },
    recommendations: [
      "建议增加自然通风设计，可降低能耗 12%",
      "屋顶光伏覆盖率提升至 35% 可显著减少碳排放",
      "建筑朝向优化后年节能约 8.4%"
    ]
  };
}
