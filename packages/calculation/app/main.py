from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="GreenClaw Calculation Engine",
    version="0.4.0",
    description="绿建计算智能体后端服务（演示版 Mock 算法）",
)


class BuildingParams(BaseModel):
    """绿建计算输入参数（演示链路最小完整字段）。"""

    project_name: Optional[str] = Field(default=None, description="项目名称")
    city: str = Field(default="上海", description="项目所在城市")
    climate_zone: str = Field(default="夏热冬冷", description="气候分区")
    building_type: str = Field(default="办公建筑", description="建筑类型")
    area: float = Field(default=12000, gt=0, description="建筑面积(m2)")
    floors: int = Field(default=12, ge=1, description="建筑层数")
    window_wall_ratio: float = Field(default=0.42, ge=0, le=1, description="窗墙比(0-1)")
    wall_u_value: float = Field(default=0.55, gt=0, description="外墙传热系数 U(W/m2.K)")
    roof_u_value: float = Field(default=0.40, gt=0, description="屋面传热系数 U(W/m2.K)")
    glass_u_value: float = Field(default=2.00, gt=0, description="外窗传热系数 U(W/m2.K)")
    shgc: float = Field(default=0.38, gt=0, le=1, description="玻璃遮阳系数 SHGC")
    hvac_efficiency: float = Field(default=0.86, gt=0, le=1, description="暖通系统效率(0-1)")
    lighting_power_density: float = Field(default=8.5, gt=0, description="照明功率密度 W/m2")
    renewable_ratio: float = Field(default=0.16, ge=0, le=1, description="可再生能源占比(0-1)")
    baseline_intensity_kwh_m2: float = Field(
        default=105.0,
        gt=0,
        description="基准能耗强度(kWh/m2·a)",
    )
    extras: Dict[str, Any] = Field(default_factory=dict, description="扩展参数")


class CalculationRequest(BaseModel):
    """
    兼容两种请求格式：
    1) 推荐：{"project_id":"p-001","params":{...}}
    2) 扁平：{"project_id":"p-001","building_type":"办公建筑","area":12000,...}
    """

    project_id: Optional[str] = Field(default=None, description="项目ID")
    params: Optional[BuildingParams] = Field(default=None, description="嵌套计算参数（推荐）")
    project_name: Optional[str] = None
    city: Optional[str] = None
    climate_zone: Optional[str] = None
    building_type: Optional[str] = None
    area: Optional[float] = None
    floors: Optional[int] = None
    window_wall_ratio: Optional[float] = None
    wall_u_value: Optional[float] = None
    roof_u_value: Optional[float] = None
    glass_u_value: Optional[float] = None
    shgc: Optional[float] = None
    hvac_efficiency: Optional[float] = None
    lighting_power_density: Optional[float] = None
    renewable_ratio: Optional[float] = None
    baseline_intensity_kwh_m2: Optional[float] = None
    extras: Dict[str, Any] = Field(default_factory=dict)

    def resolve_params(self) -> BuildingParams:
        if self.params is not None:
            return self.params

        payload = {
            "project_name": self.project_name,
            "city": self.city,
            "climate_zone": self.climate_zone,
            "building_type": self.building_type,
            "area": self.area,
            "floors": self.floors,
            "window_wall_ratio": self.window_wall_ratio,
            "wall_u_value": self.wall_u_value,
            "roof_u_value": self.roof_u_value,
            "glass_u_value": self.glass_u_value,
            "shgc": self.shgc,
            "hvac_efficiency": self.hvac_efficiency,
            "lighting_power_density": self.lighting_power_density,
            "renewable_ratio": self.renewable_ratio,
            "baseline_intensity_kwh_m2": self.baseline_intensity_kwh_m2,
            "extras": self.extras,
        }
        clean_payload = {k: v for k, v in payload.items() if v is not None}
        return BuildingParams(**clean_payload)


class ScoreBreakdown(BaseModel):
    energy_efficiency: int
    envelope_performance: int
    hvac_and_controls: int
    renewable_energy: int
    operation_and_management: int


class OptimizationItem(BaseModel):
    title: str
    expected_saving_rate: float = Field(description="预计节能率提升(%)")
    expected_carbon_reduction_tco2: float = Field(description="预计减碳量(tCO2/a)")
    priority: str = Field(description="优先级: high/medium/low")
    action: str


class CalculationResult(BaseModel):
    annual_energy_intensity_kwh_m2: float
    annual_total_energy_kwh: float
    baseline_energy_intensity_kwh_m2: float
    energy_saving_rate_pct: float
    annual_carbon_emission_tco2: float
    annual_carbon_reduction_tco2: float
    green_score: int
    green_level: str
    score_breakdown: ScoreBreakdown
    optimization_suggestions: List[OptimizationItem]
    quick_conclusion: str
    meta: Dict[str, Any]


class CalculationResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    project_id: Optional[str]
    result: CalculationResult


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def run_mock_green_building_calculation(params: BuildingParams) -> CalculationResult:
    """
    演示版 mock 计算逻辑：
    - 输出合理、结构化且可展示的绿建结果
    - 用于完整业务闭环演示，不替代真实仿真算法
    """
    baseline_intensity = params.baseline_intensity_kwh_m2

    window_penalty = max(0.0, (params.window_wall_ratio - 0.35) * 22.0)
    wall_penalty = max(0.0, (params.wall_u_value - 0.50) * 12.0)
    roof_penalty = max(0.0, (params.roof_u_value - 0.40) * 8.0)
    glass_penalty = max(0.0, (params.glass_u_value - 2.0) * 7.0)
    solar_penalty = max(0.0, (params.shgc - 0.35) * 16.0)
    hvac_bonus = (params.hvac_efficiency - 0.80) * 42.0
    lighting_bonus = max(0.0, (9.5 - params.lighting_power_density) * 2.8)
    renewable_bonus = params.renewable_ratio * 26.0

    annual_intensity = baseline_intensity + window_penalty + wall_penalty + roof_penalty
    annual_intensity += (
        glass_penalty + solar_penalty - hvac_bonus - lighting_bonus - renewable_bonus
    )
    annual_intensity = _clamp(annual_intensity, 48.0, baseline_intensity * 1.10)

    annual_total_energy = annual_intensity * params.area
    energy_saving_rate = _clamp(
        (baseline_intensity - annual_intensity) / baseline_intensity * 100, 0.0, 65.0
    )

    carbon_factor = 0.00042  # tCO2 / kWh
    annual_carbon = annual_total_energy * carbon_factor
    baseline_carbon = baseline_intensity * params.area * carbon_factor
    annual_carbon_reduction = max(0.0, baseline_carbon - annual_carbon)

    score_energy = int(round(_clamp(58 + energy_saving_rate * 1.0, 45, 95)))
    score_envelope = int(
        round(
            _clamp(
                80
                - (params.wall_u_value - 0.45) * 30
                - (params.roof_u_value - 0.35) * 25
                - (params.glass_u_value - 1.8) * 10
                - (params.window_wall_ratio - 0.35) * 40,
                45,
                95,
            )
        )
    )
    score_hvac = int(round(_clamp(55 + params.hvac_efficiency * 40, 40, 95)))
    score_renewable = int(round(_clamp(50 + params.renewable_ratio * 180, 35, 95)))
    score_om = int(round(_clamp(72 + (params.floors / 30) * 8, 60, 90)))

    green_score = int(
        round(
            score_energy * 0.34
            + score_envelope * 0.20
            + score_hvac * 0.20
            + score_renewable * 0.16
            + score_om * 0.10
        )
    )
    green_score = int(_clamp(green_score, 0, 100))

    if green_score >= 85:
        green_level = "三星"
    elif green_score >= 70:
        green_level = "二星"
    else:
        green_level = "一星"

    suggestions: List[OptimizationItem] = []
    if params.window_wall_ratio > 0.40:
        suggestions.append(
            OptimizationItem(
                title="优化立面窗墙比与外遮阳",
                expected_saving_rate=3.2,
                expected_carbon_reduction_tco2=annual_carbon * 0.032,
                priority="high",
                action="将主要朝向窗墙比控制在0.35~0.40，并增加可调外遮阳系统。",
            )
        )
    if params.hvac_efficiency < 0.88:
        suggestions.append(
            OptimizationItem(
                title="提升暖通机组效率与控制策略",
                expected_saving_rate=4.6,
                expected_carbon_reduction_tco2=annual_carbon * 0.046,
                priority="high",
                action="替换高效冷热源并引入分时控制、CO2联动新风与群控优化。",
            )
        )
    if params.renewable_ratio < 0.20:
        suggestions.append(
            OptimizationItem(
                title="提高可再生能源占比",
                expected_saving_rate=2.8,
                expected_carbon_reduction_tco2=annual_carbon * 0.028,
                priority="medium",
                action="增加屋顶光伏装机并优先覆盖公区与机电设备用电负荷。",
            )
        )
    if params.lighting_power_density > 8.0:
        suggestions.append(
            OptimizationItem(
                title="降低照明功率密度",
                expected_saving_rate=1.7,
                expected_carbon_reduction_tco2=annual_carbon * 0.017,
                priority="low",
                action="将办公区照明功率密度优化至7.0~7.5 W/m2，并配合感应调光。",
            )
        )
    if not suggestions:
        suggestions.append(
            OptimizationItem(
                title="方案表现优良，建议做参数敏感性分析",
                expected_saving_rate=1.2,
                expected_carbon_reduction_tco2=annual_carbon * 0.012,
                priority="low",
                action="维持当前参数，针对不同气候年的运行工况补充校核。",
            )
        )

    quick_conclusion = (
        f"该方案年综合能耗强度约 {annual_intensity:.1f} kWh/m2，"
        f"较基准节能 {energy_saving_rate:.1f}%，预计可达到绿建{green_level}水平。"
    )

    return CalculationResult(
        annual_energy_intensity_kwh_m2=round(annual_intensity, 2),
        annual_total_energy_kwh=round(annual_total_energy, 2),
        baseline_energy_intensity_kwh_m2=round(baseline_intensity, 2),
        energy_saving_rate_pct=round(energy_saving_rate, 2),
        annual_carbon_emission_tco2=round(annual_carbon, 2),
        annual_carbon_reduction_tco2=round(annual_carbon_reduction, 2),
        green_score=green_score,
        green_level=green_level,
        score_breakdown=ScoreBreakdown(
            energy_efficiency=score_energy,
            envelope_performance=score_envelope,
            hvac_and_controls=score_hvac,
            renewable_energy=score_renewable,
            operation_and_management=score_om,
        ),
        optimization_suggestions=suggestions,
        quick_conclusion=quick_conclusion,
        meta={
            "algorithm": "mock-demo-v3",
            "city": params.city,
            "climate_zone": params.climate_zone,
            "building_type": params.building_type,
            "calculation_mode": "annual",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "message": "GreenClaw Calculation Engine is running",
        "service": "python-calculator",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": "calc-engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/calculate", response_model=CalculationResponse)
def calculate(req: CalculationRequest) -> CalculationResponse:
    resolved_params = req.resolve_params()
    result = run_mock_green_building_calculation(resolved_params)
    return CalculationResponse(
        status="ok",
        service="calc-engine",
        timestamp=datetime.now(timezone.utc).isoformat(),
        project_id=req.project_id,
        result=result,
    )


@app.get("/test")
def test() -> Dict[str, str]:
    return {"message": "计算引擎测试接口正常", "green_building": "ready"}