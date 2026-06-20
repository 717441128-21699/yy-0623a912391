export interface CalculationParams {
  poleSpacingX: number;
  poleSpacingY: number;
  stepDistance: number;
  slabThickness: number;
  woodSpacing: number;
  constructionLoad: number;
}

export type ParamKey = keyof CalculationParams;

export interface ParamRanges {
  poleSpacingX: [number, number, number];
  poleSpacingY: [number, number, number];
  stepDistance: [number, number, number];
  slabThickness: [number, number, number];
  woodSpacing: [number, number, number];
  constructionLoad: [number, number, number];
}

export interface KnownConditions {
  concreteGrade: string;
  steelGrade: string;
  templateThickness: number;
  woodType: string;
  tubeType: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  icon: string;
  knownConditions: KnownConditions;
  defaultParams: CalculationParams;
  paramRanges: ParamRanges;
  correctSolution: string;
  diagramType: "slab" | "beam";
}

export interface CheckItem {
  id: string;
  name: string;
  description: string;
  safetyFactor: number;
  requiredFactor: number;
  passed: boolean;
  plainExplanation: string;
  affectedParams: ParamKey[];
  icon: string;
}

export type SafetyStatus = "safe" | "warning" | "danger";

export interface CalculationResult {
  overallSafetyFactor: number;
  status: SafetyStatus;
  checks: CheckItem[];
  timestamp: number;
}

export interface AdjustmentRecord {
  params: CalculationParams;
  result: CalculationResult;
  timestamp: number;
  changedParam?: ParamKey;
}

export interface ParamInfo {
  key: ParamKey;
  label: string;
  unit: string;
  description: string;
}

export const PARAM_INFO: Record<ParamKey, ParamInfo> = {
  poleSpacingX: {
    key: "poleSpacingX",
    label: "立杆纵距",
    unit: "mm",
    description: "沿混凝土浇筑方向的立杆间距",
  },
  poleSpacingY: {
    key: "poleSpacingY",
    label: "立杆横距",
    unit: "mm",
    description: "垂直于混凝土浇筑方向的立杆间距",
  },
  stepDistance: {
    key: "stepDistance",
    label: "步距",
    unit: "mm",
    description: "相邻水平杆之间的垂直距离",
  },
  slabThickness: {
    key: "slabThickness",
    label: "板厚",
    unit: "mm",
    description: "混凝土楼板的设计厚度",
  },
  woodSpacing: {
    key: "woodSpacing",
    label: "木方间距",
    unit: "mm",
    description: "模板下方支撑木方的间距",
  },
  constructionLoad: {
    key: "constructionLoad",
    label: "施工荷载",
    unit: "kN/m²",
    description: "施工人员、设备和堆料产生的附加荷载",
  },
};
