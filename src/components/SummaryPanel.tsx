import { useMemo } from "react";
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
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";
import { getStatusColor, getStatusText } from "@/utils/calculationEngine";
import { PARAM_INFO } from "@/types";
import type { AdjustmentRecord } from "@/types";

interface SummaryPanelProps {
  onClose: () => void;
}

export function SummaryPanel({ onClose }: SummaryPanelProps) {
  const { adjustmentHistory, currentScenarioId, currentParams } = usePracticeStore();

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

  const timeline = useMemo(() => {
    return adjustmentHistory.slice(-10);
  }, [adjustmentHistory]);

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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getParamChangeDescription = (record: AdjustmentRecord): string => {
    if (!record.changedParam) return "初始设置";
    const info = PARAM_INFO[record.changedParam];
    const prevRecord = adjustmentHistory[adjustmentHistory.indexOf(record) - 1];
    if (!prevRecord) return `${info.label} 设置为 ${record.params[record.changedParam]}${info.unit}`;
    const oldValue = prevRecord.params[record.changedParam];
    const newValue = record.params[record.changedParam];
    const direction = newValue > oldValue ? "增大" : "减小";
    return `${info.label} ${direction} 至 ${newValue}${info.unit}`;
  };

  const printSummary = () => {
    window.print();
  };

  if (!scenario) return null;

  const isSuccess = lastRecord?.result.status === "safe";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
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
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary-600 font-mono">
                {timeline.length}
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
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800">调整过程</h3>
            </div>
            <div className="relative">
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {timeline.map((record, index) => {
                  const color = getStatusColor(record.result.status);
                  const statusText = getStatusText(record.result.status);
                  return (
                    <div key={record.timestamp} className="relative flex gap-4">
                      <div
                        className="w-9 h-9 rounded-full border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 z-10"
                        style={{ backgroundColor: color }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">
                            {getParamChangeDescription(record)}
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
                        {record.changedParam && (
                          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                            <span className="text-gray-400">参数组合: </span>
                            纵距{record.params.poleSpacingX} × 横距
                            {record.params.poleSpacingY} × 步距
                            {record.params.stepDistance}mm
                          </div>
                        )}
                      </div>
                      {index < timeline.length - 1 && (
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
          </div>

          <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-primary-600 flex-shrink-0" size={20} />
              <div>
                <div className="font-semibold text-primary-800 mb-2">正确布置思路</div>
                <div className="text-sm text-primary-700 space-y-2">
                  <p>📐 {scenario.correctSolution}</p>
                  <ul className="list-disc list-inside space-y-1 text-primary-600">
                    <li>
                      立杆间距决定单根立杆承受的荷载面积，间距越小安全系数越高
                    </li>
                    <li>
                      步距影响立杆稳定，步距越小立杆越不容易发生失稳破坏
                    </li>
                    <li>
                      木方间距影响面板挠度，间距过大易造成模板下垂变形
                    </li>
                    <li>
                      施工荷载要考虑实际工况，堆料和人员行走都会增加荷载
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {currentParams && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="font-semibold text-gray-800 mb-3">最终参数配置</div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(PARAM_INFO).map(([key, info]) => (
                  <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-xs text-gray-500">{info.label}</div>
                    <div className="font-mono font-semibold text-gray-800">
                      {currentParams[key as keyof typeof currentParams]} {info.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {firstRecord && lastRecord && (
              <>
                练习时长:{" "}
                {Math.round((lastRecord.timestamp - firstRecord.timestamp) / 1000)}秒
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={printSummary}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download size={18} />
              <span>导出</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              继续练习
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
