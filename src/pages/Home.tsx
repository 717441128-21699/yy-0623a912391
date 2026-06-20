import { useState } from "react";
import {
  HardHat,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Users,
  Save,
  Download,
  FolderOpen,
  BarChart3,
} from "lucide-react";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { SectionDiagram } from "@/components/SectionDiagram";
import { ParamControls } from "@/components/ParamControls";
import { SafetyGauge } from "@/components/SafetyGauge";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ArchivePanel } from "@/components/ArchivePanel";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { ClassSummaryPanel } from "@/components/ClassSummaryPanel";
import { usePracticeStore } from "@/store/usePracticeStore";
import { getScenarioById } from "@/utils/scenarioData";
import { useMemo } from "react";

export default function Home() {
  const {
    showSummary,
    setShowSummary,
    currentScenarioId,
    adjustmentHistory,
    getActualAdjustmentCount,
    showArchivePanel,
    setShowArchivePanel,
    showComparisonPanel,
    setShowComparisonPanel,
    showClassSummaryPanel,
    setShowClassSummaryPanel,
  } = usePracticeStore();
  const [showHelp, setShowHelp] = useState(false);

  const scenario = useMemo(
    () => (currentScenarioId ? getScenarioById(currentScenarioId) : null),
    [currentScenarioId]
  );

  const canShowSummary = adjustmentHistory.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg shadow-primary-200">
                <HardHat className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  模板支撑安全教学练习平台
                </h1>
                <p className="text-xs text-gray-500">
                  互动式学习模板支撑验算逻辑
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {scenario && (
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <BookOpen size={16} className="text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">
                    当前场景: {scenario.name}
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowArchivePanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="存档管理"
              >
                <FolderOpen size={18} />
                <span className="hidden sm:inline">存档</span>
              </button>
              <button
                onClick={() => setShowComparisonPanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="学生对比"
              >
                <Users size={18} />
                <span className="hidden sm:inline">对比</span>
              </button>
              <button
                onClick={() => setShowClassSummaryPanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="班级汇总"
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline">汇总</span>
              </button>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <HelpCircle size={20} />
              </button>
              <button
                onClick={() => canShowSummary && setShowSummary(true)}
                disabled={!canShowSummary}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  canShowSummary
                    ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <ClipboardList size={18} />
                <span className="hidden sm:inline">查看小结</span>
              </button>
            </div>
          </div>

          {showHelp && (
            <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-slide-up">
              <div className="text-sm text-blue-800">
                <span className="font-semibold">💡 使用说明：</span>
                先从左侧选择练习场景，然后通过调整中间区域的参数（可拖动滑块或直接输入数值），观察右侧安全系数和验算结果的变化。当验算不通过时，点击展开不满足项查看通俗解释和调整建议。完成练习后可点击"查看小结"回顾整个学习过程。
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <ScenarioSelector />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <SectionDiagram />
            </div>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="animate-fade-in">
                <SafetyGauge />
              </div>
              <div className="animate-fade-in bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <ClipboardList size={18} className="text-primary-600" />
                  调整统计
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">累计调整次数</span>
                    <span className="font-mono font-bold text-lg text-primary-600">
                      {getActualAdjustmentCount()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">最佳安全系数</span>
                    <span className="font-mono font-bold text-lg text-emerald-600">
                      {Math.max(
                        ...adjustmentHistory.map((r) => r.result.overallSafetyFactor)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="text-xs text-gray-500">
                    每次参数变动都会被记录，可在练习小结中查看完整调整过程。
                  </div>
                </div>
              </div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <ParamControls />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <ExplanationPanel />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 bg-white/50">
        <div className="max-w-[1800px] mx-auto px-4">
          <div className="text-center text-sm text-gray-500">
            <p>
              本平台为教学演示用途，验算模型已简化，实际工程请严格遵循相关规范
            </p>
            <p className="mt-1 text-xs text-gray-400">
              参考规范: 《建筑施工模板安全技术规范》JGJ162-2008
            </p>
          </div>
        </div>
      </footer>

      {showSummary && <SummaryPanel onClose={() => setShowSummary(false)} />}
      {showArchivePanel && (
        <ArchivePanel onClose={() => setShowArchivePanel(false)} />
      )}
      {showComparisonPanel && (
        <ComparisonPanel onClose={() => setShowComparisonPanel(false)} />
      )}
      {showClassSummaryPanel && (
        <ClassSummaryPanel onClose={() => setShowClassSummaryPanel(false)} />
      )}
    </div>
  );
}
