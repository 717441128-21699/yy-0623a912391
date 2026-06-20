import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CalculationParams,
  CalculationResult,
  AdjustmentRecord,
  ParamKey,
  TeacherFeedback,
  HistoryDetailView,
  StudentInfo,
  PracticeArchive,
  RiskSummaryItem,
  ComparisonResult,
  ClassSummaryResult,
  ClassSummaryGroup,
  ClassRiskStat,
  ClassMasteryStat,
} from "@/types";
import { getScenarioById, SCENARIOS } from "@/utils/scenarioData";
import { calculateSafety } from "@/utils/calculationEngine";
import { PARAM_INFO, KEY_POINTS } from "@/types";

const ARCHIVE_STORAGE_KEY = "template-practice-archives";

function computeRiskSummary(
  adjustmentHistory: AdjustmentRecord[],
  includeInitial: boolean = true
): RiskSummaryItem[] {
  const riskMap = new Map<string, RiskSummaryItem>();

  adjustmentHistory.forEach((record, idx) => {
    if (!includeInitial && record.isInitial) return;
    record.result.checks
      .filter((c) => !c.passed)
      .forEach((check) => {
        if (!riskMap.has(check.id)) {
          riskMap.set(check.id, {
            checkId: check.id,
            checkName: check.name,
            count: 0,
            firstOccurrence: idx,
            lastOccurrence: idx,
            resolved: false,
          });
        }
        const item = riskMap.get(check.id)!;
        item.count++;
        item.lastOccurrence = idx;
      });
  });

  const lastRecord = adjustmentHistory[adjustmentHistory.length - 1];
  const finalChecks = lastRecord?.result.checks || [];

  riskMap.forEach((item) => {
    const finalCheck = finalChecks.find((c) => c.id === item.checkId);
    if (finalCheck?.passed) {
      item.resolved = true;
      const firstRecord = adjustmentHistory[item.firstOccurrence];
      const lastRiskRecord = adjustmentHistory[item.lastOccurrence];
      const afterRecord = adjustmentHistory[item.lastOccurrence + 1] || lastRecord;

      const changes: string[] = [];
      if (firstRecord && afterRecord) {
        const check = firstRecord.result.checks.find((c) => c.id === item.checkId);
        if (check) {
          check.affectedParams.forEach((param) => {
            const diff = afterRecord.params[param] - firstRecord.params[param];
            if (Math.abs(diff) > 0.01) {
              const info = PARAM_INFO[param];
              const direction = diff < 0 ? "减小" : "增大";
              changes.push(`${info.label}${direction}${Math.abs(diff)}${info.unit}`);
            }
          });
        }
      }
      if (changes.length > 0) {
        item.resolution = `通过${changes.join("、")}解决`;
      } else {
        item.resolution = "通过参数调整解决";
      }
    }
  });

  return Array.from(riskMap.values()).sort((a, b) => b.count - a.count);
}

function evaluatePerformance(
  archive: PracticeArchive
): string {
  const finalFactor = archive.finalSafetyFactor;
  const count = archive.actualAdjustmentCount;
  const isPass = archive.finalStatus === "safe";

  if (!isPass) {
    if (count <= 3) {
      return "学习态度认真，但未能掌握参数调整的核心逻辑，建议重点讲解立杆稳定和挠度验算的基本概念。";
    }
    return "有尝试调整但方向不够精准，需要系统学习参数间的相互影响关系。";
  }

  if (finalFactor >= 1.3 && count <= 5) {
    return "优秀！快速找到最优布置方案，对验算逻辑掌握扎实。";
  }
  if (finalFactor >= 1.15 && count <= 8) {
    return "良好！通过合理的参数调整成功通过验算，理解了核心概念。";
  }
  return "合格！经过反复尝试最终通过，掌握了基本调整方法。";
}

function evaluateStudent(archive: PracticeArchive): string {
  return evaluatePerformance(archive);
}

function getStudentShortcomings(archive: PracticeArchive): {
  risks: string[];
  weakPoints: string[];
} {
  const risks = archive.riskSummary
    .filter((r) => !r.resolved || r.count >= 3)
    .map((r) => r.checkName);

  const weakPoints: string[] = [];
  KEY_POINTS.forEach((kp) => {
    const status = archive.teacherFeedback.mastery[kp.id];
    if (status === "needs-work") {
      weakPoints.push(kp.label);
    }
  });

  return {
    risks: risks.length > 0 ? risks : ["无明显风险短板"],
    weakPoints: weakPoints.length > 0 ? weakPoints : ["知识点掌握较好"],
  };
}

function computeClassSummary(archives: PracticeArchive[]): ClassSummaryResult {
  const classSet = new Set<string>();
  const batchSet = new Set<string>();
  const scenarioMap = new Map<string, string>();

  archives.forEach((a) => {
    if (a.studentInfo.className) classSet.add(a.studentInfo.className);
    if (a.studentInfo.batchId) batchSet.add(a.studentInfo.batchId);
    scenarioMap.set(a.scenarioId, a.scenarioName);
  });

  const groupMap = new Map<string, PracticeArchive[]>();

  archives.forEach((a) => {
    const key = [
      a.studentInfo.className || "未分班",
      a.studentInfo.batchId || "未分批",
      a.scenarioId,
    ].join("||");
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(a);
  });

  const groups: ClassSummaryGroup[] = Array.from(groupMap.entries()).map(
    ([key, items]) => {
      const [className, batchId, scenarioId] = key.split("||");
      const scenarioName =
        items[0]?.scenarioName || scenarioMap.get(scenarioId) || scenarioId;

      const passed = items.filter((i) => i.finalStatus === "safe").length;
      const warning = items.filter((i) => i.finalStatus === "warning").length;
      const danger = items.filter((i) => i.finalStatus === "danger").length;

      const avgAdj =
        items.reduce((s, i) => s + i.actualAdjustmentCount, 0) / (items.length || 1);
      const avgFactor =
        items.reduce((s, i) => s + i.finalSafetyFactor, 0) / (items.length || 1);
      const scoredItems = items.filter((i) => i.teacherFeedback.score > 0);
      const avgScore =
        scoredItems.length > 0
          ? scoredItems.reduce((s, i) => s + i.teacherFeedback.score, 0) /
            scoredItems.length
          : 0;

      const riskCountMap = new Map<string, ClassRiskStat>();
      items.forEach((archive) => {
        archive.riskSummary.forEach((r) => {
          if (!riskCountMap.has(r.checkId)) {
            riskCountMap.set(r.checkId, {
              checkId: r.checkId,
              checkName: r.checkName,
              totalOccurrences: 0,
              unresolvedCount: 0,
              studentCount: 0,
            });
          }
          const stat = riskCountMap.get(r.checkId)!;
          stat.totalOccurrences += r.count;
          if (!r.resolved) stat.unresolvedCount++;
          stat.studentCount++;
        });
      });
      const topRisks = Array.from(riskCountMap.values())
        .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
        .slice(0, 5);

      const masteryMap = new Map<string, ClassMasteryStat>();
      KEY_POINTS.forEach((kp) => {
        masteryMap.set(kp.id, {
          keyPointId: kp.id,
          keyPointLabel: kp.label,
          masteredCount: 0,
          partialCount: 0,
          needsWorkCount: 0,
        });
      });
      items.forEach((archive) => {
        KEY_POINTS.forEach((kp) => {
          const status = archive.teacherFeedback.mastery[kp.id];
          const stat = masteryMap.get(kp.id)!;
          if (status === "mastered") stat.masteredCount++;
          else if (status === "partial") stat.partialCount++;
          else if (status === "needs-work") stat.needsWorkCount++;
        });
      });
      const masteryStats = Array.from(masteryMap.values());

      const studentShortcomings = items.map((a) => {
        const sh = getStudentShortcomings(a);
        return {
          studentName: a.studentInfo.name,
          risks: sh.risks.slice(0, 3),
          weakPoints: sh.weakPoints.slice(0, 3),
        };
      });

      return {
        groupKey: key,
        className,
        batchId,
        scenarioId,
        scenarioName,
        totalStudents: items.length,
        passedCount: passed,
        warningCount: warning,
        dangerCount: danger,
        passRate: items.length > 0 ? passed / items.length : 0,
        avgAdjustments: Math.round(avgAdj * 10) / 10,
        avgSafetyFactor: Math.round(avgFactor * 100) / 100,
        avgScore: Math.round(avgScore * 10) / 10,
        topRisks,
        masteryStats,
        studentShortcomings,
      };
    }
  );

  return {
    allClasses: Array.from(classSet),
    allBatches: Array.from(batchSet),
    allScenarios: Array.from(scenarioMap.entries()).map(([id, name]) => ({
      id,
      name,
    })),
    groups: groups.sort((a, b) => {
      if (a.className !== b.className) return a.className.localeCompare(b.className);
      if (a.batchId !== b.batchId) return a.batchId.localeCompare(b.batchId);
      return a.scenarioName.localeCompare(b.scenarioName);
    }),
  };
}

interface PracticeState {
  currentScenarioId: string | null;
  currentParams: CalculationParams | null;
  currentResult: CalculationResult | null;
  adjustmentHistory: AdjustmentRecord[];
  showSummary: boolean;
  teacherFeedback: TeacherFeedback;
  selectedHistoryDetail: HistoryDetailView | null;
  studentInfo: StudentInfo;
  teacherName: string;
  archives: PracticeArchive[];
  comparisonSelection: { a: string | null; b: string | null };
  showArchivePanel: boolean;
  showComparisonPanel: boolean;
  showClassSummaryPanel: boolean;
  activeArchiveTab: "current" | "list";

  setScenario: (id: string) => void;
  updateParam: (key: ParamKey, value: number) => void;
  resetToDefault: () => void;
  clearHistory: () => void;
  setShowSummary: (show: boolean) => void;
  setTeacherFeedback: (feedback: Partial<TeacherFeedback>) => void;
  setSelectedHistoryDetail: (detail: HistoryDetailView | null) => void;
  getActualAdjustmentCount: () => number;
  setStudentInfo: (info: Partial<StudentInfo>) => void;
  setTeacherName: (name: string) => void;
  saveCurrentAsArchive: () => PracticeArchive | null;
  deleteArchive: (id: string) => void;
  loadArchive: (id: string) => void;
  setComparisonSelection: (which: "a" | "b", id: string | null) => void;
  getComparisonResult: () => ComparisonResult | null;
  setShowArchivePanel: (show: boolean) => void;
  setShowComparisonPanel: (show: boolean) => void;
  setShowClassSummaryPanel: (show: boolean) => void;
  setActiveArchiveTab: (tab: "current" | "list") => void;
  getRiskSummary: () => RiskSummaryItem[];
  getClassSummary: () => ClassSummaryResult;
  getStudentShortcomings: (archive: PracticeArchive) => { risks: string[]; weakPoints: string[] };
  clearArchives: () => void;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
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
      studentInfo: {
        name: "",
        className: "",
        batchId: "",
      },
      teacherName: "",
      archives: [],
      comparisonSelection: { a: null, b: null },
      showArchivePanel: false,
      showComparisonPanel: false,
      showClassSummaryPanel: false,
      activeArchiveTab: "current",

      getActualAdjustmentCount: () => {
        return get().adjustmentHistory.filter((r) => !r.isInitial).length;
      },

      getRiskSummary: () => {
        return computeRiskSummary(get().adjustmentHistory, true);
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

      setSelectedHistoryDetail: (detail: HistoryDetailView | null) => {
        set({ selectedHistoryDetail: detail });
      },

      setStudentInfo: (info: Partial<StudentInfo>) => {
        set((state) => ({
          studentInfo: { ...state.studentInfo, ...info },
        }));
      },

      setTeacherName: (name: string) => {
        set({ teacherName: name });
      },

      saveCurrentAsArchive: () => {
        const state = get();
        if (!state.currentScenarioId || !state.currentParams) return null;
        if (!state.studentInfo.name.trim()) return null;

        const scenario = getScenarioById(state.currentScenarioId);
        if (!scenario) return null;

        const firstRecord = state.adjustmentHistory[0];
        const lastRecord = state.adjustmentHistory[state.adjustmentHistory.length - 1];
        const duration = firstRecord && lastRecord
          ? lastRecord.timestamp - firstRecord.timestamp
          : 0;

        const archive: PracticeArchive = {
          id: `archive-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          studentInfo: { ...state.studentInfo },
          teacherName: state.teacherName,
          scenarioId: state.currentScenarioId,
          scenarioName: scenario.name,
          currentParams: { ...state.currentParams },
          adjustmentHistory: JSON.parse(JSON.stringify(state.adjustmentHistory)),
          teacherFeedback: { ...state.teacherFeedback },
          riskSummary: computeRiskSummary(state.adjustmentHistory, true),
          archivedAt: Date.now(),
          finalStatus: lastRecord?.result.status || "danger",
          finalSafetyFactor: lastRecord?.result.overallSafetyFactor || 0,
          actualAdjustmentCount: state.getActualAdjustmentCount(),
          practiceDuration: duration,
        };

        set((s) => ({
          archives: [archive, ...s.archives],
        }));

        return archive;
      },

      deleteArchive: (id: string) => {
        set((state) => ({
          archives: state.archives.filter((a) => a.id !== id),
          comparisonSelection: {
            a: state.comparisonSelection.a === id ? null : state.comparisonSelection.a,
            b: state.comparisonSelection.b === id ? null : state.comparisonSelection.b,
          },
        }));
      },

      loadArchive: (id: string) => {
        const archive = get().archives.find((a) => a.id === id);
        if (!archive) return;

        set({
          currentScenarioId: archive.scenarioId,
          currentParams: { ...archive.currentParams },
          currentResult:
            archive.adjustmentHistory[archive.adjustmentHistory.length - 1]?.result || null,
          adjustmentHistory: JSON.parse(JSON.stringify(archive.adjustmentHistory)),
          teacherFeedback: { ...archive.teacherFeedback },
          studentInfo: { ...archive.studentInfo },
          teacherName: archive.teacherName,
          selectedHistoryDetail: null,
          showArchivePanel: false,
          activeArchiveTab: "current",
        });
      },

      setComparisonSelection: (which: "a" | "b", id: string | null) => {
        set((state) => ({
          comparisonSelection: {
            ...state.comparisonSelection,
            [which]: id,
          },
        }));
      },

      getComparisonResult: (): ComparisonResult | null => {
        const { archives, comparisonSelection } = get();
        const a = archives.find((x) => x.id === comparisonSelection.a);
        const b = archives.find((x) => x.id === comparisonSelection.b);
        if (!a || !b) return null;

        let faster: "A" | "B" | "tie" = "tie";
        if (a.finalStatus === "safe" && b.finalStatus !== "safe") faster = "A";
        else if (b.finalStatus === "safe" && a.finalStatus !== "safe") faster = "B";
        else if (a.finalStatus === "safe" && b.finalStatus === "safe") {
          if (a.actualAdjustmentCount < b.actualAdjustmentCount) faster = "A";
          else if (b.actualAdjustmentCount < a.actualAdjustmentCount) faster = "B";
          else if (a.finalSafetyFactor > b.finalSafetyFactor) faster = "A";
          else if (b.finalSafetyFactor > a.finalSafetyFactor) faster = "B";
        }

        return {
          archiveA: a,
          archiveB: b,
          fasterStudent: faster,
          stuckRisksA: a.riskSummary.filter((r) => r.count >= 3 || !r.resolved),
          stuckRisksB: b.riskSummary.filter((r) => r.count >= 3 || !r.resolved),
          evaluationA: evaluateStudent(a),
          evaluationB: evaluateStudent(b),
        };
      },

      setShowArchivePanel: (show: boolean) => {
        set({ showArchivePanel: show });
      },

      setShowComparisonPanel: (show: boolean) => {
        set({ showComparisonPanel: show });
      },

      setActiveArchiveTab: (tab: "current" | "list") => {
        set({ activeArchiveTab: tab });
      },

      setShowClassSummaryPanel: (show: boolean) => {
        set({ showClassSummaryPanel: show });
      },

      getClassSummary: () => {
        return computeClassSummary(get().archives);
      },

      getStudentShortcomings: (archive: PracticeArchive) => {
        return getStudentShortcomings(archive);
      },

      clearArchives: () => {
        set({ archives: [], comparisonSelection: { a: null, b: null } });
      },
    }),
    {
      name: ARCHIVE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        archives: state.archives,
        studentInfo: state.studentInfo,
        teacherName: state.teacherName,
      }),
    }
  )
);
