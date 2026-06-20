import { AlertCircle, BookOpen, Lightbulb } from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { CheckItemCard } from "./CheckItemCard";
import { getStatusBgClass, getStatusText } from "@/utils/calculationEngine";

export function ExplanationPanel() {
  const { currentResult } = usePracticeStore();

  if (!currentResult) return null;

  const { status, checks } = currentResult;
  const failedChecks = checks.filter((c) => !c.passed);
  const warningChecks = checks.filter(
    (c) => c.passed && c.safetyFactor / c.requiredFactor < 1.1
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="text-primary-600" size={20} />
        <h2 className="text-lg font-semibold text-gray-800">验算结果</h2>
      </div>

      <div
        className={`p-4 rounded-xl border animate-scale-in ${getStatusBgClass(
          status
        )}`}
      >
        <div className="flex items-start gap-3">
          {status === "safe" ? (
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Lightbulb className="text-emerald-600" size={20} />
            </div>
          ) : (
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="text-red-600" size={20} />
            </div>
          )}
          <div className="flex-1">
            <div className="font-semibold text-gray-800">
              {getStatusText(status)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {status === "safe"
                ? "所有验算项均满足要求，支撑体系安全可靠。"
                : status === "warning"
                ? "部分验算项接近临界值，建议适当调整参数增加安全储备。"
                : `发现 ${failedChecks.length} 项验算不通过，请调整参数后重试。`}
            </div>
          </div>
        </div>
      </div>

      {failedChecks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle size={16} />
            <span>不满足项 ({failedChecks.length})</span>
          </div>
          <div className="space-y-3">
            {failedChecks.map((check) => (
              <CheckItemCard key={check.id} check={check} />
            ))}
          </div>
        </div>
      )}

      {warningChecks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <AlertCircle size={16} />
            <span>临界项 ({warningChecks.length})</span>
          </div>
          <div className="space-y-3">
            {warningChecks.map((check) => (
              <CheckItemCard key={check.id} check={check} />
            ))}
          </div>
        </div>
      )}

      {checks.filter((c) => c.passed && c.safetyFactor / c.requiredFactor >= 1.1)
        .length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Lightbulb size={16} />
            <span>通过项</span>
          </div>
          <div className="space-y-3">
            {checks
              .filter((c) => c.passed && c.safetyFactor / c.requiredFactor >= 1.1)
              .map((check) => (
                <CheckItemCard key={check.id} check={check} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
