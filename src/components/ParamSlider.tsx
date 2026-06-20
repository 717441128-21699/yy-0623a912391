import { useCallback, useMemo } from "react";
import { Info } from "lucide-react";
import type { ParamKey, ParamRanges } from "@/types";
import { PARAM_INFO } from "@/types";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";

interface ParamSliderProps {
  paramKey: ParamKey;
  ranges: ParamRanges;
  value: number;
  highlight?: boolean;
}

export function ParamSlider({ paramKey, ranges, value, highlight }: ParamSliderProps) {
  const { updateParam, currentScenarioId } = usePracticeStore();
  const info = PARAM_INFO[paramKey];
  const [min, max, step] = ranges[paramKey];

  const percentage = useMemo(() => {
    return ((value - min) / (max - min)) * 100;
  }, [value, min, max]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      updateParam(paramKey, newValue);
    },
    [paramKey, updateParam]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        updateParam(paramKey, newValue);
      }
    },
    [paramKey, updateParam]
  );

  const scenario = currentScenarioId ? getScenarioById(currentScenarioId) : null;
  const defaultValue = scenario?.defaultParams[paramKey];

  const isDefault = defaultValue !== undefined && Math.abs(value - defaultValue) < step / 2;

  const ticks = useMemo(() => {
    const tickCount = 5;
    return Array.from({ length: tickCount + 1 }, (_, i) => min + (i * (max - min)) / tickCount);
  }, [min, max]);

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-300 ${
        highlight
          ? "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{info.label}</span>
            <div className="group relative">
              <Info size={14} className="text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 z-10">
                {info.description}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">范围: {min}-{max} {info.unit}</div>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            className="w-20 px-2 py-1 text-right font-mono text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500 w-10">{info.unit}</span>
        </div>
      </div>

      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-primary-600 rounded-full shadow-md pointer-events-none transition-all duration-200"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>

      <div className="flex justify-between mt-2 px-1">
        {ticks.map((tick, i) => (
          <div key={i} className="text-[10px] text-gray-400 font-mono">
            {tick}
          </div>
        ))}
      </div>

      {!isDefault && defaultValue !== undefined && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span className="text-primary-600">●</span>
          <span>推荐值: {defaultValue} {info.unit}</span>
        </div>
      )}
    </div>
  );
}
