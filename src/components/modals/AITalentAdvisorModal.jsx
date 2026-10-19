import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as lucide from 'lucide-react';
import { 
  analyzeArchetype, 
  generateHeuristicTalentDiagnostic, 
  getRoleTargetProfile, 
  analyzeOuterLayer,
  getStatDisplay,
  getCorporateArchetypePersona,
  aggregateStaffTaskTelemetry
} from '../../utils/archetypeEngine';

const Icon = ({ name, ...props }) => {
  const LucideIcon = lucide[name];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default function AITalentAdvisorModal({ 
  isOpen, 
  onClose, 
  staff, 
  sets = {}, 
  tasks = [],
  evalMonth = '',
  telemetry: propTelemetry = null,
  archetypesData, 
  initialViewMode = 'rpg' 
}) {
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

        const telemetry = propTelemetry || (staff && tasks && tasks.length ? aggregateStaffTaskTelemetry(staff, tasks, sets, evalMonth) : null);
        const outerSummary = analyzeOuterLayer(staff, stats, { telemetry });
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
  if (typeof document === 'undefined') return null;

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

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-[#070D18] border border-amber-500/25 w-full max-w-5xl lg:max-w-6xl rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh] text-left">
        
        {/* Executive Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#0A1222] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#7A1C28] shadow-[0_0_10px_rgba(122,28,40,0.8)]"></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-sm sm:text-base leading-tight tracking-wide flex items-center gap-1.5">
                  <Icon name="sparkles" size={15} className="text-[#C5A059]" />
                  <span>AI TALENT STRATEGY ADVISOR</span>
                </h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isCorporate ? 'text-sky-300 bg-sky-950/80 border-sky-700' : 'text-amber-300 bg-amber-950/80 border-amber-700'}`}>
                  {displayTierName}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {staff.name} • {roleProfile.name} • <span className={isCorporate ? 'text-sky-300 font-semibold' : 'text-[#e6d0a7] font-semibold'}>{displayPersonaTitle}</span>
              </p>
            </div>
          </div>

          {/* Dual View Toggle & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/40 p-0.5 rounded-full border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('rpg')}
                className={`px-3 py-1 rounded-full font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'rpg' 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองแบบจำลองสเตตัส (RPG Mode)"
              >
                <Icon name="gamepad2" size={12} />
                <span>RPG</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('corporate')}
                className={`px-3 py-1 rounded-full font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'corporate' 
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองสมรรถนะองค์กรผู้บริหาร (Corporate Mode)"
              >
                <Icon name="briefcase" size={12} />
                <span>Corporate</span>
              </button>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="ปิด"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2 bg-[#060A14] border-b border-white/10 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="flex items-center gap-1.5 text-amber-400 animate-pulse font-medium">
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
            className="text-slate-300 hover:text-white flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer shadow-2xs"
          >
            <Icon name={copied ? "check" : "copy"} size={11} className={copied ? "text-emerald-400" : "text-[#C5A059]"} />
            <span>{copied ? "คัดลอกแล้ว" : (isCorporate ? "คัดลอกรายงานผู้บริหาร" : "คัดลอกผลสรุป")}</span>
          </button>
        </div>

        {/* Split Body: Pinned Hero Studio (Left) + Scrollable Intelligence (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Pinned Hero Studio Profile (35%) */}
          <div className="w-full md:w-[35%] lg:w-[34%] bg-gradient-to-b from-[#0B1528] via-[#070D18] to-[#04070D] border-b md:border-b-0 md:border-r border-white/10 p-5 flex flex-col justify-between shrink-0 relative overflow-hidden text-center">
            {/* Studio Keylight Glow */}
            <div className="absolute inset-0 pointer-events-none select-none">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-[70px]"></div>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-32 bg-[#7A1C28]/15 rounded-full blur-[80px]"></div>
            </div>

            {/* Staff Cutout Avatar Stage with Architectural Pedestal */}
            <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[240px] max-h-[320px] my-auto">
              {staff.image ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center group">
                  {/* Luxury Smoked-Glass Base Pedestal */}
                  <div className="absolute bottom-2 w-3/4 max-w-[220px] h-9 bg-gradient-to-t from-black/80 via-white/5 to-transparent rounded-[50%] border-t border-white/20 shadow-[0_15px_30px_rgba(0,0,0,0.9)] pointer-events-none"></div>
                  <div className="absolute bottom-3 w-2/3 max-w-[190px] h-2 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent rounded-full blur-[2px] pointer-events-none"></div>
                  <div className="absolute bottom-4 w-1/2 max-w-[150px] h-3 bg-black/80 blur-md rounded-full pointer-events-none"></div>
                  
                  <img
                    src={staff.image}
                    alt={staff.name}
                    className="max-w-[85%] max-h-[88%] object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] drop-shadow-[0_0_20px_rgba(197,160,89,0.2)] transition-transform duration-500 group-hover:scale-105 relative z-10 select-none pointer-events-none"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-3xl font-black text-[#C5A059] shadow-2xl">
                  {(staff.name || 'TH').substring(0, 2)}
                </div>
              )}
            </div>

            {/* Identity Card & Role-Fit Meter */}
            <div className="relative z-10 w-full mt-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-2">
              <div>
                <h4 className="text-white font-black text-base truncate">{staff.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{roleProfile.name}</p>
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isCorporate ? 'text-sky-300 bg-sky-950/80 border-sky-700' : 'text-[#e6d0a7] bg-[#bca374]/20 border-[#bca374]/40'}`}>
                  {displayTierName}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {displayPersonaTitle}
                </span>
              </div>

              {/* Role-fit score gauge */}
              {diagnostic && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs px-1">
                  <span className="text-slate-400 font-medium text-[11px]">ความสอดคล้องบทบาท:</span>
                  <span className="font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                    Role Fit: {diagnostic.roleFitPct}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scrollable Executive Intelligence Stream (65%) */}
          <div className="w-full md:w-[65%] lg:w-[66%] p-4 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300 custom-scrollbar bg-[#060A14]/70">
            {diagnostic ? (
              <>
                {/* Overall Verdict */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#0B1528] to-[#070D18] border border-amber-500/30 shadow-card">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-[#C5A059] font-bold text-xs uppercase tracking-wide">
                      <Icon name="sparkles" size={14} />
                      <span>
                        {isCorporate ? 'ภาพรวมความพร้อมเชิงวิชาชีพ (Professional Readiness Verdict)' : 'ภาพรวมความพร้อม & การวินิจฉัยศักยภาพ (Executive Verdict)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Match: {diagnostic.roleFitPct}%
                    </span>
                  </div>
                  <p className="text-slate-100 text-sm leading-relaxed mt-1 font-medium">
                    {diagnostic.overallVerdict}
                  </p>
                </div>

                {/* Behavioral Anchors (BARS) Spotlight Card */}
                {(diagnostic.primaryBarsStrength || diagnostic.primaryBarsNextMilestone) && (
                  <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sky-300 font-bold text-xs flex items-center gap-1.5">
                        <Icon name="target" size={14} className="text-sky-400" />
                        <span>เกณฑ์พฤติกรรมอ้างอิงจริง (Behaviorally Anchored Rating Scales - BARS)</span>
                      </span>
                      <span className="text-[10px] text-sky-400/80 bg-sky-900/40 px-2 py-0.5 rounded border border-sky-700/40 font-mono">
                        rubrics.json 180 ระดับ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* BARS Strength */}
                      {diagnostic.primaryBarsStrength && (
                        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                <Icon name="checkCircle" size={12} />
                                <span>พฤติกรรมเด่นสูงสุด (Lv. {diagnostic.primaryBarsStrength.level}/10)</span>
                              </span>
                              <span className="text-[9px] font-bold text-emerald-300/80">
                                {isCorporate ? diagnostic.primaryBarsStrength.corporateName : diagnostic.primaryBarsStrength.statName}
                              </span>
                            </div>
                            <p className="text-slate-200 text-[11px] leading-relaxed italic bg-emerald-950/20 p-2 rounded border border-emerald-800/20">
                              "{diagnostic.primaryBarsStrength.behaviorText}"
                            </p>
                          </div>
                          <span className="text-[9.5px] text-slate-400 block mt-2">
                            ด้าน: {diagnostic.primaryBarsStrength.criterionLabel}
                          </span>
                        </div>
                      )}

                      {/* BARS Next Milestone Target */}
                      {diagnostic.primaryBarsNextMilestone && (
                        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                                <Icon name="trendingUp" size={12} />
                                <span>เป้าหมายพฤติกรรมถัดไป (Lv. {diagnostic.primaryBarsNextMilestone.targetLevel}/10)</span>
                              </span>
                              <span className="text-[9px] font-bold text-amber-300/80">
                                {isCorporate ? diagnostic.primaryBarsNextMilestone.corporateName : diagnostic.primaryBarsNextMilestone.statName}
                              </span>
                            </div>
                            <p className="text-slate-200 text-[11px] leading-relaxed italic bg-amber-950/20 p-2 rounded border border-amber-800/20">
                              "{diagnostic.primaryBarsNextMilestone.behaviorText}"
                            </p>
                          </div>
                          <span className="text-[9.5px] text-slate-400 block mt-2">
                            ด้าน: {diagnostic.primaryBarsNextMilestone.criterionLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Verified Strengths vs Risks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Verified Strengths */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-800/50 flex flex-col">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1.5">
                      <Icon name="checkCircle2" size={14} />
                      <span>{isCorporate ? 'สมรรถนะเด่นที่พิสูจน์ได้ (Core Strengths)' : 'จุดเด่นจริงที่พิสูจน์ได้ (Verified Strengths)'}</span>
                    </div>
                    <p className="text-emerald-100/90 text-xs leading-relaxed flex-1 whitespace-pre-line">
                      {diagnostic.verifiedStrengths}
                    </p>
                  </div>

                  {/* Operational Risks */}
                  <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-800/50 flex flex-col">
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
                <div className="p-4 rounded-xl bg-indigo-950/25 border border-indigo-800/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wide">
                    <Icon name="briefcase" size={14} />
                    <span>{isCorporate ? 'แผนบริหารจัดการและการมอบหมายงาน (Manager Action Plan)' : 'แนวทางการบริหาร & มอบหมายงาน (Manager Action Playbook)'}</span>
                  </div>
                  <p className="text-slate-200 text-xs whitespace-pre-line leading-relaxed">
                    {diagnostic.managerActionPlan}
                  </p>

                  {/* 1-on-1 Coaching Questions */}
                  {diagnostic.coachingQuestions && diagnostic.coachingQuestions.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-indigo-800/40">
                      <span className="text-[11px] font-bold text-indigo-400 block mb-1.5">
                        💬 คำถามที่หัวหน้าควรใช้คุย 1-on-1 โค้ชชิ่งหน้างาน:
                      </span>
                      <ul className="space-y-1.5 pl-3 text-slate-300">
                        {diagnostic.coachingQuestions.map((q, idx) => (
                          <li key={idx} className="list-disc list-outside leading-relaxed text-[11px]">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 30-Day Growth Milestone */}
                <div className="p-3.5 rounded-xl bg-slate-800/30 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                    <Icon name="flag" size={15} />
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
              <div className="text-center py-16 text-slate-400">
                <Icon name="loader2" size={36} className="animate-spin mx-auto mb-3 text-amber-400" />
                <span className="text-xs">กำลังเตรียมข้อมูลการประเมินเชิงลึก...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#060A14] flex justify-between items-center gap-2 shrink-0">
          <div className="text-[11px] text-slate-400">
            โหมดปัจจุบัน: <strong className={isCorporate ? 'text-sky-400' : 'text-amber-400'}>{isCorporate ? 'Corporate Competency View (ผู้บริหาร/HR)' : 'RPG View (หน้างาน)'}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-[#7A1C28] hover:bg-[#8F2230] text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-95"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
