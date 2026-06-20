import { Building2, Layers, Ruler, Star } from "lucide-react";
import type { Scenario, Difficulty } from "@/types";
import { SCENARIOS } from "@/utils/scenarioData";
import { usePracticeStore } from "@/store/usePracticeStore";

const iconMap: Record<string, React.ElementType> = {
  Building2,
  Layers,
  Ruler,
};

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: "入门", className: "bg-green-100 text-green-700" },
  medium: { label: "进阶", className: "bg-amber-100 text-amber-700" },
  hard: { label: "挑战", className: "bg-red-100 text-red-700" },
};

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onClick: () => void;
}

function ScenarioCard({ scenario, isSelected, onClick }: ScenarioCardProps) {
  const Icon = iconMap[scenario.icon] || Layers;
  const difficulty = difficultyConfig[scenario.difficulty];

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? "border-primary-600 bg-primary-50 shadow-md"
          : "border-gray-200 bg-white hover:border-primary-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={`p-2 rounded-lg ${
            isSelected ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          <Icon size={20} />
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficulty.className}`}
        >
          {difficulty.label}
        </span>
      </div>
      <h3 className="font-semibold text-gray-800 mb-1">{scenario.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{scenario.description}</p>
      <div className="mt-3 flex items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < (scenario.difficulty === "easy" ? 1 : scenario.difficulty === "medium" ? 2 : 3)
                ? "text-amber-500 fill-amber-500"
                : "text-gray-300"
            }
          />
        ))}
      </div>
    </button>
  );
}

export function ScenarioSelector() {
  const { currentScenarioId, setScenario } = usePracticeStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="text-primary-600" size={20} />
        <h2 className="text-lg font-semibold text-gray-800">练习场景</h2>
      </div>
      <div className="space-y-3">
        {SCENARIOS.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isSelected={currentScenarioId === scenario.id}
            onClick={() => setScenario(scenario.id)}
          />
        ))}
      </div>
    </div>
  );
}
