import { create } from "zustand";
import type {
  CalculationParams,
  CalculationResult,
  AdjustmentRecord,
  ParamKey,
  TeacherFeedback,
  HistoryDetailView,
} from "@/types";
import { getScenarioById, SCENARIOS } from "@/utils/scenarioData";
import { calculateSafety } from "@/utils/calculationEngine";

interface PracticeState {
  currentScenarioId: string | null;
  currentParams: CalculationParams | null;
  currentResult: CalculationResult | null;
  adjustmentHistory: AdjustmentRecord[];
  showSummary: boolean;
  teacherFeedback: TeacherFeedback;
  selectedHistoryDetail: HistoryDetailView | null;

  setScenario: (id: string) => void;
  updateParam: (key: ParamKey, value: number) => void;
  resetToDefault: () => void;
  clearHistory: () => void;
  setShowSummary: (show: boolean) => void;
  setTeacherFeedback: (feedback: Partial<TeacherFeedback>) => void;
  setSelectedHistoryDetail: (detail: HistoryDetailView | null) => void;
  getActualAdjustmentCount: () => number;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  currentScenarioId: SCENARIOS[0].id,
  currentParams: SCENARIOS[0].defaultParams,
  currentResult: calculateSafety(SCENARIOS[0].defaultParams),
  adjustmentHistory: [
    {
      params: SCENARIOS[0].defaultParams,
      result: calculateSafety(SCENARIOS[0].defaultParams),
      timestamp: Date.now(),
      isInitial: true,
    },
  ],
  showSummary: false,
  teacherFeedback: {
    score: 0,
    comment: "",
    mastery: {},
  },
  selectedHistoryDetail: null,

  getActualAdjustmentCount: () => {
    return get().adjustmentHistory.filter((r) => !r.isInitial).length;
  },

  setScenario: (id: string) => {
    const scenario = getScenarioById(id);
    if (!scenario) return;

    const result = calculateSafety(scenario.defaultParams);

    set({
      currentScenarioId: id,
      currentParams: scenario.defaultParams,
      currentResult: result,
      adjustmentHistory: [
        {
          params: scenario.defaultParams,
          result,
          timestamp: Date.now(),
          isInitial: true,
        },
      ],
      teacherFeedback: {
        score: 0,
        comment: "",
        mastery: {},
      },
      selectedHistoryDetail: null,
    });
  },

  updateParam: (key: ParamKey, value: number) => {
    const { currentParams, currentScenarioId } = get();
    if (!currentParams || !currentScenarioId) return;

    const scenario = getScenarioById(currentScenarioId);
    if (!scenario) return;

    const [min, max] = scenario.paramRanges[key];
    const clampedValue = Math.max(min, Math.min(max, value));

    const newParams = { ...currentParams, [key]: clampedValue };
    const result = calculateSafety(newParams);

    const lastRecord = get().adjustmentHistory[get().adjustmentHistory.length - 1];
    const isNewRecord =
      !lastRecord ||
      Object.keys(newParams).some(
        (k) => newParams[k as ParamKey] !== lastRecord.params[k as ParamKey]
      );

    if (isNewRecord) {
      set((state) => ({
        currentParams: newParams,
        currentResult: result,
        adjustmentHistory: [
          ...state.adjustmentHistory,
          {
            params: newParams,
            result,
            timestamp: Date.now(),
            changedParam: key,
          },
        ],
      }));
    } else {
      set({
        currentParams: newParams,
        currentResult: result,
      });
    }
  },

  resetToDefault: () => {
    const { currentScenarioId } = get();
    if (!currentScenarioId) return;

    const scenario = getScenarioById(currentScenarioId);
    if (!scenario) return;

    const result = calculateSafety(scenario.defaultParams);

    set({
      currentParams: scenario.defaultParams,
      currentResult: result,
      adjustmentHistory: [
        {
          params: scenario.defaultParams,
          result,
          timestamp: Date.now(),
          isInitial: true,
        },
      ],
      teacherFeedback: {
        score: 0,
        comment: "",
        mastery: {},
      },
      selectedHistoryDetail: null,
    });
  },

  clearHistory: () => {
    set({ adjustmentHistory: [] });
  },

  setShowSummary: (show: boolean) => {
    set({ showSummary: show });
  },

  setTeacherFeedback: (feedback: Partial<TeacherFeedback>) => {
    set((state) => ({
      teacherFeedback: {
        ...state.teacherFeedback,
        ...feedback,
        reviewedAt: Date.now(),
      },
    }));
  },

  setSelectedHistoryDetail: (detail: HistoryDetailView) => {
    set({ selectedHistoryDetail: detail });
  },
}));
