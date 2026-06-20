import type { CalculationParams, CalculationResult, CheckItem, SafetyStatus, ParamKey } from "@/types";

export interface ParamSensitivity {
  param: ParamKey;
  impactScore: number;
  direction: "decrease" | "increase";
  description: string;
  estimatedImprovement: number;
}

export interface PrioritySuggestion {
  rank: number;
  checkId: string;
  checkName: string;
  topAction: ParamSensitivity;
  alternativeActions: ParamSensitivity[];
}

function checkPoleStability(params: CalculationParams): CheckItem {
  const concreteWeight = (params.slabThickness / 1000) * 25;
  const loadArea = (params.poleSpacingX / 1000) * (params.poleSpacingY / 1000);
  const N = (concreteWeight + params.constructionLoad) * loadArea;

  const allowableN = Math.max(15, 35 - ((params.stepDistance - 1500) / 100) * 5);

  const safetyFactor = allowableN / N;

  const passed = safetyFactor >= 1.3;

  return {
    id: "pole-stability",
    name: "立杆稳定性",
    description: "验算立杆在轴向压力作用下是否会发生失稳破坏",
    safetyFactor: Math.round(safetyFactor * 100) / 100,
    requiredFactor: 1.3,
    passed,
    plainExplanation: passed
      ? "立杆间距合理，步距适中，立杆不会被压弯。"
      : "立杆间距太大或步距太高，就像竹竿太长容易弯，立杆可能失稳倒塌。",
    affectedParams: [
      "poleSpacingX",
      "poleSpacingY",
      "stepDistance",
      "slabThickness",
      "constructionLoad",
    ],
    icon: "TrendingUp",
  };
}

function checkSlabDeflection(params: CalculationParams): CheckItem {
  const deflectionIndex =
    Math.pow(params.woodSpacing / 250, 4) / Math.pow(params.slabThickness / 120, 3);
  const safetyFactor = 1 / deflectionIndex;

  const passed = safetyFactor >= 1.0;

  return {
    id: "slab-deflection",
    name: "面板挠度",
    description: "验算模板面板在荷载作用下的弯曲变形是否超过容许值",
    safetyFactor: Math.round(safetyFactor * 100) / 100,
    requiredFactor: 1.0,
    passed,
    plainExplanation: passed
      ? "木方间距合适，模板不会下垂变形。"
      : "木方间距太大，模板就像架在稀板凳上的木板，中间会向下弯，造成楼板底面不平整。",
    affectedParams: ["woodSpacing", "slabThickness"],
    icon: "MoveVertical",
  };
}

function checkCouplerSlip(params: CalculationParams): CheckItem {
  const concreteWeight = (params.slabThickness / 1000) * 25;
  const loadPerPole =
    (concreteWeight + params.constructionLoad) *
    (params.poleSpacingX / 1000) *
    (params.poleSpacingY / 1000);
  const allowableSlip = 8;
  const safetyFactor = allowableSlip / (loadPerPole / 4);

  const passed = safetyFactor >= 1.25;

  return {
    id: "coupler-slip",
    name: "扣件抗滑",
    description: "验算钢管扣件连接处是否会发生滑移",
    safetyFactor: Math.round(safetyFactor * 100) / 100,
    requiredFactor: 1.25,
    passed,
    plainExplanation: passed
      ? "荷载在扣件抗滑能力范围内，连接可靠。"
      : "荷载太大时，扣件就像没拧紧的衣服扣子，受力太大可能滑脱，造成支撑体系垮塌。",
    affectedParams: ["poleSpacingX", "poleSpacingY", "slabThickness", "constructionLoad"],
    icon: "Link",
  };
}

function checkWoodBending(params: CalculationParams): CheckItem {
  const loadPerLength =
    ((params.slabThickness / 1000) * 25 + params.constructionLoad) *
    (params.woodSpacing / 1000);
  const moment = (loadPerLength * Math.pow(params.poleSpacingY / 1000, 2)) / 8;
  const allowableMoment = 1.2;
  const safetyFactor = allowableMoment / moment;

  const passed = safetyFactor >= 1.3;

  return {
    id: "wood-bending",
    name: "木方抗弯",
    description: "验算木方在荷载作用下的抗弯强度是否满足",
    safetyFactor: Math.round(safetyFactor * 100) / 100,
    requiredFactor: 1.3,
    passed,
    plainExplanation: passed
      ? "木方间距和跨度合理，木方不会断裂。"
      : "木方间距太大或跨度太长，木方就像架在两个支点间的扁担，太重会断。",
    affectedParams: ["woodSpacing", "poleSpacingY", "slabThickness", "constructionLoad"],
    icon: "ArrowRightLeft",
  };
}

export function calculateSafety(params: CalculationParams): CalculationResult {
  const checks = [
    checkPoleStability(params),
    checkSlabDeflection(params),
    checkCouplerSlip(params),
    checkWoodBending(params),
  ];

  const safetyFactors = checks.map((c) => c.safetyFactor / c.requiredFactor);
  const overallSafetyFactor = Math.min(...safetyFactors);

  let status: SafetyStatus;
  if (overallSafetyFactor >= 1.1) {
    status = "safe";
  } else if (overallSafetyFactor >= 0.95) {
    status = "warning";
  } else {
    status = "danger";
  }

  return {
    overallSafetyFactor: Math.round(overallSafetyFactor * 100) / 100,
    status,
    checks,
    timestamp: Date.now(),
  };
}

export function getStatusColor(status: SafetyStatus): string {
  switch (status) {
    case "safe":
      return "#059669";
    case "warning":
      return "#F59E0B";
    case "danger":
      return "#DC2626";
  }
}

export function getStatusBgClass(status: SafetyStatus): string {
  switch (status) {
    case "safe":
      return "bg-emerald-50 border-emerald-200";
    case "warning":
      return "bg-amber-50 border-amber-200";
    case "danger":
      return "bg-red-50 border-red-200";
  }
}

export function getStatusText(status: SafetyStatus): string {
  switch (status) {
    case "safe":
      return "安全通过";
    case "warning":
      return "接近临界";
    case "danger":
      return "存在风险";
  }
}

export function analyzeParamSensitivity(
  params: CalculationParams,
  checkId: string,
  paramRanges: Record<ParamKey, [number, number, number]>
): ParamSensitivity[] {
  const results: ParamSensitivity[] = [];
  const currentResult = calculateSafety(params);
  const currentCheck = currentResult.checks.find((c) => c.id === checkId);
  if (!currentCheck) return results;

  const testParams = { ...params };

  const paramConfigs: { key: ParamKey; step: number; direction: "decrease" | "increase" }[] = [
    { key: "poleSpacingX", step: paramRanges.poleSpacingX[2] * 2, direction: "decrease" },
    { key: "poleSpacingY", step: paramRanges.poleSpacingY[2] * 2, direction: "decrease" },
    { key: "stepDistance", step: paramRanges.stepDistance[2] * 2, direction: "decrease" },
    { key: "slabThickness", step: paramRanges.slabThickness[2] * 2, direction: "increase" },
    { key: "woodSpacing", step: paramRanges.woodSpacing[2] * 2, direction: "decrease" },
    { key: "constructionLoad", step: paramRanges.constructionLoad[2] * 2, direction: "decrease" },
  ];

  for (const config of paramConfigs) {
    if (!currentCheck.affectedParams.includes(config.key)) continue;

    const [min, max] = paramRanges[config.key];
    const delta = config.direction === "decrease" ? -config.step : config.step;
    const newValue = Math.max(min, Math.min(max, params[config.key] + delta));

    if (Math.abs(newValue - params[config.key]) < 0.01) continue;

    testParams[config.key] = newValue;
    const newResult = calculateSafety(testParams);
    const newCheck = newResult.checks.find((c) => c.id === checkId);
    testParams[config.key] = params[config.key];

    if (!newCheck) continue;

    const improvement = newCheck.safetyFactor - currentCheck.safetyFactor;
    if (improvement <= 0) continue;

    const paramLabels: Record<ParamKey, string> = {
      poleSpacingX: "立杆纵距",
      poleSpacingY: "立杆横距",
      stepDistance: "步距",
      slabThickness: "板厚",
      woodSpacing: "木方间距",
      constructionLoad: "施工荷载",
    };

    const paramUnits: Record<ParamKey, string> = {
      poleSpacingX: "mm",
      poleSpacingY: "mm",
      stepDistance: "mm",
      slabThickness: "mm",
      woodSpacing: "mm",
      constructionLoad: "kN/m²",
    };

    results.push({
      param: config.key,
      impactScore: improvement,
      direction: config.direction,
      description: `${config.direction === "decrease" ? "减小" : "增大"}${paramLabels[config.key]}（每次约${config.step}${paramUnits[config.key]}）`,
      estimatedImprovement: Math.round(improvement * 100) / 100,
    });
  }

  return results.sort((a, b) => b.impactScore - a.impactScore);
}

export function getPrioritySuggestions(
  params: CalculationParams,
  paramRanges: Record<ParamKey, [number, number, number]>
): PrioritySuggestion[] {
  const result = calculateSafety(params);

  const failedOrWarning = result.checks
    .filter((c) => !c.passed || c.safetyFactor / c.requiredFactor < 1.1)
    .sort((a, b) => a.safetyFactor / a.requiredFactor - b.safetyFactor / b.requiredFactor);

  const suggestions: PrioritySuggestion[] = [];

  failedOrWarning.forEach((check, index) => {
    const sensitivities = analyzeParamSensitivity(params, check.id, paramRanges);
    if (sensitivities.length === 0) return;

    suggestions.push({
      rank: index + 1,
      checkId: check.id,
      checkName: check.name,
      topAction: sensitivities[0],
      alternativeActions: sensitivities.slice(1, 3),
    });
  });

  return suggestions;
}
