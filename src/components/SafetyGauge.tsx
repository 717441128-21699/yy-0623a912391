import { useMemo } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getStatusColor, getStatusText } from "@/utils/calculationEngine";
import type { SafetyStatus } from "@/types";

interface GaugeSegment {
  startAngle: number;
  endAngle: number;
  color: string;
  status: SafetyStatus;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export function SafetyGauge() {
  const { currentResult } = usePracticeStore();

  const { overallSafetyFactor, status } = currentResult || {
    overallSafetyFactor: 0,
    status: "danger" as SafetyStatus,
  };

  const segments: GaugeSegment[] = useMemo(
    () => [
      { startAngle: 135, endAngle: 183, color: "#DC2626", status: "danger" },
      { startAngle: 183, endAngle: 231, color: "#F59E0B", status: "warning" },
      { startAngle: 231, endAngle: 405, color: "#059669", status: "safe" },
    ],
    []
  );

  const pointerAngle = useMemo(() => {
    const factor = Math.max(0, Math.min(2, overallSafetyFactor));
    return 135 + (factor / 2) * 270;
  }, [overallSafetyFactor]);

  const StatusIcon =
    status === "safe" ? ShieldCheck : status === "warning" ? AlertTriangle : ShieldAlert;

  const color = getStatusColor(status);
  const statusText = getStatusText(status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <StatusIcon size={20} />
        </div>
        <h3 className="font-semibold text-gray-800">安全系数</h3>
      </div>

      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full max-w-[280px]">
          {segments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(100, 100, 70, seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeLinecap="round"
              opacity="0.3"
            />
          ))}

          {segments.map((seg, i) => (
            <path
              key={`active-${i}`}
              d={describeArc(100, 100, 70, seg.startAngle, Math.min(seg.endAngle, pointerAngle))}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeLinecap="round"
              style={{
                opacity: pointerAngle > seg.startAngle ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />
          ))}

          <line
            x1="100"
            y1="100"
            x2={polarToCartesian(100, 100, 55, pointerAngle).x}
            y2={polarToCartesian(100, 100, 55, pointerAngle).y}
            stroke="#1f2937"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
          <circle cx="100" cy="100" r="8" fill="#1f2937" />
          <circle cx="100" cy="100" r="4" fill="white" />

          <text x="25" y="115" className="text-[10px] fill-gray-400" textAnchor="start">
            0.0
          </text>
          <text x="100" y="18" className="text-[10px] fill-gray-400" textAnchor="middle">
            1.0
          </text>
          <text x="175" y="115" className="text-[10px] fill-gray-400" textAnchor="end">
            2.0
          </text>
        </svg>

        <div className="absolute bottom-2 text-center">
          <div
            className="text-4xl font-bold font-mono transition-colors duration-300"
            style={{ color }}
          >
            {overallSafetyFactor.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">相对安全系数</div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <StatusIcon size={18} style={{ color }} />
          <span className="font-medium" style={{ color }}>
            {statusText}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          需 ≥ <span className="font-semibold text-gray-700">1.00</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>危险</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>临界</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>安全</span>
          </div>
        </div>
      </div>
    </div>
  );
}
