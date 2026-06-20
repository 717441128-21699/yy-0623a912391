import { useMemo } from "react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";
import type { CalculationParams } from "@/types";

interface DiagramProps {
  params: CalculationParams;
  diagramType: "slab" | "beam";
  isDanger: boolean;
}

function SlabDiagram({ params, isDanger }: Omit<DiagramProps, "diagramType">) {
  const { poleSpacingX, poleSpacingY, stepDistance, slabThickness, woodSpacing } = params;

  const scale = 0.15;
  const diagramWidth = 500;
  const diagramHeight = 400;
  const centerX = diagramWidth / 2;
  const groundY = diagramHeight - 30;
  const slabTopY = 60;
  const slabBottomY = slabTopY + slabThickness * scale;

  const poleLeftX = centerX - (poleSpacingX * scale) / 2;
  const poleRightX = centerX + (poleSpacingX * scale) / 2;
  const poleHeight = groundY - slabBottomY;
  const numSteps = Math.floor(poleHeight / (stepDistance * scale));

  return (
    <svg viewBox={`0 0 ${diagramWidth} ${diagramHeight}`} className="w-full h-auto">
      <defs>
        <pattern id="concrete" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="#d4d4d4" />
          <circle cx="2" cy="2" r="0.5" fill="#9ca3af" />
          <circle cx="5" cy="5" r="0.5" fill="#9ca3af" />
        </pattern>
        <pattern id="wood" patternUnits="userSpaceOnUse" width="4" height="10">
          <rect width="4" height="10" fill="#d97706" />
          <line x1="0" y1="3" x2="4" y2="3" stroke="#b45309" strokeWidth="0.5" />
          <line x1="0" y1="7" x2="4" y2="7" stroke="#b45309" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="slabGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      <rect x="0" y={groundY} width={diagramWidth} height="30" fill="#525252" />
      <text x="10" y={groundY + 20} className="text-xs fill-white">
        地面
      </text>

      <rect
        x="50"
        y={slabTopY}
        width={diagramWidth - 100}
        height={slabBottomY - slabTopY}
        fill="url(#slabGradient)"
        stroke="#4b5563"
        strokeWidth="1"
      />
      <text x="10" y={slabTopY + 20} className="text-xs fill-gray-600 font-medium">
        {slabThickness}mm 板
      </text>

      {isDanger && (
        <rect
          x="50"
          y={slabTopY}
          width={diagramWidth - 100}
          height={slabBottomY - slabTopY}
          fill="#ef4444"
          fillOpacity="0.3"
          className="animate-pulse-danger"
        />
      )}

      {[...Array(5)].map((_, i) => {
        const x = 60 + i * (diagramWidth - 120) / 4;
        return (
          <rect
            key={i}
            x={x - 4}
            y={slabBottomY}
            width="8"
            height="12"
            fill="url(#wood)"
          />
        );
      })}

      <line
        x1="60"
        y1={slabBottomY + 12}
        x2={diagramWidth - 60}
        y2={slabBottomY + 12}
        stroke="#d97706"
        strokeWidth="10"
      />

      {[...Array(numSteps + 1)].map((_, i) => {
        const y = groundY - i * stepDistance * scale;
        return (
          <line
            key={i}
            x1={poleLeftX}
            y1={y}
            x2={poleRightX}
            y2={y}
            stroke="#6b7280"
            strokeWidth="4"
          />
        );
      })}

      {[poleLeftX, poleRightX].map((x, i) => (
        <g key={i}>
          <line
            x1={x}
            y1={slabBottomY + 20}
            x2={x}
            y2={groundY}
            stroke="#6b7280"
            strokeWidth="6"
          />
          <circle cx={x} cy={slabBottomY + 20} r="5" fill="#1e3a8a" />
        </g>
      ))}

      <g stroke="#374151" strokeWidth="0.5" fill="none">
        <line x1={poleLeftX} y1={slabBottomY + 35} x2={poleLeftX} y2={slabBottomY + 55} />
        <line x1={poleRightX} y1={slabBottomY + 35} x2={poleRightX} y2={slabBottomY + 55} />
        <line
          x1={poleLeftX}
          y1={slabBottomY + 45}
          x2={poleRightX}
          y2={slabBottomY + 45}
          markerEnd="url(#arrow)"
          markerStart="url(#arrow)"
        />
        <defs>
          <marker
            id="arrow"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
          </marker>
        </defs>
        <text
          x={centerX}
          y={slabBottomY + 65}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          纵距 {poleSpacingX}mm
        </text>
      </g>

      <g stroke="#374151" strokeWidth="0.5" fill="none">
        <line x1={poleRightX + 20} y1={groundY - stepDistance * scale} x2={poleRightX + 40} y2={groundY - stepDistance * scale} />
        <line x1={poleRightX + 20} y1={groundY} x2={poleRightX + 40} y2={groundY} />
        <line
          x1={poleRightX + 30}
          y1={groundY - stepDistance * scale}
          x2={poleRightX + 30}
          y2={groundY}
          markerEnd="url(#arrow2)"
          markerStart="url(#arrow2)"
        />
        <defs>
          <marker
            id="arrow2"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
          </marker>
        </defs>
        <text
          x={poleRightX + 45}
          y={groundY - stepDistance * scale / 2}
          className="text-xs fill-gray-600"
        >
          步距 {stepDistance}mm
        </text>
      </g>

      <g className="text-[10px] fill-gray-500">
        <text x={diagramWidth - 100} y={30}>木方间距 {woodSpacing}mm</text>
        <text x={diagramWidth - 100} y={45}>横距 {poleSpacingY}mm</text>
      </g>
    </svg>
  );
}

function BeamDiagram({ params, isDanger }: Omit<DiagramProps, "diagramType">) {
  const { poleSpacingX, poleSpacingY, stepDistance, slabThickness, woodSpacing } = params;

  const scale = 0.12;
  const diagramWidth = 500;
  const diagramHeight = 450;
  const centerX = diagramWidth / 2;
  const groundY = diagramHeight - 30;
  const beamTopY = 80;
  const beamHeight = slabThickness * scale;
  const beamBottomY = beamTopY + beamHeight;
  const beamWidth = 120;

  const poleLeftX = centerX - (poleSpacingX * scale) / 2;
  const poleRightX = centerX + (poleSpacingX * scale) / 2;
  const poleHeight = groundY - beamBottomY;
  const numSteps = Math.floor(poleHeight / (stepDistance * scale));

  return (
    <svg viewBox={`0 0 ${diagramWidth} ${diagramHeight}`} className="w-full h-auto">
      <defs>
        <pattern id="concrete2" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="#d4d4d4" />
          <circle cx="2" cy="2" r="0.5" fill="#9ca3af" />
          <circle cx="5" cy="5" r="0.5" fill="#9ca3af" />
        </pattern>
        <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      <rect x="0" y={groundY} width={diagramWidth} height="30" fill="#525252" />
      <text x="10" y={groundY + 20} className="text-xs fill-white">
        地面
      </text>

      <rect
        x="50"
        y={beamTopY - 20}
        width={diagramWidth - 100}
        height="20"
        fill="url(#beamGradient)"
        stroke="#4b5563"
        strokeWidth="1"
      />
      <text x="10" y={beamTopY - 5} className="text-xs fill-gray-600">
        楼板
      </text>

      <rect
        x={centerX - beamWidth / 2}
        y={beamTopY}
        width={beamWidth}
        height={beamHeight}
        fill="url(#beamGradient)"
        stroke="#4b5563"
        strokeWidth="1"
      />
      <text x="10" y={beamTopY + 30} className="text-xs fill-gray-600 font-medium">
        {slabThickness}mm 梁
      </text>

      {isDanger && (
        <rect
          x={centerX - beamWidth / 2}
          y={beamTopY}
          width={beamWidth}
          height={beamHeight}
          fill="#ef4444"
          fillOpacity="0.3"
          className="animate-pulse-danger"
        />
      )}

      {[...Array(4)].map((_, i) => {
        const x = centerX - beamWidth / 2 + 20 + i * 25;
        return (
          <rect
            key={i}
            x={x - 5}
            y={beamBottomY}
            width="10"
            height="15"
            fill="#d97706"
          />
        );
      })}

      <line
        x1={centerX - beamWidth / 2}
        y1={beamBottomY + 15}
        x2={centerX + beamWidth / 2}
        y2={beamBottomY + 15}
        stroke="#d97706"
        strokeWidth="12"
      />

      {[...Array(numSteps + 1)].map((_, i) => {
        const y = groundY - i * stepDistance * scale;
        return (
          <line
            key={i}
            x1={poleLeftX}
            y1={y}
            x2={poleRightX}
            y2={y}
            stroke="#6b7280"
            strokeWidth="5"
          />
        );
      })}

      {[poleLeftX, poleRightX].map((x, i) => (
        <g key={i}>
          <line
            x1={x}
            y1={beamBottomY + 25}
            x2={x}
            y2={groundY}
            stroke="#6b7280"
            strokeWidth="8"
          />
          <circle cx={x} cy={beamBottomY + 25} r="6" fill="#1e3a8a" />
        </g>
      ))}

      {[poleLeftX - 30, poleRightX + 30].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={beamBottomY + 35} x2={x} y2={groundY} stroke="#9ca3af" strokeWidth="3" strokeDasharray="5,5" />
        </g>
      ))}

      <g stroke="#374151" strokeWidth="0.5" fill="none">
        <line x1={poleLeftX} y1={beamBottomY + 50} x2={poleLeftX} y2={beamBottomY + 75} />
        <line x1={poleRightX} y1={beamBottomY + 50} x2={poleRightX} y2={beamBottomY + 75} />
        <line x1={poleLeftX} y1={beamBottomY + 62} x2={poleRightX} y2={beamBottomY + 62} markerEnd="url(#arrow3)" markerStart="url(#arrow3)" />
        <defs>
          <marker id="arrow3" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
          </marker>
        </defs>
        <text x={centerX} y={beamBottomY + 88} textAnchor="middle" className="text-xs fill-gray-600">
          纵距 {poleSpacingX}mm
        </text>
      </g>

      <g className="text-[10px] fill-gray-500">
        <text x={diagramWidth - 100} y={40}>木方间距 {woodSpacing}mm</text>
        <text x={diagramWidth - 100} y={55}>横距 {poleSpacingY}mm</text>
        <text x={diagramWidth - 100} y={70}>步距 {stepDistance}mm</text>
      </g>
    </svg>
  );
}

export function SectionDiagram() {
  const { currentScenarioId, currentParams, currentResult } = usePracticeStore();

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

  if (!scenario || !currentParams || !currentResult) return null;

  const isDanger = currentResult.status === "danger";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">剖面图示意</h3>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>混凝土: {scenario.knownConditions.concreteGrade}</span>
          <span>钢管: {scenario.knownConditions.tubeType}</span>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-2 overflow-hidden">
        {scenario.diagramType === "slab" ? (
          <SlabDiagram params={currentParams} isDanger={isDanger} />
        ) : (
          <BeamDiagram params={currentParams} isDanger={isDanger} />
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500">模板厚度</div>
          <div className="font-semibold text-gray-800">{scenario.knownConditions.templateThickness}mm</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500">木方规格</div>
          <div className="font-semibold text-gray-800">{scenario.knownConditions.woodType}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500">钢筋等级</div>
          <div className="font-semibold text-gray-800">{scenario.knownConditions.steelGrade}</div>
        </div>
      </div>
    </div>
  );
}
