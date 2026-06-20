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
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";
import { getStatusColor, getStatusText, getPrioritySuggestions } from "@/utils/calculationEngine";
import { PARAM_INFO } from "@/types";
import type { AdjustmentRecord, ParamKey, CalculationParams } from "@/types";

const PAGE_SIZE = 8;

interface SummaryPanelProps {
  onClose: () => void;
}

type FilterType = "all" | "danger" | "warning" | "safe" | "milestone";

export function SummaryPanel({ onClose }: SummaryPanelProps) {
  const { adjustmentHistory, currentScenarioId, currentParams } = usePracticeStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [expandedHistory, setExpandedHistory] = useState(true);

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

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

  const filteredHistory = useMemo(() => {
    const milestones = new Set<number>();
    let bestFactor = -Infinity;
    adjustmentHistory.forEach((record, idx) => {
      if (record.result.overallSafetyFactor > bestFactor) {
        bestFactor = record.result.overallSafetyFactor;
        milestones.add(idx);
      }
      if (record.result.status !== adjustmentHistory[Math.max(0, idx - 1)]?.result.status) {
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
    if (!record.changedParam) return "初始参数设置";
    const info = PARAM_INFO[record.changedParam];
    const idx = allRecords.indexOf(record);
    const prevRecord = allRecords[idx - 1];
    if (!prevRecord) return `${info.label} 设置为 ${record.params[record.changedParam]}${info.unit}`;
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
          (key !== "slabThickness" && key !== "constructionLoad" && diff < 0) ||
          (key === "constructionLoad" && diff < 0);
        status = improvesSafety ? "better" : "worse";
      }
      return { key, diff, status };
    });
  };

  const initialParams = firstRecord?.params;
  const recommendedParams = scenario?.defaultParams;

  const prioritySuggestions = useMemo(() => {
    if (!scenario || !currentParams || lastRecord?.result.status === "safe") return [];
    return getPrioritySuggestions(currentParams, scenario.paramRanges);
  }, [scenario, currentParams, lastRecord]);

  const handlePrint = () => {
    window.print();
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
      count: filteredHistory.length > 0 ? adjustmentHistory.filter((_, idx) => {
        const milestones = new Set<number>();
        let bestFactor = -Infinity;
        adjustmentHistory.forEach((r, i) => {
          if (r.result.overallSafetyFactor > bestFactor) {
            bestFactor = r.result.overallSafetyFactor;
            milestones.add(i);
          }
          if (r.result.status !== adjustmentHistory[Math.max(0, i - 1)]?.result.status) {
            milestones.add(i);
          }
        });
        return milestones.has(idx);
      }).length : 0,
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
        }
        .print-only { display: none; }
      `}</style>

      <div className="print-only print-header" style={{ display: "none" }}>
        <div style={{ borderBottom: "3px solid #1E40AF", paddingBottom: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "32px" }}>🏗️</div>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1E40AF", margin: 0 }}>
                模板支撑安全练习报告
              </h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
                {scenario.name} | 练习完成报告
              </p>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280", display: "flex", gap: "24px" }}>
            <span>📅 {lastRecord ? formatDateTime(lastRecord.timestamp) : "-"}</span>
            <span>⏱️ 练习时长: {firstRecord && lastRecord ? Math.round((lastRecord.timestamp - firstRecord.timestamp) / 1000) : 0}秒</span>
            <span>📊 调整次数: {adjustmentHistory.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-scale-in print-full">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="print-only">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "调整次数", value: adjustmentHistory.length, color: "#1E40AF" },
                { label: "最终安全系数", value: lastRecord?.result.overallSafetyFactor.toFixed(2) || "0.00", color: isSuccess ? "#059669" : "#DC2626" },
                { label: "系数提升", value: `${improvement >= 0 ? "+" : ""}${improvement.toFixed(0)}%`, color: improvement >= 0 ? "#059669" : "#DC2626" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 no-print">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary-600 font-mono">
                {adjustmentHistory.length}
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
                <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={24} />
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
                    💡 你的最佳成绩出现在某次中间调整，安全系数达到 {bestRecord.result.overallSafetyFactor.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {initialParams && currentParams && recommendedParams && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <GitCompare size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-gray-800">参数对比分析</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  对比初始参数、当前参数与推荐布置，直观查看改进方向
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">参数名称</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">初始值</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">当前值</th>
                      <th className="px-4 py-3 font-medium text-emerald-700 text-center bg-emerald-50">
                        ✅ 推荐值
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">改进方向</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(PARAM_INFO) as ParamKey[]).map((key) => {
                      const info = PARAM_INFO[key];
                      const comparison = compareParams(currentParams, recommendedParams);
                      const item = comparison.find((c) => c.key === key)!;
                      const isImproved =
                        initialParams &&
                        ((key === "slabThickness" && currentParams[key] >= initialParams[key]) ||
                          (key !== "slabThickness" &&
                            key !== "constructionLoad" &&
                            currentParams[key] <= initialParams[key]) ||
                          (key === "constructionLoad" && currentParams[key] <= initialParams[key]));

                      return (
                        <tr key={key} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {info.label}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-gray-500">
                            {initialParams[key]}
                            <span className="text-xs text-gray-400"> {info.unit}</span>
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
                            <span className="text-xs text-gray-400"> {info.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-700 bg-emerald-50 font-semibold">
                            {recommendedParams[key]}
                            <span className="text-xs text-emerald-500"> {info.unit}</span>
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
                                <span className="text-xs text-emerald-500 ml-1">↑</span>
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
                    <TrendingUp size={12} className="text-emerald-500" /> 优于推荐值（安全储备更高）
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={12} className="text-red-500" /> 需要向推荐值调整
                  </span>
                </div>
              </div>
            </div>
          )}

          {prioritySuggestions.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <Target size={18} className="text-red-600" />
                <h3 className="font-semibold text-red-800">下一步优化建议</h3>
              </div>
              <div className="space-y-2">
                {prioritySuggestions.slice(0, 2).map((s) => (
                  <div key={s.checkId} className="p-3 bg-white rounded-lg border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {s.rank}
                      </span>
                      <span className="font-medium text-gray-800 text-sm">{s.checkName}</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-7">
                      优先{s.topAction.description}，预计提升安全系数约 +{s.topAction.estimatedImprovement.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4 no-print">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-gray-500" />
                <h3 className="font-semibold text-gray-800">调整过程</h3>
                <span className="text-xs text-gray-400">
                  共 {adjustmentHistory.length} 条记录
                  {filterType !== "all" && ` (显示 ${filteredHistory.length} 条)`}
                </span>
              </div>
              <button
                onClick={() => setExpandedHistory(!expandedHistory)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
                        <div key={record.timestamp} className="relative flex gap-4">
                          <div
                            className="w-9 h-9 rounded-full border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {globalIdx + 1}
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-800 text-sm">
                                {getParamChangeDescription(record, adjustmentHistory)}
                              </span>
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
                              <span>纵距: {record.params.poleSpacingX}mm</span>
                              <span>横距: {record.params.poleSpacingY}mm</span>
                              <span>步距: {record.params.stepDistance}mm</span>
                              <span>板厚: {record.params.slabThickness}mm</span>
                              <span>木方: {record.params.woodSpacing}mm</span>
                              <span>荷载: {record.params.constructionLoad}kN/m²</span>
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
                      onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="text-sm text-gray-600">
                      第 <span className="font-semibold text-gray-800">{safeCurrentPage}</span> /{" "}
                      {totalPages} 页
                    </div>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-5 border border-primary-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-600 text-white rounded-lg">
                <GraduationCap size={20} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-primary-800 mb-2 text-lg">教学要点与布置思路</div>
                <div className="text-sm text-primary-700 space-y-3">
                  <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                    <div className="font-medium text-primary-800 mb-1">📐 推荐布置方案</div>
                    <p>{scenario.correctSolution}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                      <div className="font-medium text-primary-800 mb-1">🏗️ 立杆间距</div>
                      <p className="text-xs text-primary-600">
                        决定单根立杆承受的荷载面积，间距越小安全系数越高，但材料用量增加。
                      </p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                      <div className="font-medium text-primary-800 mb-1">📏 步距控制</div>
                      <p className="text-xs text-primary-600">
                        影响立杆稳定，步距越小立杆越不容易失稳。高支模步距通常不超过1200mm。
                      </p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                      <div className="font-medium text-primary-800 mb-1">🪵 木方间距</div>
                      <p className="text-xs text-primary-600">
                        影响面板挠度，间距过大易造成模板下垂，影响混凝土成型质量。
                      </p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-lg border border-primary-100">
                      <div className="font-medium text-primary-800 mb-1">⚖️ 施工荷载</div>
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
                  <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-xs text-gray-500">{info.label}</div>
                    <div className="font-mono font-semibold text-gray-800 text-lg">
                      {currentParams[key as keyof typeof currentParams]}
                      <span className="text-sm text-gray-400 font-normal"> {info.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="print-only" style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px dashed #d1d5db" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
              <span>📚 参考规范: 《建筑施工模板安全技术规范》JGJ162-2008</span>
              <span>🏗️ 模板支撑安全教学练习平台 - 教学报告</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between no-print">
          <div className="text-sm text-gray-500 flex items-center gap-4">
            {firstRecord && lastRecord && (
              <>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  练习时长: {Math.round((lastRecord.timestamp - firstRecord.timestamp) / 1000)}秒
                </span>
              </>
            )}
            <span>共 {adjustmentHistory.length} 条调整记录</span>
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
