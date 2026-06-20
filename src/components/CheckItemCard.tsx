import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Link,
  MoveVertical,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { CheckItem } from "@/types";
import { PARAM_INFO } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  MoveVertical,
  Link,
  ArrowRightLeft,
};

interface CheckItemCardProps {
  check: CheckItem;
}

export function CheckItemCard({ check }: CheckItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconMap[check.icon] || AlertTriangle;

  const getBarColor = () => {
    const ratio = check.safetyFactor / check.requiredFactor;
    if (ratio >= 1.1) return "bg-emerald-500";
    if (ratio >= 0.95) return "bg-amber-500";
    return "bg-red-500";
  };

  const getBgColor = () => {
    if (check.passed) return "bg-emerald-50 border-emerald-200";
    return "bg-red-50 border-red-200";
  };

  const getStatusIcon = () => {
    const ratio = check.safetyFactor / check.requiredFactor;
    if (ratio >= 1.1)
      return <CheckCircle2 size={18} className="text-emerald-600" />;
    if (ratio >= 0.95)
      return <AlertTriangle size={18} className="text-amber-600" />;
    return <XCircle size={18} className="text-red-600" />;
  };

  const barPercentage = Math.min(
    100,
    (check.safetyFactor / check.requiredFactor) * 80
  );

  return (
    <div
      className={`rounded-xl border transition-all duration-300 ${getBgColor()} ${
        !check.passed ? "animate-pulse-danger" : ""
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div
          className={`p-2 rounded-lg ${
            check.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{check.name}</span>
            {getStatusIcon()}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {check.description}
          </p>
        </div>

        <div className="text-right">
          <div className="font-mono font-bold text-lg">
            <span
              className={
                check.passed ? "text-emerald-700" : "text-red-700"
              }
            >
              {check.safetyFactor.toFixed(2)}
            </span>
            <span className="text-gray-400 text-sm font-normal">
              {" "}
              / {check.requiredFactor}
            </span>
          </div>
          <div className="text-xs text-gray-500">安全系数</div>
        </div>

        {expanded ? (
          <ChevronUp size={20} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      <div className="px-4 pb-4">
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} rounded-full transition-all duration-500`}
            style={{ width: `${barPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          <span>0</span>
          <span>要求值 {check.requiredFactor}</span>
          <span>2.0+</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-slide-up">
          <div className="p-3 bg-white rounded-lg border border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-1">💡 通俗解释</div>
            <p className="text-sm text-gray-600">{check.plainExplanation}</p>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">
              影响参数：
            </div>
            <div className="flex flex-wrap gap-2">
              {check.affectedParams.map((param) => (
                <span
                  key={param}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {PARAM_INFO[param].label}
                </span>
              ))}
            </div>
          </div>

          {!check.passed && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-sm font-medium text-amber-800 mb-1">
                🔧 调整建议
              </div>
              <p className="text-xs text-amber-700">
                尝试减小
                {check.affectedParams
                  .filter(
                    (p) =>
                      p === "poleSpacingX" ||
                      p === "poleSpacingY" ||
                      p === "stepDistance" ||
                      p === "woodSpacing" ||
                      p === "constructionLoad"
                  )
                  .map((p) => PARAM_INFO[p].label)
                  .join("、")}
                ，或增大其他相关参数来提高安全系数。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
