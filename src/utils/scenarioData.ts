import type { Scenario } from "@/types";

export const SCENARIOS: Scenario[] = [
  {
    id: "normal-slab",
    name: "普通楼板",
    description: "标准层普通楼板，厚度适中，适合初学者练习",
    difficulty: "easy",
    icon: "Layers",
    knownConditions: {
      concreteGrade: "C30",
      steelGrade: "HRB400",
      templateThickness: 12,
      woodType: "松木 50×80",
      tubeType: "φ48×3.0",
    },
    defaultParams: {
      poleSpacingX: 1000,
      poleSpacingY: 1000,
      stepDistance: 1800,
      slabThickness: 120,
      woodSpacing: 300,
      constructionLoad: 2.0,
    },
    paramRanges: {
      poleSpacingX: [800, 1500, 50],
      poleSpacingY: [800, 1500, 50],
      stepDistance: [1500, 2000, 100],
      slabThickness: [100, 200, 10],
      woodSpacing: [200, 400, 10],
      constructionLoad: [1.0, 3.0, 0.5],
    },
    correctSolution: "立杆纵距1000mm×横距1000mm，步距1800mm，木方间距300mm",
    diagramType: "slab",
  },
  {
    id: "basement-slab",
    name: "地下室顶板",
    description: "典型地下室顶板模板支撑，厚度大、荷载重",
    difficulty: "medium",
    icon: "Building2",
    knownConditions: {
      concreteGrade: "C35",
      steelGrade: "HRB400",
      templateThickness: 15,
      woodType: "松木 50×100",
      tubeType: "φ48×3.0",
    },
    defaultParams: {
      poleSpacingX: 900,
      poleSpacingY: 900,
      stepDistance: 1500,
      slabThickness: 300,
      woodSpacing: 250,
      constructionLoad: 2.5,
    },
    paramRanges: {
      poleSpacingX: [600, 1200, 50],
      poleSpacingY: [600, 1200, 50],
      stepDistance: [1200, 1800, 100],
      slabThickness: [200, 500, 10],
      woodSpacing: [150, 400, 10],
      constructionLoad: [1.0, 5.0, 0.5],
    },
    correctSolution: "立杆纵距900mm×横距900mm，步距1500mm，木方间距250mm",
    diagramType: "slab",
  },
  {
    id: "high-formwork-beam",
    name: "高支模梁",
    description: "高度超过8m的高支模体系，需重点验算立杆稳定",
    difficulty: "hard",
    icon: "Ruler",
    knownConditions: {
      concreteGrade: "C40",
      steelGrade: "HRB400",
      templateThickness: 18,
      woodType: "松木 100×100",
      tubeType: "φ48×3.5",
    },
    defaultParams: {
      poleSpacingX: 600,
      poleSpacingY: 600,
      stepDistance: 1200,
      slabThickness: 1200,
      woodSpacing: 200,
      constructionLoad: 3.0,
    },
    paramRanges: {
      poleSpacingX: [400, 900, 50],
      poleSpacingY: [400, 900, 50],
      stepDistance: [900, 1500, 100],
      slabThickness: [600, 1500, 50],
      woodSpacing: [150, 300, 10],
      constructionLoad: [2.0, 5.0, 0.5],
    },
    correctSolution: "立杆纵距600mm×横距600mm，步距1200mm，设置剪刀撑",
    diagramType: "beam",
  },
];

export const getScenarioById = (id: string): Scenario | undefined => {
  return SCENARIOS.find((s) => s.id === id);
};
