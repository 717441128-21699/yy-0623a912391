import { useMemo } from "react";
import {
  X,
  Users,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  User,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { KEY_POINTS, PARAM_INFO } from "@/types";
import type { PracticeArchive, AdjustmentRecord } from "@/types";

interface ComparisonPanelProps {
  onClose: () => void;
}

export function ComparisonPanel({ onClose }: ComparisonPanelProps) {
  const {
    archives,
    comparisonSelection,
    setComparisonSelection,
    getComparisonResult,
  } = usePracticeStore();

  const result = useMemo(() => getComparisonResult(), [getComparisonResult]);

  const archiveA = archives.find((a) => a.id === comparisonSelection.a);
  const archiveB = archives.find((a) => a.id === comparisonSelection.b);

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "#059669";
      case "warning":
        return "#d97706";
      default:
        return "#dc2626";
    }
  };

  const getStepDescription = (
    record: AdjustmentRecord,
    history: AdjustmentRecord[],
    idx: number
  ) => {
    if (record.isInitial) return "初始参数";
    const prev = history[idx - 1];
    if (!prev) return `第 ${idx + 1} 步`;
    const changed: string[] = [];
    (Object.keys(record.params) as (keyof typeof record.params)[]).forEach((k) => {
      if (Math.abs(record.params[k] - prev.params[k]) > 0.01) {
        const info = PARAM_INFO[k];
        const diff = record.params[k] - prev.params[k];
        const dir = diff < 0 ? "↓" : "↑";
        changed.push(`${info.label}${dir}${Math.abs(diff)}${info.unit}`);
      }
    });
    return changed.length > 0 ? changed.join("，") : `第 ${idx + 1} 步`;
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

  const renderArchiveCard = (
    archive: PracticeArchive | undefined,
    which: "A" | "B"
  ) => {
    const isSelected = which === "A" ? !!archiveA : !!archiveB;
    return (
      <div
        className={`flex-1 rounded-xl border-2 p-4 transition-colors ${
          isSelected
            ? which === "A"
              ? "border-blue-400 bg-blue-50/50"
              : "border-purple-400 bg-purple-50/50"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div
          className={`text-xs font-semibold mb-3 ${
            which === "A" ? "text-blue-600" : "text-purple-600"
          }`}
        >
          学生 {which}
        </div>
        <select
          value={comparisonSelection[which.toLowerCase() as "a" | "b"] || ""}
          onChange={(e) =>
            setComparisonSelection(
              which.toLowerCase() as "a" | "b",
              e.target.value || null
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- 选择学生练习 --</option>
          {archives.map((a) => (
            <option key={a.id} value={a.id}>
              {a.studentInfo.name} | {a.scenarioName} |{" "}
              {formatDateTime(a.archivedAt)}
            </option>
          ))}
        </select>

        {archive && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              <span className="font-semibold text-gray-800">
                {archive.studentInfo.name}
              </span>
              {archive.studentInfo.className && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {archive.studentInfo.className}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white rounded border border-gray-100">
                <div className="text-gray-500">最终状态</div>
                <div className="font-semibold mt-0.5">
                  {archive.finalStatus === "safe" ? (
                    <span className="text-emerald-600">✅ 通过</span>
                  ) : archive.finalStatus === "warning" ? (
                    <span className="text-amber-600">⚠️ 临界</span>
                  ) : (
                    <span className="text-red-600">❌ 不通过</span>
                  )}
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <div className="text-gray-500">安全系数</div>
                <div className="font-mono font-semibold text-gray-800 mt-0.5">
                  {archive.finalSafetyFactor.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <div className="text-gray-500">调整次数</div>
                <div className="font-mono font-semibold text-gray-800 mt-0.5">
                  {archive.actualAdjustmentCount} 次
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-gray-100">
                <div className="text-gray-500">老师评分</div>
                <div className="font-mono font-semibold text-gray-800 mt-0.5">
                  {archive.teacherFeedback.score > 0
                    ? `${archive.teacherFeedback.score} 分`
                    : "未评"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">风险项</div>
              <div className="flex flex-wrap gap-1">
                {archive.riskSummary.length === 0 ? (
                  <span className="text-xs text-gray-400">无风险记录</span>
                ) : (
                  archive.riskSummary.slice(0, 4).map((r) => (
                    <span
                      key={r.checkId}
                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                        r.resolved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.checkName}({r.count})
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="text-primary-600" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">学生练习对比</h2>
              <p className="text-xs text-gray-500">选择两名学生的练习记录进行对比分析</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {archives.length < 2 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p>至少需要 2 份存档记录才能进行对比</p>
              <p className="text-xs mt-1">当前共有 {archives.length} 份存档</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {renderArchiveCard(archiveA, "A")}
                <ChevronRight size={24} className="text-gray-300 flex-shrink-0" />
                {renderArchiveCard(archiveB, "B")}
              </div>

              {result && (
                <>
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy size={20} className="text-amber-600" />
                      <h3 className="font-semibold text-amber-800">对比结论</h3>
                    </div>
                    <div className="text-sm text-amber-800 mb-4">
                      {result.fasterStudent === "tie" ? (
                        <span>两名学生表现相当，难分伯仲。</span>
                      ) : (
                        <span>
                          🎉{" "}
                          <strong>
                            {result.fasterStudent === "A"
                              ? result.archiveA.studentInfo.name
                              : result.archiveB.studentInfo.name}
                          </strong>{" "}
                          表现更优！
                          {result.fasterStudent === "A"
                            ? result.archiveA.finalStatus === "safe" &&
                              result.archiveB.finalStatus !== "safe"
                              ? " 成功通过验算，而另一位尚未通过。"
                              : result.archiveA.actualAdjustmentCount <
                                result.archiveB.actualAdjustmentCount
                              ? ` 以更少的调整次数（${result.archiveA.actualAdjustmentCount} vs ${result.archiveB.actualAdjustmentCount}）完成练习。`
                              : ` 安全系数更高（${result.archiveA.finalSafetyFactor.toFixed(2)} vs ${result.archiveB.finalSafetyFactor.toFixed(2)}）。`
                            : result.archiveB.finalStatus === "safe" &&
                              result.archiveA.finalStatus !== "safe"
                            ? " 成功通过验算，而另一位尚未通过。"
                            : result.archiveB.actualAdjustmentCount <
                              result.archiveA.actualAdjustmentCount
                            ? ` 以更少的调整次数（${result.archiveB.actualAdjustmentCount} vs ${result.archiveA.actualAdjustmentCount}）完成练习。`
                            : ` 安全系数更高（${result.archiveB.finalSafetyFactor.toFixed(2)} vs ${result.archiveA.finalSafetyFactor.toFixed(2)}）。`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-white/80 rounded-lg border border-blue-100">
                        <div className="text-sm font-semibold text-blue-700 mb-1">
                          {result.archiveA.studentInfo.name} 的学习评价
                        </div>
                        <p className="text-xs text-gray-600">{result.evaluationA}</p>
                      </div>
                      <div className="p-3 bg-white/80 rounded-lg border border-purple-100">
                        <div className="text-sm font-semibold text-purple-700 mb-1">
                          {result.archiveB.studentInfo.name} 的学习评价
                        </div>
                        <p className="text-xs text-gray-600">{result.evaluationB}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <h4 className="font-semibold text-gray-800 text-sm">
                          {result.archiveA.studentInfo.name} 反复卡住的风险项
                        </h4>
                      </div>
                      {result.stuckRisksA.length === 0 ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 size={14} /> 无明显反复卡住的风险项，掌握较好
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {result.stuckRisksA.map((r) => (
                            <div
                              key={r.checkId}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 text-xs"
                            >
                              <span className="font-medium text-gray-700">
                                {r.checkName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  r.resolved
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {r.count}次 | {r.resolved ? "已解决" : "未解决"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <h4 className="font-semibold text-gray-800 text-sm">
                          {result.archiveB.studentInfo.name} 反复卡住的风险项
                        </h4>
                      </div>
                      {result.stuckRisksB.length === 0 ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 size={14} /> 无明显反复卡住的风险项，掌握较好
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {result.stuckRisksB.map((r) => (
                            <div
                              key={r.checkId}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 text-xs"
                            >
                              <span className="font-medium text-gray-700">
                                {r.checkName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  r.resolved
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {r.count}次 | {r.resolved ? "已解决" : "未解决"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-800 text-sm">详细数据对比</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs">
                            <th className="px-4 py-2 font-medium text-gray-600">对比项</th>
                            <th className="px-4 py-2 font-medium text-blue-700 text-center">
                              {result.archiveA.studentInfo.name}
                            </th>
                            <th className="px-4 py-2 font-medium text-purple-700 text-center">
                              {result.archiveB.studentInfo.name}
                            </th>
                            <th className="px-4 py-2 font-medium text-gray-600 text-center">
                              优势方
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {
                              label: "最终状态",
                              a:
                                result.archiveA.finalStatus === "safe"
                                  ? "通过 ✅"
                                  : result.archiveA.finalStatus === "warning"
                                  ? "临界 ⚠️"
                                  : "不通过 ❌",
                              b:
                                result.archiveB.finalStatus === "safe"
                                  ? "通过 ✅"
                                  : result.archiveB.finalStatus === "warning"
                                  ? "临界 ⚠️"
                                  : "不通过 ❌",
                              winner:
                                result.archiveA.finalStatus === "safe" &&
                                result.archiveB.finalStatus !== "safe"
                                  ? "A"
                                  : result.archiveB.finalStatus === "safe" &&
                                    result.archiveA.finalStatus !== "safe"
                                  ? "B"
                                  : "平手",
                            },
                            {
                              label: "安全系数",
                              a: result.archiveA.finalSafetyFactor.toFixed(2),
                              b: result.archiveB.finalSafetyFactor.toFixed(2),
                              winner:
                                result.archiveA.finalSafetyFactor >
                                result.archiveB.finalSafetyFactor
                                  ? "A"
                                  : result.archiveB.finalSafetyFactor >
                                    result.archiveA.finalSafetyFactor
                                  ? "B"
                                  : "平手",
                            },
                            {
                              label: "调整次数",
                              a: `${result.archiveA.actualAdjustmentCount} 次`,
                              b: `${result.archiveB.actualAdjustmentCount} 次`,
                              winner:
                                result.archiveA.actualAdjustmentCount <
                                result.archiveB.actualAdjustmentCount
                                  ? "A"
                                  : result.archiveB.actualAdjustmentCount <
                                    result.archiveA.actualAdjustmentCount
                                  ? "B"
                                  : "平手",
                            },
                            {
                              label: "练习场景",
                              a: result.archiveA.scenarioName,
                              b: result.archiveB.scenarioName,
                              winner:
                                result.archiveA.scenarioId ===
                                result.archiveB.scenarioId
                                  ? "同场景"
                                  : "不同",
                            },
                            {
                              label: "风险项总数",
                              a: `${result.archiveA.riskSummary.length} 项`,
                              b: `${result.archiveB.riskSummary.length} 项`,
                              winner:
                                result.archiveA.riskSummary.length <
                                result.archiveB.riskSummary.length
                                  ? "A"
                                  : result.archiveB.riskSummary.length <
                                    result.archiveA.riskSummary.length
                                  ? "B"
                                  : "平手",
                            },
                            {
                              label: "已解决风险",
                              a: `${result.archiveA.riskSummary.filter((r) => r.resolved).length} 项`,
                              b: `${result.archiveB.riskSummary.filter((r) => r.resolved).length} 项`,
                              winner:
                                result.archiveA.riskSummary.filter((r) => r.resolved)
                                  .length >
                                result.archiveB.riskSummary.filter((r) => r.resolved)
                                  .length
                                  ? "A"
                                  : result.archiveB.riskSummary.filter((r) => r.resolved)
                                      .length >
                                    result.archiveA.riskSummary.filter((r) => r.resolved)
                                      .length
                                  ? "B"
                                  : "平手",
                            },
                            {
                              label: "老师评分",
                              a:
                                result.archiveA.teacherFeedback.score > 0
                                  ? `${result.archiveA.teacherFeedback.score} 分`
                                  : "未评",
                              b:
                                result.archiveB.teacherFeedback.score > 0
                                  ? `${result.archiveB.teacherFeedback.score} 分`
                                  : "未评",
                              winner:
                                result.archiveA.teacherFeedback.score >
                                result.archiveB.teacherFeedback.score
                                  ? "A"
                                  : result.archiveB.teacherFeedback.score >
                                    result.archiveA.teacherFeedback.score
                                  ? "B"
                                  : "平手",
                            },
                          ].map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-t border-gray-100 text-xs"
                            >
                              <td className="px-4 py-2 font-medium text-gray-700">
                                {row.label}
                              </td>
                              <td className="px-4 py-2 text-center font-mono text-blue-700">
                                {row.a}
                              </td>
                              <td className="px-4 py-2 text-center font-mono text-purple-700">
                                {row.b}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    row.winner === "A"
                                      ? "bg-blue-100 text-blue-700"
                                      : row.winner === "B"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {row.winner}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                        <ArrowRight size={16} className="text-blue-600" />
                        调整路线并排对比（按步骤对齐）
                      </h4>
                      <div className="text-xs text-gray-500">
                        学生A共 {result.archiveA.adjustmentHistory.length} 步 | 学生B共{" "}
                        {result.archiveB.adjustmentHistory.length} 步
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs">
                            <th
                              className="px-3 py-2 font-medium text-gray-500 text-center w-14"
                              style={{ background: "#f1f5f9" }}
                            >
                              步骤
                            </th>
                            <th className="px-3 py-2 font-medium text-blue-700" style={{ background: "#eff6ff" }}>
                              {result.archiveA.studentInfo.name}（调整内容）
                            </th>
                            <th className="px-3 py-2 font-medium text-blue-700 text-center w-24" style={{ background: "#eff6ff" }}>
                              系数/状态
                            </th>
                            <th className="px-3 py-2 font-medium text-blue-700" style={{ background: "#eff6ff" }}>
                              风险项
                            </th>
                            <th className="px-3 py-2 font-medium text-purple-700" style={{ background: "#faf5ff" }}>
                              {result.archiveB.studentInfo.name}（调整内容）
                            </th>
                            <th className="px-3 py-2 font-medium text-purple-700 text-center w-24" style={{ background: "#faf5ff" }}>
                              系数/状态
                            </th>
                            <th className="px-3 py-2 font-medium text-purple-700" style={{ background: "#faf5ff" }}>
                              风险项
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const maxLen = Math.max(
                              result.archiveA.adjustmentHistory.length,
                              result.archiveB.adjustmentHistory.length
                            );
                            const rows = [];
                            for (let i = 0; i < maxLen; i++) {
                              const recA = result.archiveA.adjustmentHistory[i];
                              const recB = result.archiveB.adjustmentHistory[i];
                              const aFirstSafe =
                                recA?.result.status === "safe" &&
                                result.archiveA.adjustmentHistory
                                  .slice(0, i)
                                  .every((r) => r.result.status !== "safe");
                              const bFirstSafe =
                                recB?.result.status === "safe" &&
                                result.archiveB.adjustmentHistory
                                  .slice(0, i)
                                  .every((r) => r.result.status !== "safe");

                              rows.push(
                                <tr key={i} className="border-t border-gray-100 text-xs">
                                  <td
                                    className="px-3 py-2 text-center font-mono text-gray-500"
                                    style={{ background: "#f8fafc" }}
                                  >
                                    {i + 1}
                                  </td>

                                  {recA ? (
                                    <>
                                      <td
                                        className={`px-3 py-2 ${
                                          aFirstSafe ? "bg-emerald-50 font-semibold" : ""
                                        }`}
                                      >
                                        <div className="text-gray-800">
                                          {getStepDescription(
                                            recA,
                                            result.archiveA.adjustmentHistory,
                                            i
                                          )}
                                        </div>
                                        <div className="text-gray-400 text-[10px] mt-0.5 font-mono">
                                          纵{recA.params.poleSpacingX}×横
                                          {recA.params.poleSpacingY}×步
                                          {recA.params.stepDistance} | 板厚
                                          {recA.params.slabThickness} | 木方
                                          {recA.params.woodSpacing}
                                        </div>
                                        {aFirstSafe && (
                                          <div className="text-emerald-600 text-[10px] mt-0.5">
                                            ✅ 首次通过
                                          </div>
                                        )}
                                      </td>
                                      <td
                                        className={`px-3 py-2 text-center font-mono ${
                                          aFirstSafe ? "bg-emerald-50" : ""
                                        }`}
                                      >
                                        <div
                                          style={{
                                            color: getStatusColor(recA.result.status),
                                            fontWeight: 600,
                                          }}
                                        >
                                          {recA.result.overallSafetyFactor.toFixed(2)}
                                        </div>
                                        <div
                                          className="text-[10px] mt-0.5"
                                          style={{ color: getStatusColor(recA.result.status) }}
                                        >
                                          {recA.result.status === "safe"
                                            ? "安全"
                                            : recA.result.status === "warning"
                                            ? "临界"
                                            : "危险"}
                                        </div>
                                      </td>
                                      <td
                                        className={`px-3 py-2 ${
                                          aFirstSafe ? "bg-emerald-50" : ""
                                        }`}
                                      >
                                        <div className="flex flex-wrap gap-0.5">
                                          {recA.result.checks
                                            .filter((c) => !c.passed)
                                            .map((c) => (
                                              <span
                                                key={c.id}
                                                className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700"
                                              >
                                                {c.name}
                                              </span>
                                            ))}
                                          {recA.result.checks.filter((c) => !c.passed)
                                            .length === 0 && (
                                            <span className="text-[10px] text-emerald-600">
                                              无风险
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-3 py-2 bg-gray-50 text-gray-300 text-center italic">
                                        —
                                      </td>
                                      <td className="px-3 py-2 bg-gray-50 text-gray-300 text-center italic">
                                        —
                                      </td>
                                      <td className="px-3 py-2 bg-gray-50 text-gray-300 text-center italic">
                                        —
                                      </td>
                                    </>
                                  )}

                                  {recB ? (
                                    <>
                                      <td
                                        className={`px-3 py-2 ${
                                          bFirstSafe ? "bg-emerald-50 font-semibold" : ""
                                        }`}
                                      >
                                        <div className="text-gray-800">
                                          {getStepDescription(
                                            recB,
                                            result.archiveB.adjustmentHistory,
                                            i
                                          )}
                                        </div>
                                        <div className="text-gray-400 text-[10px] mt-0.5 font-mono">
                                          纵{recB.params.poleSpacingX}×横
                                          {recB.params.poleSpacingY}×步
                                          {recB.params.stepDistance} | 板厚
                                          {recB.params.slabThickness} | 木方
                                          {recB.params.woodSpacing}
                                        </div>
                                        {bFirstSafe && (
                                          <div className="text-emerald-600 text-[10px] mt-0.5">
                                            ✅ 首次通过
                                          </div>
                                        )}
                                      </td>
                                      <td
                                        className={`px-3 py-2 text-center font-mono ${
                                          bFirstSafe ? "bg-emerald-50" : ""
                                        }`}
                                      >
                                        <div
                                          style={{
                                            color: getStatusColor(recB.result.status),
                                            fontWeight: 600,
                                          }}
                                        >
                                          {recB.result.overallSafetyFactor.toFixed(2)}
                                        </div>
                                        <div
                                          className="text-[10px] mt-0.5"
                                          style={{ color: getStatusColor(recB.result.status) }}
                                        >
                                          {recB.result.status === "safe"
                                            ? "安全"
                                            : recB.result.status === "warning"
                                            ? "临界"
                                            : "危险"}
                                        </div>
                                      </td>
                                      <td
                                        className={`px-3 py-2 ${
                                          bFirstSafe ? "bg-emerald-50" : ""
                                        }`}
                                      >
                                        <div className="flex flex-wrap gap-0.5">
                                          {recB.result.checks
                                            .filter((c) => !c.passed)
                                            .map((c) => (
                                              <span
                                                key={c.id}
                                                className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700"
                                              >
                                                {c.name}
                                              </span>
                                            ))}
                                          {recB.result.checks.filter((c) => !c.passed)
                                            .length === 0 && (
                                            <span className="text-[10px] text-emerald-600">
                                              无风险
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-3 py-2 bg-gray-50 text-gray-300 text-center italic">
                                        —
                                      </td>
                                      <td className="px-3 py-2 bg-gray-50 text-gray-300 text-center italic">
                                        —
                                      </td>
                                      <td className="px-3 py-2 bg-gray-50 text-gray-300 text-center italic">
                                        —
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            }
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-4">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-200 border border-emerald-400"></span>
                        绿色高亮行表示该学生首次通过验算的步骤
                      </span>
                      <span>
                        谁先达到 ✅ 首次通过，说明谁更快找到正确布置方向
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                      <h4 className="font-semibold text-blue-800 text-sm mb-2">
                        {result.archiveA.studentInfo.name} - 知识点掌握
                      </h4>
                      <div className="space-y-1">
                        {KEY_POINTS.map((kp) => {
                          const status = result.archiveA.teacherFeedback.mastery[kp.id];
                          return (
                            <div
                              key={kp.id}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <span className="text-gray-700">{kp.label}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  status === "mastered"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : status === "partial"
                                    ? "bg-amber-100 text-amber-700"
                                    : status === "needs-work"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {getMasteryLabel(status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                      <h4 className="font-semibold text-purple-800 text-sm mb-2">
                        {result.archiveB.studentInfo.name} - 知识点掌握
                      </h4>
                      <div className="space-y-1">
                        {KEY_POINTS.map((kp) => {
                          const status = result.archiveB.teacherFeedback.mastery[kp.id];
                          return (
                            <div
                              key={kp.id}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <span className="text-gray-700">{kp.label}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  status === "mastered"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : status === "partial"
                                    ? "bg-amber-100 text-amber-700"
                                    : status === "needs-work"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {getMasteryLabel(status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!result && (archives.length >= 2) && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">请从上方分别选择学生 A 和学生 B 的练习记录</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md shadow-primary-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
