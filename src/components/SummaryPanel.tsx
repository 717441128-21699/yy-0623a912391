import { useMemo, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Target,
  Lightbulb,
  TrendingUp,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Check,
  AlertTriangle,
  Minus,
  FileText,
  GraduationCap,
  Calendar,
  Star,
  UserCheck,
  BookOpenCheck,
  Eye,
  PlayCircle,
  BarChart3,
  MessageSquare,
  Award,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  History,
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";
import { getStatusColor, getStatusText, getPrioritySuggestions } from "@/utils/calculationEngine";
import { PARAM_INFO, KEY_POINTS } from "@/types";
import type {
  AdjustmentRecord,
  ParamKey,
  CalculationParams,
  TeacherFeedback,
  RiskSummaryItem,
  KeyPoint,
} from "@/types";

const PAGE_SIZE = 8;

interface SummaryPanelProps {
  onClose: () => void;
}

type FilterType = "all" | "danger" | "warning" | "safe" | "milestone";

export function SummaryPanel({ onClose }: SummaryPanelProps) {
  const {
    adjustmentHistory,
    currentScenarioId,
    currentParams,
    teacherFeedback,
    setTeacherFeedback,
    selectedHistoryDetail,
    setSelectedHistoryDetail,
    getActualAdjustmentCount,
  } = usePracticeStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [expandedHistory, setExpandedHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "replay">("overview");

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

  const actualCount = getActualAdjustmentCount();
  const firstRecord = adjustmentHistory[0];
  const lastRecord = adjustmentHistory[adjustmentHistory.length - 1];

  const improvement = useMemo(() => {
    if (!firstRecord || !lastRecord) return 0;
    return (
      ((lastRecord.result.overallSafetyFactor - firstRecord.result.overallSafetyFactor) /
        Math.max(0.01, firstRecord.result.overallSafetyFactor)) *
      100
    );
  }, [firstRecord, lastRecord]);

  const riskSummary = useMemo((): RiskSummaryItem[] => {
    const riskMap = new Map<string, RiskSummaryItem>();

    adjustmentHistory.forEach((record, idx) => {
      if (record.isInitial) return;
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

    const finalChecks = lastRecord?.result.checks || [];
    riskMap.forEach((item) => {
      const finalCheck = finalChecks.find((c) => c.id === item.checkId);
      if (finalCheck?.passed) {
        item.resolved = true;
        const resolution = getResolution(item.checkId, item.firstOccurrence, item.lastOccurrence);
        if (resolution) item.resolution = resolution;
      }
    });

    return Array.from(riskMap.values()).sort((a, b) => b.count - a.count);
  }, [adjustmentHistory, lastRecord]);

  const getResolution = (
    checkId: string,
    firstIdx: number,
    lastIdx: number
  ): string | undefined => {
    const firstRecord = adjustmentHistory[firstIdx];
    const lastRecord = adjustmentHistory[lastIdx + 1];
    if (!firstRecord || !lastRecord) return undefined;

    const changes: string[] = [];
    const check = firstRecord.result.checks.find((c) => c.id === checkId);
    if (!check) return undefined;

    check.affectedParams.forEach((param) => {
      const diff = lastRecord.params[param] - firstRecord.params[param];
      if (Math.abs(diff) > 0.01) {
        const info = PARAM_INFO[param];
        const direction = diff < 0 ? "减小" : "增大";
        changes.push(`${info.label}${direction}${Math.abs(diff)}${info.unit}`);
      }
    });

    return changes.length > 0 ? `通过${changes.join("、")}解决` : "通过参数调整解决";
  };

  const filteredHistory = useMemo(() => {
    const milestones = new Set<number>();
    let bestFactor = -Infinity;
    adjustmentHistory.forEach((record, idx) => {
      if (record.result.overallSafetyFactor > bestFactor) {
        bestFactor = record.result.overallSafetyFactor;
        milestones.add(idx);
      }
      if (
        idx > 0 &&
        record.result.status !== adjustmentHistory[idx - 1]?.result.status
      ) {
        milestones.add(idx);
      }
      if (record.changedParam) {
        milestones.add(idx);
      }
    });

    return adjustmentHistory.filter((record, idx) => {
      if (filterType === "all") return true;
      if (filterType === "milestone") return milestones.has(idx);
      return record.result.status === filterType;
    });
  }, [adjustmentHistory, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredHistory.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );
  const allRecordsForPrint = filteredHistory;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getParamChangeDescription = (
    record: AdjustmentRecord,
    allRecords: AdjustmentRecord[]
  ): string => {
    if (record.isInitial) return "初始参数设置";
    if (!record.changedParam) return "参数重置";
    const info = PARAM_INFO[record.changedParam];
    const idx = allRecords.indexOf(record);
    const prevRecord = allRecords[idx - 1];
    if (!prevRecord)
      return `${info.label} 设置为 ${record.params[record.changedParam]}${info.unit}`;
    const oldValue = prevRecord.params[record.changedParam];
    const newValue = record.params[record.changedParam];
    const direction = newValue > oldValue ? "增大" : "减小";
    const delta = Math.abs(newValue - oldValue);
    return `${info.label} ${direction} ${delta}${info.unit} 至 ${newValue}${info.unit}`;
  };

  const compareParams = (source: CalculationParams, target: CalculationParams) => {
    const keys: ParamKey[] = [
      "poleSpacingX",
      "poleSpacingY",
      "stepDistance",
      "slabThickness",
      "woodSpacing",
      "constructionLoad",
    ];
    return keys.map((key) => {
      const diff = source[key] - target[key];
      let status: "match" | "better" | "worse" | "neutral";
      if (Math.abs(diff) < 0.01) {
        status = "match";
      } else {
        const improvesSafety =
          (key === "slabThickness" && diff > 0) ||
          (key !== "slabThickness" &&
            key !== "constructionLoad" &&
            diff < 0) ||
          (key === "constructionLoad" && diff < 0);
        status = improvesSafety ? "better" : "worse";
      }
      return { key, diff, status };
    });
  };

  const initialParams = firstRecord?.params;
  const recommendedParams = scenario?.defaultParams;

  const prioritySuggestions = useMemo(() => {
    if (
      !scenario ||
      !currentParams ||
      lastRecord?.result.status === "safe"
    )
      return [];
    return getPrioritySuggestions(currentParams, scenario.paramRanges);
  }, [scenario, currentParams, lastRecord]);

  const handlePrint = () => {
    window.print();
  };

  const handleStarClick = (score: number) => {
    setTeacherFeedback({ score });
  };

  const handleMasteryChange = (
    keyPointId: string,
    value: "mastered" | "partial" | "needs-work"
  ) => {
    setTeacherFeedback({
      mastery: {
        ...teacherFeedback.mastery,
        [keyPointId]: value,
      },
    });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTeacherFeedback({ comment: e.target.value });
  };

  const handleViewHistoryDetail = (record: AdjustmentRecord, index: number) => {
    setSelectedHistoryDetail({ record, index });
  };

  const closeHistoryDetail = () => {
    setSelectedHistoryDetail(null);
  };

  const getMasteryIcon = (status?: string) => {
    switch (status) {
      case "mastered":
        return <ThumbsUp size={14} className="text-emerald-500" />;
      case "partial":
        return <MinusCircle size={14} className="text-amber-500" />;
      case "needs-work":
        return <ThumbsDown size={14} className="text-red-500" />;
      default:
        return <MinusCircle size={14} className="text-gray-300" />;
    }
  };

  const getMasteryLabel = (status?: string) => {
    switch (status) {
      case "mastered":
        return "已掌握";
      case "partial":
        return "基本掌握";
      case "needs-work":
        return "需加强";
      default:
        return "未评";
    }
  };

  const getMasteryColor = (status?: string) => {
    switch (status) {
      case "mastered":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "partial":
        return "bg-amber-50 border-amber-200 text-amber-700";
      case "needs-work":
        return "bg-red-50 border-red-200 text-red-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-500";
    }
  };

  if (!scenario) return null;

  const isSuccess = lastRecord?.result.status === "safe";
  const bestRecord = adjustmentHistory.reduce(
    (best, r) =>
      r.result.overallSafetyFactor > best.result.overallSafetyFactor ? r : best,
    adjustmentHistory[0]
  );

  const filterOptions: { value: FilterType; label: string; count: number }[] = [
    { value: "all", label: "全部", count: adjustmentHistory.length },
    {
      value: "milestone",
      label: "关键节点",
      count:
        adjustmentHistory.filter((_, idx) => {
          const milestones = new Set<number>();
          let bestFactor = -Infinity;
          adjustmentHistory.forEach((r, i) => {
            if (r.result.overallSafetyFactor > bestFactor) {
              bestFactor = r.result.overallSafetyFactor;
              milestones.add(i);
            }
            if (
              i > 0 &&
              r.result.status !== adjustmentHistory[i - 1]?.result.status
            ) {
              milestones.add(i);
            }
            if (r.changedParam) milestones.add(i);
          });
          return milestones.has(idx);
        }).length,
    },
    {
      value: "danger",
      label: "危险",
      count: adjustmentHistory.filter((r) => r.result.status === "danger").length,
    },
    {
      value: "warning",
      label: "临界",
      count: adjustmentHistory.filter((r) => r.result.status === "warning").length,
    },
    {
      value: "safe",
      label: "安全",
      count: adjustmentHistory.filter((r) => r.result.status === "safe").length,
    },
  ];

  const getStatusIcon = (status: "match" | "better" | "worse" | "neutral") => {
    switch (status) {
      case "match":
        return <Check size={14} className="text-emerald-500" />;
      case "better":
        return <TrendingUp size={14} className="text-emerald-500" />;
      case "worse":
        return <AlertTriangle size={14} className="text-red-500" />;
      default:
        return <Minus size={14} className="text-gray-400" />;
    }
  };

  const safetyFactorChart = useMemo(() => {
    return adjustmentHistory.map((r, i) => ({
      index: i,
      factor: r.result.overallSafetyFactor,
      status: r.result.status,
      isInitial: r.isInitial,
    }));
  }, [adjustmentHistory]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in no-print-container">
      <style>{`
        @media print {
          .no-print-container { position: static !important; background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-full {
            position: static !important;
            max-height: none !important;
            height: auto !important;
            max-width: none !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print-all-history {
            display: block !important;
          }
        }
        .print-only { display: none; }
        .print-all-history { display: none; }
      `}</style>

      <div className="print-only print-header" style={{ display: "none" }}>
        <div
          style={{
            borderBottom: "3px solid #1E40AF",
            paddingBottom: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "32px" }}>🏗️</div>
            <div>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1E40AF",
                  margin: 0,
                }}
              >
                模板支撑安全练习报告
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: "4px 0 0 0",
                }}
              >
                {scenario.name} | 练习完成报告
              </p>
            </div>
          </div>
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#6b7280",
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <span>📅 {lastRecord ? formatDateTime(lastRecord.timestamp) : "-"}</span>
            <span>
              ⏱️ 练习时长:{" "}
              {firstRecord && lastRecord
                ? Math.round((lastRecord.timestamp - firstRecord.timestamp) / 1000)
                : 0}
              秒
            </span>
            <span>📊 调整次数: {actualCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-scale-in print-full">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <ClipboardList className="text-primary-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">练习小结</h2>
              <p className="text-sm text-gray-500">{scenario.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 no-print">
          {[
            {
              id: "overview",
              label: "总览与点评",
              icon: BarChart3,
            },
            {
              id: "timeline",
              label: "调整时间线",
              icon: History,
            },
            {
              id: "replay",
              label: "风险回放",
              icon: PlayCircle,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-primary-600 border-primary-600 bg-primary-50/50"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "overview" && (
            <div className="p-6 space-y-6">
              <div className="print-only">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                    marginBottom: "24px",
                  }}
                >
                  {[
                    {
                      label: "调整次数",
                      value: actualCount,
                      color: "#1E40AF",
                    },
                    {
                      label: "最终安全系数",
                      value: lastRecord?.result.overallSafetyFactor.toFixed(2) || "0.00",
                      color: isSuccess ? "#059669" : "#DC2626",
                    },
                    {
                      label: "系数提升",
                      value: `${improvement >= 0 ? "+" : ""}${improvement.toFixed(0)}%`,
                      color: improvement >= 0 ? "#059669" : "#DC2626",
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#f9fafb",
                        padding: "16px",
                        borderRadius: "8px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: "bold",
                          color: s.color,
                          fontFamily: "monospace",
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 no-print">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-primary-600 font-mono">
                    {actualCount}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">调整次数</div>
                </div>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    backgroundColor: isSuccess ? "#ecfdf5" : "#fef2f2",
                  }}
                >
                  <div
                    className="text-3xl font-bold font-mono"
                    style={{ color: isSuccess ? "#059669" : "#DC2626" }}
                  >
                    {lastRecord?.result.overallSafetyFactor.toFixed(2) || "0.00"}
                  </div>
                  <div
                    className="text-sm mt-1"
                    style={{ color: isSuccess ? "#059669" : "#DC2626" }}
                  >
                    最终安全系数
                  </div>
                </div>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    backgroundColor: improvement >= 0 ? "#f0fdf4" : "#fef2f2",
                  }}
                >
                  <div
                    className="text-3xl font-bold font-mono flex items-center justify-center gap-1"
                    style={{ color: improvement >= 0 ? "#16a34a" : "#dc2626" }}
                  >
                    <TrendingUp size={24} />
                    {improvement >= 0 ? "+" : ""}
                    {improvement.toFixed(0)}%
                  </div>
                  <div
                    className="text-sm mt-1"
                    style={{ color: improvement >= 0 ? "#16a34a" : "#dc2626" }}
                  >
                    系数提升
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  isSuccess
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isSuccess ? (
                    <CheckCircle2
                      className="text-emerald-600 flex-shrink-0"
                      size={24}
                    />
                  ) : (
                    <Target className="text-amber-600 flex-shrink-0" size={24} />
                  )}
                  <div>
                    <div className="font-semibold text-gray-800">
                      {isSuccess ? "🎉 练习完成！" : "💪 继续努力"}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {isSuccess
                        ? "恭喜你通过调整参数，成功完成了该场景的模板支撑验算。"
                        : "虽然还未完全通过，但每次调整都是学习的过程。继续优化参数，你一定能找到正确的布置方案。"}
                    </p>
                    {bestRecord && bestRecord !== lastRecord && (
                      <p className="text-xs text-amber-600 mt-2">
                        💡 你的最佳成绩出现在某次中间调整，安全系数达到{" "}
                        {bestRecord.result.overallSafetyFactor.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {riskSummary.length > 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-gray-800">
                      练习过程风险总结
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {riskSummary.slice(0, 4).map((risk) => (
                      <div
                        key={risk.checkId}
                        className="p-3 bg-white rounded-lg border border-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {risk.resolved ? (
                              <CheckCircle2
                                size={16}
                                className="text-emerald-500 flex-shrink-0"
                              />
                            ) : (
                              <AlertTriangle
                                size={16}
                                className="text-red-500 flex-shrink-0"
                              />
                            )}
                            <span className="font-medium text-gray-800 text-sm">
                              {risk.checkName}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              risk.resolved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {risk.resolved ? "已解决" : "未解决"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 pl-7">
                          <span>出现 {risk.count} 次</span>
                          {risk.resolution && (
                            <span className="text-emerald-600 ml-3">
                              ✅ {risk.resolution}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {initialParams && currentParams && recommendedParams && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <GitCompare size={18} className="text-primary-600" />
                      <h3 className="font-semibold text-gray-800">
                        参数对比分析
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      对比初始参数、当前参数与推荐布置，直观查看改进方向
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-3 font-medium text-gray-600">
                            参数名称
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-600 text-center">
                            初始值
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-600 text-center">
                            当前值
                          </th>
                          <th className="px-4 py-3 font-medium text-emerald-700 text-center bg-emerald-50">
                            ✅ 推荐值
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-600 text-center">
                            改进方向
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.keys(PARAM_INFO) as ParamKey[]).map((key) => {
                          const info = PARAM_INFO[key];
                          const comparison = compareParams(
                            currentParams,
                            recommendedParams
                          );
                          const item = comparison.find((c) => c.key === key)!;
                          const isImproved =
                            initialParams &&
                            ((key === "slabThickness" &&
                              currentParams[key] >= initialParams[key]) ||
                              (key !== "slabThickness" &&
                                key !== "constructionLoad" &&
                                currentParams[key] <= initialParams[key]) ||
                              (key === "constructionLoad" &&
                                currentParams[key] <= initialParams[key]));

                          return (
                            <tr key={key} className="border-t border-gray-100">
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {info.label}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-gray-500">
                                {initialParams[key]}
                                <span className="text-xs text-gray-400">
                                  {" "}
                                  {info.unit}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-semibold">
                                <span
                                  className={
                                    item.status === "match"
                                      ? "text-emerald-600"
                                      : item.status === "better"
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }
                                >
                                  {currentParams[key]}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {" "}
                                  {info.unit}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-emerald-700 bg-emerald-50 font-semibold">
                                {recommendedParams[key]}
                                <span className="text-xs text-emerald-500">
                                  {" "}
                                  {info.unit}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {getStatusIcon(item.status)}
                                  <span
                                    className={`text-xs font-medium ${
                                      item.status === "match"
                                        ? "text-emerald-600"
                                        : item.status === "better"
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {item.status === "match"
                                      ? "符合"
                                      : item.status === "better"
                                      ? "优于"
                                      : "需调整"}
                                  </span>
                                  {isImproved && item.status !== "match" && (
                                    <span className="text-xs text-emerald-500 ml-1">
                                      ↑
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex flex-wrap gap-4">
                      <span className="flex items-center gap-1">
                        <Check size={12} className="text-emerald-500" /> 符合推荐值
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-500" />{" "}
                        优于推荐值（安全储备更高）
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={12} className="text-red-500" /> 需要向推荐值调整
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800 text-lg">
                      课堂点评
                    </div>
                    <p className="text-xs text-blue-600 mt-0.5">
                      教师对本次练习的评价和知识点掌握情况
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <Award size={18} className="text-amber-500" />
                      <span className="text-sm font-medium text-gray-700">
                        综合评分
                      </span>
                      <div className="flex gap-1 ml-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleStarClick(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={24}
                              className={`${
                                star <= teacherFeedback.score
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {teacherFeedback.score > 0 && (
                        <span className="text-sm font-medium text-amber-600 ml-2">
                          {teacherFeedback.score} 分
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpenCheck size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        知识点掌握情况
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {KEY_POINTS.map((kp: KeyPoint) => (
                        <div
                          key={kp.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getMasteryIcon(teacherFeedback.mastery[kp.id])}
                            <span className="text-sm text-gray-700">
                              {kp.label}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {(
                              [
                                { value: "mastered", icon: ThumbsUp },
                                { value: "partial", icon: MinusCircle },
                                { value: "needs-work", icon: ThumbsDown },
                              ] as const
                            ).map(({ value, icon: Icon }) => (
                              <button
                                key={value}
                                onClick={() => handleMasteryChange(kp.id, value)}
                                className={`p-1 rounded transition-colors ${
                                  teacherFeedback.mastery[kp.id] === value
                                    ? value === "mastered"
                                      ? "bg-emerald-100"
                                      : value === "partial"
                                      ? "bg-amber-100"
                                      : "bg-red-100"
                                    : "hover:bg-gray-200"
                                }`}
                              >
                                <Icon
                                  size={14}
                                  className={
                                    teacherFeedback.mastery[kp.id] === value
                                      ? value === "mastered"
                                        ? "text-emerald-600"
                                        : value === "partial"
                                        ? "text-amber-600"
                                        : "text-red-600"
                                      : "text-gray-400"
                                  }
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        教师评语
                      </span>
                    </div>
                    <textarea
                      value={teacherFeedback.comment}
                      onChange={handleCommentChange}
                      placeholder="请输入对学生本次练习的评价、建议和改进方向..."
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  {teacherFeedback.reviewedAt && (
                    <div className="text-xs text-gray-500 text-right">
                      最后点评时间: {formatDateTime(teacherFeedback.reviewedAt)}
                    </div>
                  )}
                </div>
              </div>

              <div className="print-only">
                <div
                  style={{
                    padding: "16px",
                    background: "#eff6ff",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>📝</span>
                    <span style={{ fontWeight: "bold", color: "#1e40af" }}>
                      课堂点评
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                    <strong>评分：</strong>
                    {teacherFeedback.score > 0
                      ? `${"★".repeat(teacherFeedback.score)}${"☆".repeat(
                          5 - teacherFeedback.score
                        )} (${teacherFeedback.score}分)`
                      : "未评分"}
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                    <strong>知识点掌握：</strong>
                    {KEY_POINTS.map((kp) => (
                      <span
                        key={kp.id}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          marginRight: "8px",
                          marginTop: "4px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          background:
                            teacherFeedback.mastery[kp.id] === "mastered"
                              ? "#d1fae5"
                              : teacherFeedback.mastery[kp.id] === "partial"
                              ? "#fef3c7"
                              : teacherFeedback.mastery[kp.id] === "needs-work"
                              ? "#fee2e2"
                              : "#f3f4f6",
                          color:
                            teacherFeedback.mastery[kp.id] === "mastered"
                              ? "#065f46"
                              : teacherFeedback.mastery[kp.id] === "partial"
                              ? "#92400e"
                              : teacherFeedback.mastery[kp.id] === "needs-work"
                              ? "#991b1b"
                              : "#6b7280",
                        }}
                      >
                        {kp.label}：{getMasteryLabel(teacherFeedback.mastery[kp.id])}
                      </span>
                    ))}
                  </div>
                  {teacherFeedback.comment && (
                    <div style={{ fontSize: "14px" }}>
                      <strong>评语：</strong>
                      {teacherFeedback.comment}
                    </div>
                  )}
                </div>
              </div>

              <div className="print-only">
                {riskSummary.length > 0 && (
                  <div
                    style={{
                      padding: "16px",
                      background: "#fefce8",
                      borderRadius: "8px",
                      border: "1px solid #fde047",
                      marginBottom: "24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>⚠️</span>
                      <span style={{ fontWeight: "bold", color: "#854d0e" }}>
                        练习过程风险总结
                      </span>
                    </div>
                    {riskSummary.map((risk) => (
                      <div
                        key={risk.checkId}
                        style={{
                          padding: "8px 12px",
                          background: "white",
                          borderRadius: "6px",
                          marginBottom: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>
                            {risk.resolved ? "✅" : "⚠️"} {risk.checkName}
                          </span>
                          <span
                            style={{
                              color: risk.resolved ? "#059669" : "#dc2626",
                              fontSize: "12px",
                            }}
                          >
                            {risk.resolved ? "已解决" : "未解决"} | 出现 {risk.count} 次
                          </span>
                        </div>
                        {risk.resolution && (
                          <div style={{ color: "#059669", fontSize: "12px", marginTop: "4px" }}>
                            解决方式: {risk.resolution}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-5 border border-primary-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-600 text-white rounded-lg">
                    <GraduationCap size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-primary-800 mb-2 text-lg">
                      教学要点与布置思路
                    </div>
                    <div className="text-sm text-primary-700 space-y-3">
                      <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                        <div className="font-medium text-primary-800 mb-1">
                          📐 推荐布置方案
                        </div>
                        <p>{scenario.correctSolution}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                          <div className="font-medium text-primary-800 mb-1">
                            🏗️ 立杆间距
                          </div>
                          <p className="text-xs text-primary-600">
                            决定单根立杆承受的荷载面积，间距越小安全系数越高，但材料用量增加。
                          </p>
                        </div>
                        <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                          <div className="font-medium text-primary-800 mb-1">
                            📏 步距控制
                          </div>
                          <p className="text-xs text-primary-600">
                            影响立杆稳定，步距越小立杆越不容易失稳。高支模步距通常不超过1200mm。
                          </p>
                        </div>
                        <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                          <div className="font-medium text-primary-800 mb-1">
                            🪵 木方间距
                          </div>
                          <p className="text-xs text-primary-600">
                            影响面板挠度，间距过大易造成模板下垂，影响混凝土成型质量。
                          </p>
                        </div>
                        <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                          <div className="font-medium text-primary-800 mb-1">
                            ⚖️ 施工荷载
                          </div>
                          <p className="text-xs text-primary-600">
                            要考虑人员、设备和堆料，通常取2.0-3.0 kN/m²，严禁超载。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {currentParams && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    最终参数配置
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(PARAM_INFO).map(([key, info]) => (
                      <div
                        key={key}
                        className="bg-white rounded-lg p-3 border border-gray-100"
                      >
                        <div className="text-xs text-gray-500">{info.label}</div>
                        <div className="font-mono font-semibold text-gray-800 text-lg">
                          {currentParams[key as keyof typeof currentParams]}
                          <span className="text-sm text-gray-400 font-normal">
                            {" "}
                            {info.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="print-only"
                style={{
                  marginTop: "32px",
                  paddingTop: "16px",
                  borderTop: "1px dashed #d1d5db",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>📚 参考规范: 《建筑施工模板安全技术规范》JGJ162-2008</span>
                  <span>🏗️ 模板支撑安全教学练习平台 - 教学报告</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-800">调整时间线</h3>
                    <span className="text-xs text-gray-400">
                      共 {adjustmentHistory.length} 条记录（调整 {actualCount} 次）
                      {filterType !== "all" &&
                        ` (显示 ${filteredHistory.length} 条)`}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedHistory(!expandedHistory)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-print"
                  >
                    {expandedHistory ? (
                      <>
                        <ChevronUp size={16} /> 收起
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} /> 展开
                      </>
                    )}
                  </button>
                </div>

                {expandedHistory && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4 no-print">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mr-1">
                        <Filter size={12} /> 筛选:
                      </div>
                      {filterOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFilterType(opt.value);
                            setCurrentPage(1);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                            filterType === opt.value
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {opt.label} ({opt.count})
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {paginatedRecords.map((record, pageIdx) => {
                          const globalIdx = adjustmentHistory.indexOf(record);
                          const color = getStatusColor(record.result.status);
                          const statusText = getStatusText(record.result.status);
                          return (
                            <div
                              key={record.timestamp}
                              className="relative flex gap-4"
                            >
                              <div
                                className="w-9 h-9 rounded-full border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {globalIdx + 1}
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-800 text-sm">
                                    {getParamChangeDescription(
                                      record,
                                      adjustmentHistory
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        handleViewHistoryDetail(record, globalIdx)
                                      }
                                      className="p-1 hover:bg-gray-200 rounded no-print"
                                      title="查看详情"
                                    >
                                      <Eye size={14} className="text-gray-500" />
                                    </button>
                                    <span
                                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: `${color}15`,
                                        color,
                                      }}
                                    >
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>
                                    系数:{" "}
                                    <span className="font-mono font-medium text-gray-700">
                                      {record.result.overallSafetyFactor.toFixed(2)}
                                    </span>
                                  </span>
                                  <span>{formatTime(record.timestamp)}</span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                                  <span>
                                    纵距: {record.params.poleSpacingX}mm
                                  </span>
                                  <span>
                                    横距: {record.params.poleSpacingY}mm
                                  </span>
                                  <span>
                                    步距: {record.params.stepDistance}mm
                                  </span>
                                  <span>
                                    板厚: {record.params.slabThickness}mm
                                  </span>
                                  <span>
                                    木方: {record.params.woodSpacing}mm
                                  </span>
                                  <span>
                                    荷载: {record.params.constructionLoad}
                                    kN/m²
                                  </span>
                                </div>
                              </div>
                              {pageIdx < paginatedRecords.length - 1 && (
                                <ArrowRight
                                  size={16}
                                  className="absolute left-[14px] top-full -translate-y-1/2 text-gray-300"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 no-print">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, safeCurrentPage - 1))
                          }
                          disabled={safeCurrentPage <= 1}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="text-sm text-gray-600">
                          第{" "}
                          <span className="font-semibold text-gray-800">
                            {safeCurrentPage}
                          </span>{" "}
                          / {totalPages} 页
                        </div>
                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, safeCurrentPage + 1)
                            )
                          }
                          disabled={safeCurrentPage >= totalPages}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}

                <div className="print-all-history">
                  <div className="space-y-3 mt-4">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      完整调整记录（共 {allRecordsForPrint.length} 条）
                    </div>
                    {allRecordsForPrint.map((record, idx) => {
                      const globalIdx = adjustmentHistory.indexOf(record);
                      const color = getStatusColor(record.result.status);
                      return (
                        <div
                          key={`print-${record.timestamp}`}
                          className="p-3 border border-gray-200 rounded-lg"
                          style={{ fontSize: "12px" }}
                        >
                          <div className="flex justify-between">
                            <span>
                              [{globalIdx + 1}]{" "}
                              {getParamChangeDescription(record, adjustmentHistory)}
                            </span>
                            <span style={{ color }}>
                              {record.result.status === "safe"
                                ? "✅"
                                : record.result.status === "warning"
                                ? "⚠️"
                                : "❌"}
                            </span>
                          </div>
                          <div className="text-gray-500 mt-1">
                            安全系数: {record.result.overallSafetyFactor.toFixed(2)}
                            {" | "}
                            纵距{record.params.poleSpacingX} × 横距
                            {record.params.poleSpacingY} × 步距
                            {record.params.stepDistance}mm
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "replay" && (
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <PlayCircle size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-gray-800">安全系数变化曲线</h3>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="relative h-40 flex items-end gap-1">
                    {safetyFactorChart.map((point, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end gap-1 group"
                      >
                        <div
                          className={`w-full rounded-t transition-all ${
                            point.status === "safe"
                              ? "bg-emerald-500"
                              : point.status === "warning"
                              ? "bg-amber-500"
                              : "bg-red-500"
                          } ${
                            selectedHistoryDetail?.index === idx
                              ? "ring-2 ring-primary-500"
                              : ""
                          }`}
                          style={{
                            height: `${Math.max(8, (point.factor / 2) * 100)}%`,
                          }}
                          onClick={() => {
                            const record = adjustmentHistory[idx];
                            handleViewHistoryDetail(record, idx);
                          }}
                        />
                        {!point.isInitial && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            {idx}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-red-500" /> 危险
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-amber-500" /> 临界
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-emerald-500" /> 安全
                      </span>
                    </div>
                    <span>点击柱子查看该步骤详情</span>
                  </div>
                </div>
              </div>

              {selectedHistoryDetail && (
                <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-5 border border-primary-200 animate-scale-in">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-600 text-white rounded-lg">
                        <Eye size={18} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          步骤 {selectedHistoryDetail.index + 1} 详情
                        </h3>
                        <p className="text-xs text-gray-500">
                          {getParamChangeDescription(
                            selectedHistoryDetail.record,
                            adjustmentHistory
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={closeHistoryDetail}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-gray-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {Object.entries(PARAM_INFO).map(([key, info]) => (
                      <div
                        key={key}
                        className="bg-white/70 rounded-lg p-3 border border-primary-100"
                      >
                        <div className="text-xs text-gray-500">{info.label}</div>
                        <div className="font-mono font-semibold text-gray-800">
                          {
                            selectedHistoryDetail.record.params[
                              key as keyof CalculationParams
                            ]
                          }
                          <span className="text-xs text-gray-400 font-normal">
                            {" "}
                            {info.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        安全系数
                      </span>
                      <span
                        className="text-2xl font-bold font-mono"
                        style={{
                          color: getStatusColor(
                            selectedHistoryDetail.record.result.status
                          ),
                        }}
                      >
                        {selectedHistoryDetail.record.result.overallSafetyFactor.toFixed(
                          2
                        )}
                      </span>
                    </div>
                    <div
                      className={`p-2 rounded-lg text-sm ${
                        selectedHistoryDetail.record.result.status === "safe"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedHistoryDetail.record.result.status === "warning"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {getStatusText(selectedHistoryDetail.record.result.status)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      各验算项结果
                    </div>
                    <div className="space-y-2">
                      {selectedHistoryDetail.record.result.checks.map((check) => (
                        <div
                          key={check.id}
                          className={`p-2 rounded-lg text-sm flex items-center justify-between ${
                            check.passed
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-red-50 text-red-800"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {check.passed ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}
                            {check.name}
                          </span>
                          <span className="font-mono">
                            {check.safetyFactor.toFixed(2)} / {check.requiredFactor}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!selectedHistoryDetail.record.result.checks.every((c) => c.passed) &&
                    scenario && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-1 text-sm font-medium text-amber-800 mb-1">
                          <Lightbulb size={14} /> 当时的调整建议
                        </div>
                        <div className="text-xs text-amber-700">
                          可尝试减小
                          {selectedHistoryDetail.record.result.checks
                            .filter((c) => !c.passed)
                            .flatMap((c) =>
                              c.affectedParams.filter(
                                (p) =>
                                  p === "poleSpacingX" ||
                                  p === "poleSpacingY" ||
                                  p === "stepDistance" ||
                                  p === "woodSpacing" ||
                                  p === "constructionLoad"
                              )
                            )
                            .filter(
                              (v, i, a) => a.indexOf(v) === i
                            )
                            .map((p) => PARAM_INFO[p].label)
                            .join("、")}
                          来提高安全系数。
                        </div>
                      </div>
                    )}

                  <div className="text-xs text-gray-500 mt-4 text-right">
                    时间: {formatTime(selectedHistoryDetail.record.timestamp)}
                  </div>
                </div>
              )}

              {!selectedHistoryDetail && (
                <div className="text-center py-12 text-gray-400">
                  <PlayCircle size={48} className="mx-auto mb-3 opacity-30" />
                  <p>点击上方柱状图中的任意步骤，查看该时刻的参数、危险项和调整建议</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between no-print">
          <div className="text-sm text-gray-500 flex items-center gap-4">
            {firstRecord && lastRecord && (
              <>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  练习时长:{" "}
                  {Math.round(
                    (lastRecord.timestamp - firstRecord.timestamp) / 1000
                  )}
                  秒
                </span>
              </>
            )}
            <span>共 {actualCount} 次调整</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <Download size={18} />
              <span>导出/打印报告</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md shadow-primary-200"
            >
              继续练习
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
