import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import { 
  analyzeArchetype, 
  generateHeuristicTalentDiagnostic, 
  getRoleTargetProfile, 
  analyzeOuterLayer,
  getStatDisplay,
  getCorporateArchetypePersona
} from '../../utils/archetypeEngine';

const Icon = ({ name, ...props }) => {
  const LucideIcon = lucide[name];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default function AITalentAdvisorModal({ isOpen, onClose, staff, sets = {}, archetypesData, initialViewMode = 'rpg' }) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode); // 'rpg' | 'corporate'

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
    }
  }, [isOpen, initialViewMode]);

  useEffect(() => {
    if (!isOpen || !staff) {
      setDiagnostic(null);
      return;
    }

    const runAnalysis = async () => {
      setLoading(true);
      const roleProfile = getRoleTargetProfile(staff.role || staff.classId || sets?.staffClasses?.find?.(c => c.id === staff.classId));
      const archAnalysis = analyzeArchetype(staff, sets, archetypesData);

      // 1. Initial immediate heuristic diagnostic (zero latency baseline anchored in BARS Rubrics)
      const heuristic = generateHeuristicTalentDiagnostic(staff, sets, archetypesData);
      setDiagnostic(heuristic);

      // 2. Attempt AI fetch from backend with fallback
      try {
        const stats = {
          str: Number(staff.str) || 5,
          agi: Number(staff.agi) || 5,
          dex: Number(staff.dex) || 5,
          int: Number(staff.int) || 5,
          con: Number(staff.con) || 5,
          sen: Number(staff.sen) || 5
        };

        const outerSummary = analyzeOuterLayer(staff, stats);
        const featurePacket = {
          subInsights: heuristic?.subInsights || archAnalysis.subInsights,
          statInteractions: archAnalysis.statInteractions,
          roleFitPct: archAnalysis.roleFitPct,
          outerSummary,
          corporatePersona: heuristic?.corporatePersona,
          primaryBarsStrength: heuristic?.primaryBarsStrength,
          primaryBarsDevelopment: heuristic?.primaryBarsDevelopment,
          primaryBarsNextMilestone: heuristic?.primaryBarsNextMilestone
        };

        const res = await fetch('/api/talent-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff,
            stats,
            roleName: roleProfile.name,
            archAnalysis,
            featurePacket
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDiagnostic(prev => ({
              ...prev,
              ...json.data,
              // Preserve BARS anchors if AI omitted them
              subInsights: prev?.subInsights || heuristic?.subInsights,
              primaryBarsStrength: prev?.primaryBarsStrength || heuristic?.primaryBarsStrength,
              primaryBarsDevelopment: prev?.primaryBarsDevelopment || heuristic?.primaryBarsDevelopment,
              primaryBarsNextMilestone: prev?.primaryBarsNextMilestone || heuristic?.primaryBarsNextMilestone,
              corporatePersona: prev?.corporatePersona || heuristic?.corporatePersona,
              corporateTierName: prev?.corporateTierName || heuristic?.corporateTierName
            }));
          }
        }
      } catch (err) {
        console.warn('AI Service unavailable, keeping heuristic baseline:', err);
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const roleProfile = getRoleTargetProfile(staff.role || staff.classId || sets?.staffClasses?.find?.(c => c.id === staff.classId));
  const archAnalysis = analyzeArchetype(staff, sets, archetypesData) || {};
  const tier = archAnalysis.competencyTier || {};
  const isCorporate = viewMode === 'corporate';

  const displayPersonaTitle = isCorporate 
    ? (diagnostic?.corporatePersona?.title || getCorporateArchetypePersona(archAnalysis.archetypeKey, archAnalysis.mainStyle).title)
    : archAnalysis.mainStyle;

  const displayTierName = isCorporate 
    ? (diagnostic?.corporateTierName || (tier.level === 4 ? 'Benchmark Role Model' : tier.level === 3 ? 'Advanced Professional' : tier.level === 2 ? 'Standard Competent' : 'Developing Associate'))
    : `${tier.name} (${tier.thai || ''})`;

  const handleCopy = () => {
    if (!diagnostic) return;
    const headerTitle = isCorporate 
      ? `=== รายงานประเมินสมรรถนะบุคลากรเชิงวิชาชีพ (Corporate Competency Assessment) ===`
      : `=== บทวิเคราะห์ศักยภาพตัวละคร & สเตตัส (RPG Talent Card) ===`;

    const text = `${headerTitle}\n` +
      `ชื่อ: ${staff.name} | ตำแหน่ง: ${roleProfile.name}\n` +
      `บทบาท/สไตล์: ${displayPersonaTitle}\n` +
      `ระดับสมรรถนะ: ${displayTierName}\n` +
      `ความสอดคล้องกับบทบาท (Role-Fit): ${diagnostic.roleFitPct}%\n\n` +
      `[ภาพรวมการวินิจฉัยศักยภาพ]\n${diagnostic.overallVerdict}\n\n` +
      `[จุดเด่นเชิงประจักษ์ (Verified BARS Strengths)]\n${diagnostic.verifiedStrengths}\n\n` +
      `[จุดความเสี่ยงหน้างาน & ข้อควรระวัง (Operational Risks)]\n${diagnostic.operationalRisks}\n\n` +
      `[แนวทางการบริหารจัดการและมอบหมายงาน (Manager Action Playbook)]\n${diagnostic.managerActionPlan}\n\n` +
      `[คำถามโค้ชชิ่ง 1-on-1]\n${(diagnostic.coachingQuestions || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n` +
      `[เป้าหมายการเติบโต 30-60 วัน (Growth Milestone)]\n${diagnostic.nextGrowthMilestone}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#0f172a] border border-amber-500/30 w-full max-w-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl p-0.5 shadow-md shrink-0 ${isCorporate ? 'bg-gradient-to-tr from-sky-500 to-blue-400' : 'bg-gradient-to-tr from-amber-500 to-amber-300'}`}>
              {staff.image ? (
                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover rounded-[10px]" />
              ) : (
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-300 font-bold text-sm">
                  {(staff.name || 'TH').substring(0, 2)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base leading-tight">{staff.name}</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${isCorporate ? 'text-sky-300 bg-sky-950/80 border-sky-700' : (tier.badgeColor || 'text-sky-300 bg-sky-950/60 border-sky-800')}`}>
                  {displayTierName}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {roleProfile.name} • <span className={isCorporate ? 'text-sky-300 font-semibold' : 'text-[#e6d0a7] font-semibold'}>{displayPersonaTitle}</span>
              </p>
            </div>
          </div>

          {/* Dual View Toggle & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-700/80 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('rpg')}
                className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                  viewMode === 'rpg' 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองแบบเกมจำลองสเตตัส (RPG Character Sheet)"
              >
                <Icon name="gamepad2" size={12} />
                <span>RPG</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('corporate')}
                className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                  viewMode === 'corporate' 
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองแบบสมรรถนะองค์กรและผู้บริหาร (Corporate Competency)"
              >
                <Icon name="briefcase" size={12} />
                <span>Corporate</span>
              </button>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="flex items-center gap-1.5 text-amber-400 animate-pulse">
                <Icon name="loader2" size={12} className="animate-spin" /> กำลังประมวลผลบทวิเคราะห์ด้วย Gemini AI...
              </span>
            ) : diagnostic?.source === 'gemini' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ✨ บทวิเคราะห์ประมวลผลโดย Google Gemini AI (Dynamic LLM)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                🧠 ประมวลผลโดย Talent Diagnostic Engine (BARS Behavioral Standard)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            <Icon name={copied ? "check" : "copy"} size={11} className={copied ? "text-emerald-400" : ""} />
            <span>{copied ? "คัดลอกแล้ว" : (isCorporate ? "คัดลอกรายงานผู้บริหาร" : "คัดลอกผลสรุป")}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300 custom-scrollbar">
          {diagnostic ? (
            <>
              {/* Overall Verdict */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900 border border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Icon name="sparkles" size={14} />
                    <span>
                      {isCorporate ? 'ภาพรวมความพร้อมเชิงวิชาชีพ (Professional Readiness Verdict)' : 'ภาพรวมความพร้อม & การวินิจฉัยศักยภาพ (Executive Verdict)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Role Fit: {diagnostic.roleFitPct}%
                  </span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed mt-1 font-medium">
                  {diagnostic.overallVerdict}
                </p>
              </div>

              {/* Behavioral Anchors (BARS) Spotlight Card */}
              {(diagnostic.primaryBarsStrength || diagnostic.primaryBarsNextMilestone) && (
                <div className="p-3.5 rounded-xl bg-sky-950/25 border border-sky-800/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-300 font-bold text-xs flex items-center gap-1.5">
                      <Icon name="target" size={14} className="text-sky-400" />
                      <span>เกณฑ์พฤติกรรมอ้างอิงจริง (Behaviorally Anchored Rating Scales - BARS)</span>
                    </span>
                    <span className="text-[10px] text-sky-400/80 bg-sky-900/40 px-2 py-0.5 rounded">
                      ดึงจาก rubrics.json 180 ระดับ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {/* BARS Strength */}
                    {diagnostic.primaryBarsStrength && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <Icon name="checkCircle" size={12} />
                            <span>พฤติกรรมเด่นสูงสุด (Level {diagnostic.primaryBarsStrength.level}/10)</span>
                          </span>
                          <span className="text-[9px] font-bold text-emerald-300/80">
                            {isCorporate ? diagnostic.primaryBarsStrength.corporateName : diagnostic.primaryBarsStrength.statName}
                          </span>
                        </div>
                        <p className="text-slate-200 text-[11px] leading-relaxed italic">
                          "{diagnostic.primaryBarsStrength.behaviorText}"
                        </p>
                        <span className="text-[9.5px] text-slate-400 block mt-1">
                          ด้าน: {diagnostic.primaryBarsStrength.criterionLabel}
                        </span>
                      </div>
                    )}

                    {/* BARS Next Milestone Target */}
                    {diagnostic.primaryBarsNextMilestone && (
                      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                            <Icon name="trendingUp" size={12} />
                            <span>เป้าหมายพฤติกรรมถัดไป (Level {diagnostic.primaryBarsNextMilestone.targetLevel}/10)</span>
                          </span>
                          <span className="text-[9px] font-bold text-amber-300/80">
                            {isCorporate ? diagnostic.primaryBarsNextMilestone.corporateName : diagnostic.primaryBarsNextMilestone.statName}
                          </span>
                        </div>
                        <p className="text-slate-200 text-[11px] leading-relaxed italic">
                          "{diagnostic.primaryBarsNextMilestone.behaviorText}"
                        </p>
                        <span className="text-[9.5px] text-slate-400 block mt-1">
                          ด้าน: {diagnostic.primaryBarsNextMilestone.criterionLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verified Strengths vs Risks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Verified Strengths */}
                <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1.5">
                    <Icon name="checkCircle2" size={14} />
                    <span>{isCorporate ? 'สมรรถนะเด่นที่พิสูจน์ได้ (Core Strengths)' : 'จุดเด่นจริงที่พิสูจน์ได้ (Verified Strengths)'}</span>
                  </div>
                  <p className="text-emerald-100/90 text-xs leading-relaxed flex-1 whitespace-pre-line">
                    {diagnostic.verifiedStrengths}
                  </p>
                </div>

                {/* Operational Risks */}
                <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1.5">
                    <Icon name="alertTriangle" size={14} />
                    <span>{isCorporate ? 'ความเสี่ยงเชิงปฏิบัติการ & จุดควรพัฒนา (Operational Risks)' : 'ความเสี่ยงหน้างาน & จุดควรระวัง (Operational Risks)'}</span>
                  </div>
                  <p className="text-rose-100/90 text-xs leading-relaxed flex-1 whitespace-pre-line">
                    {diagnostic.operationalRisks}
                  </p>
                </div>
              </div>

              {/* Manager Playbook & Action */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Icon name="briefcase" size={14} />
                  <span>{isCorporate ? 'แผนบริหารจัดการและการมอบหมายงาน (Manager Action Plan)' : 'แนวทางการบริหาร & มอบหมายงาน (Manager Action Playbook)'}</span>
                </div>
                <p className="text-slate-200 text-xs whitespace-pre-line leading-relaxed">
                  {diagnostic.managerActionPlan}
                </p>

                {/* 1-on-1 Coaching Questions */}
                {diagnostic.coachingQuestions && diagnostic.coachingQuestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-800/40">
                    <span className="text-[11px] font-bold text-indigo-400 block mb-1">
                      💬 คำถามที่หัวหน้าควรใช้คุย 1-on-1 โค้ชชิ่งหน้างาน:
                    </span>
                    <ul className="space-y-1 pl-3 text-slate-300">
                      {diagnostic.coachingQuestions.map((q, idx) => (
                        <li key={idx} className="list-disc list-outside leading-snug">
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 30-Day Growth Milestone */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="flag" size={14} />
                </div>
                <div>
                  <strong className="text-amber-300 text-xs block font-bold">
                    {isCorporate ? 'เป้าหมายการพัฒนาตนเอง 30–60 วัน (Growth Milestone):' : 'เป้าหมายการเติบโต 30–60 วัน (Growth Milestone):'}
                  </strong>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed whitespace-pre-line">
                    {diagnostic.nextGrowthMilestone}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <Icon name="loader2" size={32} className="animate-spin mx-auto mb-2 text-amber-400" />
              <span>กำลังเตรียมข้อมูลการประเมิน...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center gap-2">
          <div className="text-[11px] text-slate-400">
            โหมดปัจจุบัน: <strong className={isCorporate ? 'text-sky-400' : 'text-amber-400'}>{isCorporate ? 'Corporate Competency View (ผู้บริหาร/HR)' : 'RPG View (หน้างาน)'}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
