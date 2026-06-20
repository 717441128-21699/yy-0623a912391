import { useMemo } from "react";
import { RotateCcw, Sliders } from "lucide-react";
import { ParamSlider } from "./ParamSlider";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";
import type { ParamKey } from "@/types";

export function ParamControls() {
  const { currentScenarioId, currentParams, currentResult, resetToDefault } =
    usePracticeStore();

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

  const failedParams = useMemo(() => {
    if (!currentResult) return new Set<ParamKey>();
    const failed = new Set<ParamKey>();
    currentResult.checks.forEach((check) => {
      if (!check.passed) {
        check.affectedParams.forEach((p) => failed.add(p));
      }
    });
    return failed;
  }, [currentResult]);

  const paramKeys: ParamKey[] = [
    "poleSpacingX",
    "poleSpacingY",
    "stepDistance",
    "slabThickness",
    "woodSpacing",
    "constructionLoad",
  ];

  if (!scenario || !currentParams) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="text-primary-600" size={20} />
          <h3 className="font-semibold text-gray-800">参数调整</h3>
        </div>
        <button
          onClick={resetToDefault}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          <span>重置参数</span>
        </button>
      </div>

      <div className="space-y-3">
        {paramKeys.map((key) => (
          <ParamSlider
            key={key}
            paramKey={key}
            ranges={scenario.paramRanges}
            value={currentParams[key]}
            highlight={failedParams.has(key)}
          />
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="text-xs text-blue-700">
          <span className="font-medium">💡 提示：</span>
          红色/黄色高亮的参数会影响当前不满足的验算项，调整这些参数可以快速改善安全系数。
        </div>
      </div>
    </div>
  );
}
