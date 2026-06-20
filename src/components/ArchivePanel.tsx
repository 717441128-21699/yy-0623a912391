import { useState, useMemo } from "react";
import {
  X,
  FolderOpen,
  Trash2,
  Upload,
  Download,
  Search,
  User,
  Calendar,
  FileText,
  Filter,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePracticeStore } from "@/store/usePracticeStore";
import { usePracticeStore as usePracticeStoreType } from "@/store/usePracticeStore";
import { PARAM_INFO, KEY_POINTS } from "@/types";
import type { PracticeArchive } from "@/types";

interface ArchivePanelProps {
  onClose: () => void;
}

export function ArchivePanel({ onClose }: ArchivePanelProps) {
  const {
    archives,
    studentInfo,
    teacherName,
    setStudentInfo,
    setTeacherName,
    saveCurrentAsArchive,
    deleteArchive,
    loadArchive,
    clearArchives,
    activeArchiveTab,
    setActiveArchiveTab,
    getStudentShortcomings,
  } = usePracticeStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterScenario, setFilterScenario] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scenarios = useMemo(() => {
    const set = new Set(archives.map((a) => a.scenarioId));
    return Array.from(set);
  }, [archives]);

  const classes = useMemo(() => {
    const set = new Set(archives.map((a) => a.studentInfo.className).filter(Boolean));
    return Array.from(set);
  }, [archives]);

  const filteredArchives = useMemo(() => {
    return archives.filter((a) => {
      if (searchQuery && !a.studentInfo.name.includes(searchQuery)) return false;
      if (filterScenario !== "all" && a.scenarioId !== filterScenario) return false;
      if (filterClass !== "all" && a.studentInfo.className !== filterClass) return false;
      return true;
    });
  }, [archives, searchQuery, filterScenario, filterClass]);

  const handleSave = () => {
    if (!studentInfo.name.trim()) {
      setSaveMessage("请先填写学生姓名");
      setTimeout(() => setSaveMessage(""), 2000);
      return;
    }
    const result = saveCurrentAsArchive();
    if (result) {
      setSaveMessage("✅ 存档成功！");
      setTimeout(() => setSaveMessage(""), 2000);
    } else {
      setSaveMessage("存档失败，请检查学生信息是否完整");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const handleExportCSV = () => {
    if (archives.length === 0) return;

    const headers = [
      "存档时间",
      "学生姓名",
      "班级",
      "作业批次",
      "老师姓名",
      "练习场景",
      "最终状态",
      "最终安全系数",
      "调整次数",
      "练习时长(秒)",
      "老师评分",
      "主要风险项",
      "已解决风险数",
      "未解决风险数",
      "立杆纵距",
      "立杆横距",
      "步距",
      "板厚",
      "木方间距",
      "施工荷载",
      "主要短板-风险项",
      "主要短板-知识点",
      "教师评语",
    ];

    const rows = archives.map((a) => {
      const durationSec = Math.round(a.practiceDuration / 1000);
      const resolvedCount = a.riskSummary.filter((r) => r.resolved).length;
      const unresolvedCount = a.riskSummary.filter((r) => !r.resolved).length;
      const risks = a.riskSummary.map((r) => `${r.checkName}(${r.count}次)`).join("; ");
      const shortcomings = getStudentShortcomings(a);
      return [
        new Date(a.archivedAt).toLocaleString("zh-CN"),
        a.studentInfo.name,
        a.studentInfo.className,
        a.studentInfo.batchId,
        a.teacherName,
        a.scenarioName,
        a.finalStatus === "safe" ? "通过" : a.finalStatus === "warning" ? "临界" : "不通过",
        a.finalSafetyFactor.toFixed(2),
        a.actualAdjustmentCount,
        durationSec,
        a.teacherFeedback.score,
        risks,
        resolvedCount,
        unresolvedCount,
        a.currentParams.poleSpacingX,
        a.currentParams.poleSpacingY,
        a.currentParams.stepDistance,
        a.currentParams.slabThickness,
        a.currentParams.woodSpacing,
        a.currentParams.constructionLoad,
        shortcomings.risks.join("; "),
        shortcomings.weakPoints.join("; "),
        a.teacherFeedback.comment.replace(/\n/g, " "),
      ];
    });

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `模板支撑练习数据_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getMasteryLabel = (status?: string) => {
    switch (status) {
      case "mastered":
        return "已掌握";
      case "partial":
        return "基本掌握";
      case "needs-work":
        return "需加强";
      default:
        return "未评";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FolderOpen className="text-primary-600" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">练习存档管理</h2>
              <p className="text-xs text-gray-500">保存和管理学生练习记录，支持本地持久化存储</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {[
            { id: "current", label: "保存当前练习", icon: Upload },
            { id: "list", label: `存档记录 (${archives.length})`, icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveArchiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeArchiveTab === tab.id
                  ? "text-primary-600 border-primary-600 bg-primary-50/50"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeArchiveTab === "current" && (
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <User size={18} />
                  学生与作业信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      学生姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentInfo.name}
                      onChange={(e) => setStudentInfo({ name: e.target.value })}
                      placeholder="请输入学生姓名"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      班级
                    </label>
                    <input
                      type="text"
                      value={studentInfo.className}
                      onChange={(e) => setStudentInfo({ className: e.target.value })}
                      placeholder="如：建工2023-1班"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      作业批次
                    </label>
                    <input
                      type="text"
                      value={studentInfo.batchId}
                      onChange={(e) => setStudentInfo({ batchId: e.target.value })}
                      placeholder="如：第3次作业 / 2024秋期中考"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      批改老师
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="请输入老师姓名"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {saveMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    saveMessage.includes("成功")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {saveMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md shadow-primary-200"
                >
                  <Upload size={18} />
                  保存当前练习到存档
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={archives.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  导出全部存档为CSV
                </button>
                {archives.length > 0 && (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="flex items-center gap-2 px-5 py-2.5 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={18} />
                    清空全部存档
                  </button>
                )}
              </div>

              {showConfirmClear && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 mb-3">
                    <AlertCircle size={18} />
                    <span className="font-medium">确定要清空全部 {archives.length} 条存档吗？此操作不可恢复。</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        clearArchives();
                        setShowConfirmClear(false);
                      }}
                      className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    >
                      确认清空
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                💡 提示：存档数据保存在浏览器本地存储（localStorage）中，清除浏览器数据会导致存档丢失。建议定期导出CSV备份。
              </div>
            </div>
          )}

          {activeArchiveTab === "list" && (
            <div className="p-6">
              {archives.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FolderOpen size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无存档记录</p>
                  <p className="text-xs mt-1">先在"保存当前练习"标签页填写信息并保存</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索学生姓名..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-gray-400" />
                      <select
                        value={filterScenario}
                        onChange={(e) => setFilterScenario(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="all">全部场景</option>
                        {scenarios.map((s) => (
                          <option key={s} value={s}>
                            {archives.find((a) => a.scenarioId === s)?.scenarioName || s}
                          </option>
                        ))}
                      </select>
                      {classes.length > 0 && (
                        <select
                          value={filterClass}
                          onChange={(e) => setFilterClass(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="all">全部班级</option>
                          {classes.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    显示 {filteredArchives.length} / {archives.length} 条记录
                  </div>

                  <div className="space-y-3">
                    {filteredArchives.map((archive: PracticeArchive) => (
                      <div
                        key={archive.id}
                        className="border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition-colors"
                      >
                        <div className="p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-800 text-base">
                                  {archive.studentInfo.name}
                                </span>
                                {archive.studentInfo.className && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                    {archive.studentInfo.className}
                                  </span>
                                )}
                                {archive.studentInfo.batchId && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                    {archive.studentInfo.batchId}
                                  </span>
                                )}
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    archive.finalStatus === "safe"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : archive.finalStatus === "warning"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {archive.finalStatus === "safe"
                                    ? "✅ 通过"
                                    : archive.finalStatus === "warning"
                                    ? "⚠️ 临界"
                                    : "❌ 不通过"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {formatDateTime(archive.archivedAt)}
                                </span>
                                <span>📘 {archive.scenarioName}</span>
                                <span>
                                  📊 安全系数{" "}
                                  <span className="font-mono font-semibold text-gray-700">
                                    {archive.finalSafetyFactor.toFixed(2)}
                                  </span>
                                </span>
                                <span>🔄 调整 {archive.actualAdjustmentCount} 次</span>
                                <span>
                                  ⭐ {archive.teacherFeedback.score > 0 ? `${archive.teacherFeedback.score}分` : "未评分"}
                                </span>
                                {archive.teacherName && <span>👤 {archive.teacherName}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                              <button
                                onClick={() => loadArchive(archive.id)}
                                className="p-2 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors"
                                title="加载该存档"
                              >
                                <FileText size={16} />
                              </button>
                              <button
                                onClick={() => setExpandedId(expandedId === archive.id ? null : archive.id)}
                                className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                title="展开详情"
                              >
                                {expandedId === archive.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <button
                                onClick={() => deleteArchive(archive.id)}
                                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {expandedId === archive.id && (
                          <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50 pt-3 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              <div className="p-2 bg-white rounded border border-gray-100">
                                <div className="text-gray-500">立杆纵距</div>
                                <div className="font-mono font-semibold text-gray-800">
                                  {archive.currentParams.poleSpacingX}mm
                                </div>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-100">
                                <div className="text-gray-500">立杆横距</div>
                                <div className="font-mono font-semibold text-gray-800">
                                  {archive.currentParams.poleSpacingY}mm
                                </div>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-100">
                                <div className="text-gray-500">步距</div>
                                <div className="font-mono font-semibold text-gray-800">
                                  {archive.currentParams.stepDistance}mm
                                </div>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-100">
                                <div className="text-gray-500">板厚</div>
                                <div className="font-mono font-semibold text-gray-800">
                                  {archive.currentParams.slabThickness}mm
                                </div>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-100">
                                <div className="text-gray-500">木方间距</div>
                                <div className="font-mono font-semibold text-gray-800">
                                  {archive.currentParams.woodSpacing}mm
                                </div>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-100">
                                <div className="text-gray-500">施工荷载</div>
                                <div className="font-mono font-semibold text-gray-800">
                                  {archive.currentParams.constructionLoad} kN/m²
                                </div>
                              </div>
                            </div>

                            {archive.riskSummary.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-1">风险总结</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {archive.riskSummary.map((r) => (
                                    <span
                                      key={r.checkId}
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        r.resolved
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {r.resolved ? "✅" : "⚠️"} {r.checkName} ({r.count}次)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Object.keys(archive.teacherFeedback.mastery).length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-1">知识点掌握</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {KEY_POINTS.map((kp) => {
                                    const status = archive.teacherFeedback.mastery[kp.id];
                                    if (!status) return null;
                                    return (
                                      <span
                                        key={kp.id}
                                        className={`text-xs px-2 py-0.5 rounded-full ${
                                          status === "mastered"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : status === "partial"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {kp.label}：{getMasteryLabel(status)}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {archive.teacherFeedback.comment && (
                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-1">教师评语</div>
                                <div className="text-xs text-gray-600 p-2 bg-white rounded border border-gray-100">
                                  {archive.teacherFeedback.comment}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md shadow-primary-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
