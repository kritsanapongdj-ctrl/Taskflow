import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import { analyzeArchetype, generateHeuristicTalentDiagnostic, getRoleTargetProfile } from '../../utils/archetypeEngine';

const Icon = ({ name, ...props }) => {
  const LucideIcon = lucide[name];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default function AITalentAdvisorModal({ isOpen, onClose, staff, sets = {}, archetypesData }) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !staff) {
      setDiagnostic(null);
      return;
    }

    const runAnalysis = async () => {
      setLoading(true);
      const roleProfile = getRoleTargetProfile(staff.role || staff.classId || sets?.staffClasses?.find?.(c => c.id === staff.classId));
      const archAnalysis = analyzeArchetype(staff, sets, archetypesData);

      // 1. Initial immediate heuristic diagnostic (zero latency baseline)
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

        const res = await fetch('/api/talent-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff,
            stats,
            roleName: roleProfile.name,
            archAnalysis
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDiagnostic(json.data);
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

  const handleCopy = () => {
    if (!diagnostic) return;
    const text = `=== บทวิเคราะห์ศักยภาพพนักงาน (Talent Diagnostic Report) ===\n` +
      `ชื่อ: ${staff.name} | ตำแหน่ง: ${roleProfile.name}\n` +
      `ระดับสมรรถนะ: ${diagnostic.competencyTier || tier.name}\n\n` +
      `[ภาพรวมความพร้อม]\n${diagnostic.overallVerdict}\n\n` +
      `[จุดเด่นจริง]\n${diagnostic.verifiedStrengths}\n\n` +
      `[ความเสี่ยงหน้างาน]\n${diagnostic.operationalRisks}\n\n` +
      `[แนวทางการบริหารจัดการ]\n${diagnostic.managerActionPlan}\n\n` +
      `[คำถาม 1-on-1 Coaching]\n${(diagnostic.coachingQuestions || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n` +
      `[เป้าหมาย 30-60 วัน]\n${diagnostic.nextGrowthMilestone}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#0f172a] border border-amber-500/30 w-full max-w-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md shrink-0">
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
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${tier.badgeColor || 'text-sky-300 bg-sky-950/60 border-sky-800'}`}>
                  {tier.name}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {roleProfile.name} • <span className="text-[#e6d0a7] font-semibold">{archAnalysis.mainStyle}</span>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <Icon name="x" size={20} />
          </button>
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
                🧠 ประมวลผลโดย Talent Diagnostic Engine (Score-Tiered Standard)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-slate-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            <Icon name={copied ? "check" : "copy"} size={11} className={copied ? "text-emerald-400" : ""} />
            <span>{copied ? "คัดลอกแล้ว" : "คัดลอกผลสรุป"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300 custom-scrollbar">
          {diagnostic ? (
            <>
              {/* Overall Verdict */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900 border border-slate-700/80 shadow-xs">
                <div className="flex items-center gap-2 mb-1 text-amber-400 font-bold text-xs">
                  <Icon name="sparkles" size={14} />
                  <span>ภาพรวมความพร้อม & การวินิจฉัยศักยภาพ (Executive Verdict)</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed mt-1 font-medium">
                  {diagnostic.overallVerdict}
                </p>
              </div>

              {/* Verified Strengths vs Risks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Verified Strengths */}
                <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1.5">
                    <Icon name="checkCircle2" size={14} />
                    <span>จุดเด่นจริงที่พิสูจน์ได้ (Verified Strengths)</span>
                  </div>
                  <p className="text-emerald-100/90 text-xs leading-relaxed flex-1 whitespace-pre-line">
                    {diagnostic.verifiedStrengths}
                  </p>
                </div>

                {/* Operational Risks */}
                <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1.5">
                    <Icon name="alertTriangle" size={14} />
                    <span>ความเสี่ยงหน้างาน & จุดควรระวัง (Operational Risks)</span>
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
                  <span>แนวทางการบริหาร & มอบหมายงาน (Manager Action Playbook)</span>
                </div>
                <p className="text-slate-200 text-xs whitespace-pre-line leading-relaxed">
                  {diagnostic.managerActionPlan}
                </p>

                {/* 1-on-1 Coaching Questions */}
                {diagnostic.coachingQuestions && diagnostic.coachingQuestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-800/40">
                    <span className="text-[11px] font-bold text-indigo-400 block mb-1">
                      💬 คำถามที่หัวหน้าควรใช้คุย 1-on-1 โค้ชชิ่ง:
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
                    เป้าหมายการเติบโต 30–60 วัน (Growth Milestone):
                  </strong>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
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
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-2">
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
