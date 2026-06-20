import { useMemo, useState } from "react";
import {
  X,
  GraduationCap,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  BarChart3,
  Target,
  BookOpenCheck,
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { KEY_POINTS } from "@/types";
import type { ClassSummaryGroup } from "@/types";

interface ClassSummaryPanelProps {
  onClose: () => void;
}

export function ClassSummaryPanel({ onClose }: ClassSummaryPanelProps) {
  const { archives, getClassSummary, getStudentShortcomings } = usePracticeStore();

  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [filterScenario, setFilterScenario] = useState<string>("all");

  const summary = useMemo(() => getClassSummary(), [getClassSummary]);

  const filteredGroups = useMemo(() => {
    return summary.groups.filter((g) => {
      if (filterClass !== "all" && g.className !== filterClass) return false;
      if (filterBatch !== "all" && g.batchId !== filterBatch) return false;
      if (filterScenario !== "all" && g.scenarioId !== filterScenario) return false;
      return true;
    });
  }, [summary.groups, filterClass, filterBatch, filterScenario]);

  const overallStats = useMemo(() => {
    const all = filteredGroups;
    const totalStudents = all.reduce((s, g) => s + g.totalStudents, 0);
    const totalPassed = all.reduce((s, g) => s + g.passedCount, 0);
    const totalWarning = all.reduce((s, g) => s + g.warningCount, 0);
    const totalDanger = all.reduce((s, g) => s + g.dangerCount, 0);
    const avgAdj =
      totalStudents > 0
        ? all.reduce((s, g) => s + g.avgAdjustments * g.totalStudents, 0) / totalStudents
        : 0;
    const avgFactor =
      totalStudents > 0
        ? all.reduce((s, g) => s + g.avgSafetyFactor * g.totalStudents, 0) / totalStudents
        : 0;
    const avgScore =
      totalStudents > 0
        ? all.reduce((s, g) => s + g.avgScore * g.totalStudents, 0) /
          totalStudents
        : 0;

    const riskMap = new Map<string, { name: string; count: number; students: number }>();
    all.forEach((g) => {
      g.topRisks.forEach((r) => {
        if (!riskMap.has(r.checkId)) {
          riskMap.set(r.checkId, { name: r.checkName, count: 0, students: 0 });
        }
        const item = riskMap.get(r.checkId)!;
        item.count += r.totalOccurrences;
        item.students += r.studentCount;
      });
    });
    const topRisks = Array.from(riskMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalStudents,
      totalPassed,
      totalWarning,
      totalDanger,
      passRate: totalStudents > 0 ? totalPassed / totalStudents : 0,
      avgAdj: Math.round(avgAdj * 10) / 10,
      avgFactor: Math.round(avgFactor * 100) / 100,
      avgScore: Math.round(avgScore * 10) / 10,
      topRisks,
      groups: all,
    };
  }, [filteredGroups]);

  const handleExportCSV = () => {
    if (archives.length === 0) return;

    const rows: string[][] = [];
    rows.push(["===== 班级汇总：单条练习记录 ====="]);
    rows.push([
      "存档ID",
      "存档时间",
      "学生姓名",
      "班级",
      "作业批次",
      "批改老师",
      "场景名称",
      "立杆纵距(mm)",
      "立杆横距(mm)",
      "步距(mm)",
      "板厚(mm)",
      "木方间距(mm)",
      "施工荷载(kN/m²)",
      "最终安全系数",
      "最终状态",
      "调整次数",
      "练习时长(秒)",
      "老师评分",
      "老师评语",
      "反复卡住风险",
      "未解决风险",
      "主要短板-风险项",
      "主要短板-知识点",
    ]);

    archives.forEach((a) => {
      const shortcomings = getStudentShortcomings(a);
      const stuckRisks = a.riskSummary
        .filter((r) => !r.resolved || r.count >= 3)
        .map((r) => `${r.checkName}(${r.count}次${r.resolved ? ",已解" : ",未解"})`)
        .join("; ");
      const unresolved = a.riskSummary
        .filter((r) => !r.resolved)
        .map((r) => r.checkName)
        .join("; ");

      rows.push([
        a.id,
        new Date(a.archivedAt).toLocaleString("zh-CN"),
        a.studentInfo.name,
        a.studentInfo.className || "",
        a.studentInfo.batchId || "",
        a.teacherName || "",
        a.scenarioName,
        String(a.currentParams.poleSpacingX),
        String(a.currentParams.poleSpacingY),
        String(a.currentParams.stepDistance),
        String(a.currentParams.slabThickness),
        String(a.currentParams.woodSpacing),
        String(a.currentParams.constructionLoad),
        a.finalSafetyFactor.toFixed(2),
        a.finalStatus === "safe" ? "通过" : a.finalStatus === "warning" ? "临界" : "不通过",
        String(a.actualAdjustmentCount),
        String(Math.round(a.practiceDuration / 1000)),
        a.teacherFeedback.score > 0 ? String(a.teacherFeedback.score) : "",
        a.teacherFeedback.comment.replace(/\n/g, " "),
        stuckRisks,
        unresolved,
        shortcomings.risks.join("; "),
        shortcomings.weakPoints.join("; "),
      ]);
    });

    rows.push([]);
    rows.push(["===== 班级汇总：分组统计（按班级+作业批次+场景） ====="]);
    rows.push([
      "班级",
      "作业批次",
      "场景",
      "学生人数",
      "通过人数",
      "临界人数",
      "不通过人数",
      "通过率",
      "平均调整次数",
      "平均安全系数",
      "平均评分",
      "常见风险TOP5",
      "需加强知识点",
    ]);

    filteredGroups.forEach((g) => {
      const weakPoints = g.masteryStats
        .filter((m) => m.needsWorkCount > 0)
        .sort((a, b) => b.needsWorkCount - a.needsWorkCount)
        .map((m) => `${m.keyPointLabel}(${m.needsWorkCount}人)`)
        .join("; ");

      rows.push([
        g.className,
        g.batchId,
        g.scenarioName,
        String(g.totalStudents),
        String(g.passedCount),
        String(g.warningCount),
        String(g.dangerCount),
        `${(g.passRate * 100).toFixed(1)}%`,
        String(g.avgAdjustments),
        String(g.avgSafetyFactor),
        g.avgScore > 0 ? String(g.avgScore) : "",
        g.topRisks.map((r) => `${r.checkName}(${r.totalOccurrences}次/${r.studentCount}人)`).join("; "),
        weakPoints || "无",
      ]);
    });

    rows.push([]);
    rows.push(["===== 班级汇总：学生短板明细 ====="]);
    rows.push(["学生姓名", "班级", "作业批次", "场景", "主要风险短板", "主要知识点短板"]);

    archives.forEach((a) => {
      const shortcomings = getStudentShortcomings(a);
      rows.push([
        a.studentInfo.name,
        a.studentInfo.className || "",
        a.studentInfo.batchId || "",
        a.scenarioName,
        shortcomings.risks.join("; "),
        shortcomings.weakPoints.join("; "),
      ]);
    });

    const csv =
      "\uFEFF" +
      rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const now = new Date();
    const ts =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");
    link.download = `模板支撑班级汇总_${ts}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderGroupCard = (g: ClassSummaryGroup) => (
    <div key={g.groupKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap size={20} className="text-indigo-600" />
          <div>
            <div className="font-semibold text-gray-800 text-sm">
              {g.className} <span className="text-gray-400 mx-1">|</span> {g.batchId}
            </div>
            <div className="text-xs text-gray-500">{g.scenarioName}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">共 {g.totalStudents} 人</div>
          <div className="text-xs">
            <span className="text-emerald-600 font-semibold">{g.passedCount}人通过</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-amber-600">{g.warningCount}人临界</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-red-600">{g.dangerCount}人未通过</span>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-100">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">通过率</div>
          <div
            className={`text-2xl font-bold font-mono ${
              g.passRate >= 0.7
                ? "text-emerald-600"
                : g.passRate >= 0.4
                ? "text-amber-600"
                : "text-red-600"
            }`}
          >
            {(g.passRate * 100).toFixed(0)}%
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">平均调整次数</div>
          <div className="text-2xl font-bold font-mono text-blue-600">
            {g.avgAdjustments}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">平均安全系数</div>
          <div
            className={`text-2xl font-bold font-mono ${
              g.avgSafetyFactor >= 1.15 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {g.avgSafetyFactor.toFixed(2)}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-xs text-gray-500 mb-1">平均评分</div>
          <div className="text-2xl font-bold font-mono text-indigo-600">
            {g.avgScore > 0 ? `${g.avgScore}分` : "—"}
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-amber-700">
            <AlertTriangle size={14} />
            常见风险项（TOP5）
          </div>
          {g.topRisks.length === 0 ? (
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> 整体表现较好，无集中风险项
            </div>
          ) : (
            <div className="space-y-1.5">
              {g.topRisks.map((r) => (
                <div
                  key={r.checkId}
                  className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100 text-xs"
                >
                  <span className="font-medium text-gray-700">{r.checkName}</span>
                  <span className="text-gray-500">
                    {r.totalOccurrences}次 / {r.studentCount}人
                    {r.unresolvedCount > 0 && (
                      <span className="text-red-600 ml-1">({r.unresolvedCount}未解)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-indigo-700">
            <BookOpenCheck size={14} />
            知识点掌握情况
          </div>
          <div className="space-y-1">
            {g.masteryStats.map((m) => {
              const total = m.masteredCount + m.partialCount + m.needsWorkCount;
              const masteredPct = total > 0 ? (m.masteredCount / total) * 100 : 0;
              return (
                <div key={m.keyPointId} className="text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-gray-700">{m.keyPointLabel}</span>
                    <span className="text-gray-500 font-mono">
                      ✅{m.masteredCount} ⚠️{m.partialCount} ❌{m.needsWorkCount}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${masteredPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-gray-700">
          <Users size={14} />
          学生短板明细（{g.studentShortcomings.length}人）
        </div>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 text-gray-600 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">学生</th>
                <th className="px-2 py-1.5 text-left font-medium">主要风险短板</th>
                <th className="px-2 py-1.5 text-left font-medium">知识点短板</th>
              </tr>
            </thead>
            <tbody>
              {g.studentShortcomings.map((s, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-2 py-1.5 font-medium text-gray-700">{s.studentName}</td>
                  <td className="px-2 py-1.5 text-red-600">{s.risks.join("、")}</td>
                  <td className="px-2 py-1.5 text-amber-600">{s.weakPoints.join("、")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-scale-in">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="text-indigo-600" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">班级练习汇总</h2>
              <p className="text-xs text-gray-500">
                按班级、作业批次和场景统计通过率、常见风险和知识点掌握情况
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={archives.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              导出汇总CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {archives.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <GraduationCap size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">暂无存档记录</p>
              <p className="text-xs mt-1">先保存几份学生练习，再来查看班级汇总</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={20} className="text-indigo-600" />
                  <h3 className="font-semibold text-indigo-800">筛选条件</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      班级
                    </label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">全部班级</option>
                      {summary.allClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      作业批次
                    </label>
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">全部批次</option>
                      {summary.allBatches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      练习场景
                    </label>
                    <select
                      value={filterScenario}
                      onChange={(e) => setFilterScenario(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">全部场景</option>
                      {summary.allScenarios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-1">参与学生</div>
                  <div className="text-3xl font-bold font-mono text-indigo-600">
                    {overallStats.totalStudents}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">人</div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-1">整体通过率</div>
                  <div
                    className={`text-3xl font-bold font-mono ${
                      overallStats.passRate >= 0.7
                        ? "text-emerald-600"
                        : overallStats.passRate >= 0.4
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {(overallStats.passRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    通过{overallStats.totalPassed}/临界{overallStats.totalWarning}/未过
                    {overallStats.totalDanger}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-1">平均调整次数</div>
                  <div className="text-3xl font-bold font-mono text-blue-600">
                    {overallStats.avgAdj}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">次/人</div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-1">平均安全系数</div>
                  <div
                    className={`text-3xl font-bold font-mono ${
                      overallStats.avgFactor >= 1.15 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {overallStats.avgFactor.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    要求 ≥ 1.15
                  </div>
                </div>
              </div>

              {overallStats.topRisks.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-amber-800">
                      全班级常见风险项（建议重点复习）
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {overallStats.topRisks.map((r) => (
                      <div
                        key={r.name}
                        className="p-3 bg-white/80 rounded-lg border border-amber-200 text-center"
                      >
                        <div className="text-sm font-medium text-gray-800 mb-1">
                          {r.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          共{r.count}次 / {r.students}人受影响
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-gray-600" />
                  <h3 className="font-semibold text-gray-800">
                    分组统计详情（共 {filteredGroups.length} 组）
                  </h3>
                </div>
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                    没有符合筛选条件的分组
                  </div>
                ) : (
                  <div className="space-y-4">{filteredGroups.map(renderGroupCard)}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
