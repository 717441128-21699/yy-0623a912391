import { useMemo } from "react";
import {
  AlertCircle,
  BookOpen,
  Lightbulb,
  ArrowDown,
  ArrowUp,
  Zap,
  ListOrdered,
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { CheckItemCard } from "./CheckItemCard";
import {
  getStatusBgClass,
  getStatusText,
  getPrioritySuggestions,
} from "@/utils/calculationEngine";
import { getScenarioById } from "@/utils/scenarioData";

export function ExplanationPanel() {
  const { currentResult, currentScenarioId, currentParams } = usePracticeStore();

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

  if (!currentResult || !scenario || !currentParams) return null;

  const { status, checks } = currentResult;

  const sortedFailedChecks = useMemo(() => {
    return checks
      .filter((c) => !c.passed)
      .sort((a, b) => a.safetyFactor / a.requiredFactor - b.safetyFactor / b.requiredFactor);
  }, [checks]);

  const warningChecks = checks.filter(
    (c) => c.passed && c.safetyFactor / c.requiredFactor < 1.1
  );
  const passedChecks = checks.filter((c) => c.passed && c.safetyFactor / c.requiredFactor >= 1.1);

  const prioritySuggestions = useMemo(() => {
    return getPrioritySuggestions(currentParams, scenario.paramRanges);
  }, [currentParams, scenario]);

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
                : `发现 ${sortedFailedChecks.length} 项验算不通过，请按下方优先级调整参数。`}
            </div>
          </div>
        </div>
      </div>

      {prioritySuggestions.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-red-500 rounded-lg">
              <ListOrdered size={16} className="text-white" />
            </div>
            <div className="font-semibold text-red-800">优先调整顺序</div>
          </div>
          <div className="space-y-2">
            {prioritySuggestions.map((suggestion) => {
              const ArrowIcon = suggestion.topAction.direction === "decrease" ? ArrowDown : ArrowUp;
              return (
                <div
                  key={suggestion.checkId}
                  className="flex items-center gap-3 p-2 bg-white rounded-lg border border-red-100"
                >
                  <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {suggestion.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {suggestion.checkName}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Zap size={10} className="text-amber-500" />
                      <span className="font-medium text-amber-700">最有效：</span>
                      <ArrowIcon size={10} className="text-red-500" />
                      <span>{suggestion.topAction.description}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono font-bold text-emerald-600">
                      +{suggestion.topAction.estimatedImprovement.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-400">预计提升</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedFailedChecks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle size={16} />
            <span>不满足项 ({sortedFailedChecks.length})</span>
          </div>
          <div className="space-y-3">
            {sortedFailedChecks.map((check, index) => (
              <CheckItemCard
                key={check.id}
                check={check}
                currentParams={currentParams}
                paramRanges={scenario.paramRanges}
                rank={index + 1}
              />
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
              <CheckItemCard
                key={check.id}
                check={check}
                currentParams={currentParams}
                paramRanges={scenario.paramRanges}
              />
            ))}
          </div>
        </div>
      )}

      {passedChecks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Lightbulb size={16} />
            <span>通过项 ({passedChecks.length})</span>
          </div>
          <div className="space-y-3">
            {passedChecks.map((check) => (
              <CheckItemCard
                key={check.id}
                check={check}
                currentParams={currentParams}
                paramRanges={scenario.paramRanges}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
