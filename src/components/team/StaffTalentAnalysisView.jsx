import React from 'react';
import archetypesData from '../../data/archetypes.json';
import {
  getStatLevelText,
  getRubricText,
  analyzeArchetype,
  analyzeOuterLayer,
  OUTER_DEFINITIONS,
  OUTER_KEYS,
  UNIVERSAL_BASELINE,
  getRoleTargetProfile,
  getStatDisplay,
  getCorporateArchetypePersona,
  generateHeuristicTalentDiagnostic,
  aggregateStaffTaskTelemetry,
  NINE_BOX_DEFINITIONS,
  calculateBusinessRiskIndex,
  calculateSuccessionReadiness
} from '../../utils/archetypeEngine';

export default function StaffTalentAnalysisView({
  teamForm,
  setTeamForm,
  selTeam,
  classMap = {},
  sets = {},
  evalMonth,
  tasks = [],
  Icon,
  talentViewMode = 'all',
  setTalentViewMode,
  setAssessMode
}) {
      const u = teamForm;
      if (!u.id && !selTeam?.isNew) return null;
      const role = classMap[u.classId];
      const statsObj = { 
        str: Number(u.str) || 5, 
        agi: Number(u.agi) || 5, 
        dex: Number(u.dex) || 5, 
        int: Number(u.int) || 5, 
        con: Number(u.con) || 5, 
        sen: Number(u.sen) || 5 
      };
      
      const analysis = analyzeArchetype(u, sets, archetypesData);
      if (!analysis) return null;
      const { 
        mainStyle, 
        styleDesc, 
        roleProfile, 
        universalBaseline = UNIVERSAL_BASELINE, 
        signatureStrengths = [], 
        standardPass = [], 
        considerations = [] 
      } = analysis;

      const profile = roleProfile || getRoleTargetProfile(role || u.classId || u.potentialIdentity);
      const isCorporate = talentViewMode === 'corporate';
      const heuristic = generateHeuristicTalentDiagnostic(u, sets, archetypesData) || {};
      const corporatePersona = heuristic?.corporatePersona || getCorporateArchetypePersona(analysis.archetypeKey, mainStyle);

      const telemetry = aggregateStaffTaskTelemetry(u, tasks, sets, evalMonth);
      const outerSummary = analyzeOuterLayer(teamForm, statsObj, { telemetry });
      const businessRisk = calculateBusinessRiskIndex(u, telemetry, outerSummary);
      const succession = calculateSuccessionReadiness(u, analysis, outerSummary);

      return (
        <div className="mt-6 pt-4 w-full text-left relative z-10 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="font-bold text-[#0f2e4a] text-sm flex items-center">
              <Icon name={isCorporate ? "briefcase" : "user"} size={16} className="mr-2 text-[#bca374]" />
              {isCorporate 
                ? 'วิเคราะห์สมรรถนะองค์กร & บริหารจัดการบุคลากร (Corporate Competency & Executive Suite)'
                : 'วิเคราะห์ศักยภาพ & เกณฑ์มาตรฐานตำแหน่ง (Talent & Benchmark)'}
            </h4>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
              <button
                type="button"
                onClick={() => setTalentViewMode('rpg')}
                className={`px-2 py-0.5 rounded font-bold transition ${talentViewMode === 'rpg' ? 'bg-[#bca374] text-white shadow-xs' : 'text-slate-500'}`}
              >
                🎮 RPG
              </button>
              <button
                type="button"
                onClick={() => setTalentViewMode('corporate')}
                className={`px-2 py-0.5 rounded font-bold transition ${talentViewMode === 'corporate' ? 'bg-[#0f2e4a] text-white shadow-xs' : 'text-slate-500'}`}
              >
                💼 Corporate
              </button>
            </div>
          </div>

          {isCorporate ? (
            /* =========================================================================
               CORPORATE EXECUTIVE TALENT SUITE (TRUE DIVERGENCE)
               1. BARS Behavioral Rubric Spotlight
               2. McKinsey 9-Box Talent Matrix (Full 3x3 Grid)
               3. Strategic Business Risk Index (SLA, Quality, Fiscal Governance)
               4. Succession Readiness Index & Key Promotion Milestones
               5. Corporate Competency Framework (The Outer Layer 6 Axes)
               ========================================================================= */
            <div className="space-y-4">
              {/* กล่องข้อความสีฟ้า: BARS Behavioral Rubric Spotlight Box */}
              {heuristic?.primaryBarsStrength && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 via-sky-50/70 to-blue-50/50 border border-sky-300 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-sky-200">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-sky-600 text-white">
                        <Icon name="award" size={13} />
                      </span>
                      <span className="font-bold text-xs text-sky-950">
                        หลักฐานพฤติกรรมเชิงประจักษ์จริง (BARS Level {heuristic.primaryBarsStrength.level}): {heuristic.primaryBarsStrength.corporateName || heuristic.primaryBarsStrength.statName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 font-mono">
                      rubrics.json
                    </span>
                  </div>
                  
                  <div className="text-[11px] font-bold text-sky-900 mb-1">
                    ▶ เกณฑ์การประเมินย่อย: 「{heuristic.primaryBarsStrength.criterionLabel}」
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/90 border border-sky-200 text-slate-700 text-xs leading-relaxed italic shadow-2xs mb-2">
                    "{heuristic.primaryBarsStrength.behaviorText}"
                  </div>

                  {heuristic.primaryBarsNextMilestone?.behaviorText && (
                    <div className="p-2 rounded-lg bg-sky-100/60 border border-sky-200/80 flex items-start gap-2 text-[11px]">
                      <span className="text-amber-800 font-bold shrink-0 flex items-center gap-1">
                        <Icon name="target" size={13} className="text-amber-600" />
                        เป้าหมายการยกระดับถัดไป (Level {heuristic.primaryBarsNextMilestone.targetLevel}):
                      </span>
                      <span className="text-slate-700 leading-snug">
                        ด้าน「{heuristic.primaryBarsNextMilestone.criterionLabel}」— "{heuristic.primaryBarsNextMilestone.behaviorText}"
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 1. McKinsey 9-Box Talent Matrix */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Icon name="grid" size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f2e4a] text-sm flex items-center gap-1.5">
                        <span>McKinsey 9-Box Talent Matrix</span>
                        <span className="text-[10px] font-normal text-slate-500">(ตารางจัดกลุ่มศักยภาพและผลสัมฤทธิ์)</span>
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        แกนตั้ง (Y): ศักยภาพพฤติกรรมหลัก (HOW) | แกนนอน (X): ผลสัมฤทธิ์ผลงานจริง (WHAT)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {outerSummary.isAssessed ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                        {outerSummary.talentGrid?.title}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Icon name="clock" size={12} />
                        <span>รอประเมิน WHAT</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* If unassessed on WHAT, show clear actionable notice */}
                {!outerSummary.isAssessed && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
                        <Icon name="alertCircle" size={16} />
                      </span>
                      <div>
                        <strong className="font-bold block text-sm text-amber-950">
                          ⏳ รอผลการประเมิน 6 แกนสมรรถนะหน้างานจริง (WHAT)
                        </strong>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          พนักงานได้รับการประเมินเฉพาะสเตตัสศักยภาพตั้งต้น (HOW: <strong>{outerSummary.avgInner}/10</strong> ระดับ {outerSummary.talentGrid?.howLevel === 'high' ? 'ศักยภาพสูง' : outerSummary.talentGrid?.howLevel === 'med' ? 'ศักยภาพปานกลาง' : 'ศักยภาพพื้นฐาน'}) ยังไม่มีคะแนนผลสัมฤทธิ์หน้างาน กรุณาประเมินสมรรถนะ 6 แกนเพื่อจัดตำแหน่ง 9-Box
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssessMode(true)}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-sm flex items-center gap-1.5 transition"
                    >
                      <Icon name="clipboardCheck" size={14} />
                      <span>+ ประเมินสมรรถนะ 6 แกน (WHAT)</span>
                    </button>
                  </div>
                )}

                {/* 3x3 McKinsey Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {NINE_BOX_DEFINITIONS.map(cell => {
                    const isMatched = outerSummary.isAssessed && outerSummary.talentGrid?.key === cell.code;
                    const isPotentialRow = !outerSummary.isAssessed && outerSummary.talentGrid?.howLevel === cell.howLevel;
                    return (
                      <div
                        key={cell.code}
                        className={`p-3 rounded-xl border flex flex-col justify-between min-h-[90px] transition-all relative ${
                          isMatched
                            ? 'bg-gradient-to-br from-sky-50 to-blue-50/80 border-sky-400 shadow-md ring-2 ring-sky-300'
                            : isPotentialRow
                            ? 'bg-amber-50/40 border-amber-300/80'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-[11px] font-bold ${isMatched ? 'text-sky-950 font-black' : 'text-slate-800'}`}>
                              {cell.title}
                            </span>
                            {isMatched && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-sky-600 text-white shadow-xs">
                                ★ ประจำตำแหน่ง
                              </span>
                            )}
                            {isPotentialRow && !outerSummary.isAssessed && cell.whatLevel === 'med' && (
                              <span className="text-[8.5px] font-bold px-1 rounded bg-amber-200 text-amber-900">
                                แถวศักยภาพ (HOW)
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {cell.thai}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                          <span className="truncate">{cell.category}</span>
                          {isMatched && (
                            <span className="font-bold text-sky-700">
                              HOW {outerSummary.avgInner} / WHAT {outerSummary.avgOuter}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Column Footers: Performance Axes */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-500 pt-0.5">
                  <div className="p-1 rounded bg-slate-100">ผลงานต่ำ (WHAT &lt; 4.5)</div>
                  <div className="p-1 rounded bg-slate-100">ผลงานมาตรฐาน (4.5 - 6.7)</div>
                  <div className="p-1 rounded bg-slate-100">ผลงานโดดเด่น (WHAT ≥ 6.8)</div>
                </div>

                {/* Matched Action Playbook */}
                {outerSummary.isAssessed && outerSummary.talentGrid && (
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sky-900">📦 แผนขับเคลื่อนบุคลากร (Talent Action Playbook):</span>
                      <span className="font-bold text-sky-700">{outerSummary.talentGrid.title}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      ▶ <strong>ข้อแนะนำสำหรับผู้บริหาร:</strong> {outerSummary.talentGrid.action}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Strategic Business Risk Index (3 Cards) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                      <Icon name="shieldAlert" size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f2e4a] text-sm">ดัชนีชี้วัดความเสี่ยงเชิงธุรกิจ (Strategic Business Risk Index)</h4>
                      <span className="text-[10px] text-slate-500">ประเมินความเสี่ยงต่อการดำเนินงานโครงการ 3 มิติจากสถิติจริงและสมรรถนะ</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${businessRisk.overallBadge}`}>
                    {businessRisk.overallTitle}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* SLA Speed Risk */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    businessRisk.slaRisk.level === 'high' ? 'bg-rose-50/70 border-rose-200 text-rose-950' :
                    businessRisk.slaRisk.level === 'moderate' ? 'bg-amber-50/70 border-amber-200 text-amber-950' :
                    'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold">1. ความเสี่ยงด้านเวลา &amp; SLA</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          businessRisk.slaRisk.level === 'high' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          businessRisk.slaRisk.level === 'moderate' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {businessRisk.slaRisk.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed mb-2 text-slate-700">
                        {businessRisk.slaRisk.reason}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-200/60">
                      งานในมือ: {telemetry.totalTasks} | ปิดแล้ว: {telemetry.completedTasks} | SLA: {telemetry.slaRate}%
                    </div>
                  </div>

                  {/* Quality & Defect Risk */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    businessRisk.qualityRisk.level === 'high' ? 'bg-rose-50/70 border-rose-200 text-rose-950' :
                    businessRisk.qualityRisk.level === 'moderate' ? 'bg-amber-50/70 border-amber-200 text-amber-950' :
                    'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold">2. คุณภาพ &amp; งานซ่อมซ้ำ</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          businessRisk.qualityRisk.level === 'high' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          businessRisk.qualityRisk.level === 'moderate' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {businessRisk.qualityRisk.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed mb-2 text-slate-700">
                        {businessRisk.qualityRisk.reason}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-200/60">
                      DEX: {u.dex || 5}/10 | TECH: {outerSummary.actualValues?.tech !== null ? outerSummary.actualValues?.tech + '/10' : 'รอประเมิน'}
                    </div>
                  </div>

                  {/* Fiscal & Governance Risk */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    businessRisk.fiscalRisk.level === 'high' ? 'bg-rose-50/70 border-rose-200 text-rose-950' :
                    businessRisk.fiscalRisk.level === 'moderate' ? 'bg-amber-50/70 border-amber-200 text-amber-950' :
                    'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold">3. งบประมาณ &amp; คลังอะไหล่</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          businessRisk.fiscalRisk.level === 'high' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          businessRisk.fiscalRisk.level === 'moderate' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {businessRisk.fiscalRisk.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed mb-2 text-slate-700">
                        {businessRisk.fiscalRisk.reason}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-200/60">
                      ค้าง &gt;30 วัน: {telemetry.staleTasksCount || 0} | RESOURCE: {outerSummary.actualValues?.resource !== null ? outerSummary.actualValues?.resource + '/10' : 'รอประเมิน'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Succession Readiness Index */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                      <Icon name="trendingUp" size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f2e4a] text-sm">ดัชนีความพร้อมสืบทอดตำแหน่ง (Succession Readiness Index)</h4>
                      <span className="text-[10px] text-slate-500">วิเคราะห์ความพร้อมในการเลื่อนขั้นสู่บทบาทระดับอาวุโส / ผู้นำทีม</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${succession.badgeClass}`}>
                    {succession.statusTitle}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">คะแนนความพร้อมรวม:</span>
                    <span className="font-black text-sm text-[#0f2e4a]">{succession.score} / 100</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        succession.score >= 85 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                        succession.score >= 70 ? 'bg-gradient-to-r from-sky-500 to-blue-600' :
                        'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${succession.score}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-wrap justify-between items-center text-[11px] text-slate-600">
                    <span>สถานะ: <strong className="text-slate-800">{succession.statusThai}</strong></span>
                    <span>กรอบเวลาเตรียมความพร้อม: <strong className="text-indigo-900">{succession.timeHorizon}</strong></span>
                  </div>
                  {succession.isProvisional && (
                    <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      ℹ️ <strong>หมายเหตุ:</strong> คะแนนนี้เป็นการคำนวณเบื้องต้น (Provisional) จากศักยภาพ HOW กรุณาประเมินผลงานจริง 6 แกน (WHAT) เพื่อวิเคราะห์ความพร้อม 100%
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-700 block">🎯 หมุดหมายการพัฒนาเพื่อความพร้อม (Key Promotion Milestones):</span>
                  <div className="space-y-1">
                    {succession.keyMilestones.map((m, mIdx) => (
                      <div key={mIdx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                        <Icon name="checkCircle2" size={14} className="text-sky-600 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Corporate Competency Framework (The Outer Layer 6 Axes) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <Icon name="layers" size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f2e4a] text-sm">6 แกนสมรรถนะองค์กรภาคสนาม (The Outer Layer Competencies)</h4>
                      <span className="text-[10px] text-slate-500">ผลสัมฤทธิ์หน้างานจริง (WHAT) แยกอิสระจากสเตตัสศักยภาพ (HOW)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssessMode(true)}
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <Icon name="clipboardCheck" size={14} />
                    <span>เปิดแบบประเมินสมรรถนะ (Wizard)</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {OUTER_KEYS.map(k => {
                    const def = OUTER_DEFINITIONS[k];
                    const actualVal = (u[k] !== null && u[k] !== undefined) ? u[k] : 5;
                    const isAssessed = u[k] !== null && u[k] !== undefined;
                    const rubricText = getRubricText(k, actualVal);

                    return (
                      <div key={k} className={`p-3.5 rounded-xl border transition-all ${isAssessed ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200 bg-white'}`}>
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-2 gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${def.bg}`}>
                                {def.key.toUpperCase()}
                              </span>
                              <strong className="text-xs text-slate-900 font-bold">{def.name}</strong>
                              <span className="text-[11px] text-slate-500">({def.thai})</span>
                              {!isAssessed && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  รอประเมิน
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-1 leading-relaxed">{def.desc}</span>
                          </div>

                          <div className="flex items-baseline gap-1 shrink-0">
                            <span className={`font-black text-lg leading-none ${isAssessed ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {isAssessed ? actualVal : '—'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">/10</span>
                          </div>
                        </div>

                        {/* Quick Tier Buttons */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5 pt-2 border-t border-slate-100">
                          {[
                            { label: '1-3 เริ่มต้น', val: 2, active: isAssessed && actualVal <= 3 },
                            { label: '4-6 ปฏิบัติได้', val: 5, active: isAssessed && actualVal >= 4 && actualVal <= 6 },
                            { label: '7-8 ชำนาญ', val: 8, active: isAssessed && actualVal >= 7 && actualVal <= 8 },
                            { label: '9-10 เชี่ยวชาญ', val: 9, active: isAssessed && actualVal >= 9 }
                          ].map((tier, ti) => (
                            <button
                              key={ti}
                              type="button"
                              onClick={() => {
                                setTeamForm({ ...teamForm, [k]: tier.val, outerAssessed: true });
                              }}
                              className={`flex-1 min-w-[70px] text-[10.5px] py-1.5 px-2 rounded-lg text-center font-bold border transition ${
                                tier.active
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {tier.label}
                            </button>
                          ))}
                        </div>

                        {/* Slider */}
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            value={actualVal}
                            onChange={e => setTeamForm({ ...teamForm, [k]: Number(e.target.value), outerAssessed: true })}
                          />
                        </div>

                        {/* Rubric Guidance */}
                        <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 leading-snug">
                          <strong className="text-slate-800 font-bold block mb-0.5">พฤติกรรมหน้างาน (เกณฑ์ระดับ {actualVal}/10):</strong>
                          <span>{rubricText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ==================== RPG TALENT SUITE ==================== */
            <div>
              {/* กล่องข้อความสีฟ้า: BARS Behavioral Rubric Spotlight Box */}
          {heuristic?.primaryBarsStrength && (
            <div className="mb-3.5 p-3.5 rounded-xl bg-gradient-to-r from-sky-50 via-sky-50/70 to-blue-50/50 border border-sky-300 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-sky-200">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-md bg-sky-600 text-white">
                    <Icon name="award" size={13} />
                  </span>
                  <span className="font-bold text-xs text-sky-950">
                    หลักฐานพฤติกรรมเชิงประจักษ์จริง (BARS Level {heuristic.primaryBarsStrength.level}): {isCorporate ? heuristic.primaryBarsStrength.corporateName : heuristic.primaryBarsStrength.statName}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 font-mono">
                  rubrics.json
                </span>
              </div>
              
              <div className="text-[11px] font-bold text-sky-900 mb-1">
                ▶ เกณฑ์การประเมินย่อย: 「{heuristic.primaryBarsStrength.criterionLabel}」
              </div>
              <div className="p-2.5 rounded-lg bg-white/90 border border-sky-200 text-slate-700 text-xs leading-relaxed italic shadow-2xs mb-2">
                "{heuristic.primaryBarsStrength.behaviorText}"
              </div>

              {heuristic.primaryBarsNextMilestone?.behaviorText && (
                <div className="p-2 rounded-lg bg-sky-100/60 border border-sky-200/80 flex items-start gap-2 text-[11px]">
                  <span className="text-amber-800 font-bold shrink-0 flex items-center gap-1">
                    <Icon name="target" size={13} className="text-amber-600" />
                    เป้าหมายการยกระดับถัดไป (Level {heuristic.primaryBarsNextMilestone.targetLevel}):
                  </span>
                  <span className="text-slate-700 leading-snug">
                    ด้าน「{heuristic.primaryBarsNextMilestone.criterionLabel}」— "{heuristic.primaryBarsNextMilestone.behaviorText}"
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Role Target Profile Card */}
          <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-slate-50 via-sky-50/30 to-blue-50/20 border border-sky-200/80 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="font-bold text-xs text-[#0f2e4a]">
                  🎯 เกณฑ์ตำแหน่ง: {profile.roleName}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200">
                มาตรฐานร่วมระดับองค์กร: {universalBaseline} ทุกค่า
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              {profile.description}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-bold text-slate-600 mr-1">{isCorporate ? 'สมรรถนะเป้าหมาย:' : 'สเตตัสเป้าหมาย:'}</span>
              {Object.entries(profile.targetStats).map(([k, v]) => {
                const isCore = profile.coreFocus.includes(k);
                const disp = getStatDisplay(k, talentViewMode);
                return (
                  <span 
                    key={k} 
                    className={`px-2 py-0.5 rounded font-bold border ${
                      isCore 
                        ? 'bg-sky-100 text-sky-800 border-sky-300' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                    title={disp.desc}
                  >
                    {disp.code}: {v} {isCore && '★'}
                  </span>
                );
              })}
              <span className="text-[9px] text-slate-400 ml-1">(*★ = ทักษะหลักประจำตำแหน่ง)</span>
            </div>
          </div>
          
          {/* Work Style Tendency */}
          <div className="mb-4 text-[12px] p-3 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 shadow-xs relative z-10">
             <strong className="block mb-1 text-[#0f2e4a] font-bold">▶ {isCorporate ? 'บทบาทและแนวโน้มการทำงาน (Corporate Role Profile):' : 'แนวโน้มการทำงาน (Work Style Tendency):'}</strong>
             <span className="font-bold text-[#0f2e4a] text-sm block ml-3 mb-1">{isCorporate ? corporatePersona.title : mainStyle}</span>
             <span className="block text-slate-600 leading-relaxed ml-3">{isCorporate && corporatePersona.desc ? corporatePersona.desc : styleDesc}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-2 relative z-10">
            {/* Signature Strengths (>= 7) */}
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 relative overflow-hidden">
              <strong className="text-emerald-800 text-[13px] flex items-center mb-2">
                <Icon name="trendingUp" size={14} className="mr-1.5 text-emerald-600"/> 
                {isCorporate ? 'สมรรถนะโดดเด่นประจำตัว (Signature Strengths ≥ 7)' : 'จุดเด่นประจำตัว (Signature Strengths ≥ 7)'}
              </strong>
              {signatureStrengths.length > 0 ? (
                <ul className="text-[12px] text-slate-700 space-y-2 relative z-10 pl-2 border-l-2 border-emerald-300 ml-1">
                  {signatureStrengths.map(s => {
                    const isCore = profile.coreFocus.includes(s.key);
                    const disp = getStatDisplay(s.key, talentViewMode);
                    return (
                      <li key={s.key} className="py-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#0f2e4a]">{isCorporate ? disp.name : s.name} ({disp.code})</span>
                            {isCore && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ★ แกนหลักตำแหน่ง
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-emerald-700">
                            {s.val}/10 <span className="text-slate-400 font-normal ml-1 text-[10px]">({getStatLevelText(s.val)})</span>
                          </span>
                        </div>
                        <div className="text-slate-600 leading-snug">▶ {getRubricText(s.key, s.val)}</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-[11px] text-slate-500 relative z-10 ml-2">
                  ทุกสเตตัสอยู่ในระดับมาตรฐาน (ไม่มีค่าที่พุ่งสูงเกินเกณฑ์ปกติ)
                </div>
              )}
            </div>

            {/* Standard Baseline (5-6) */}
            {standardPass.length > 0 && (
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Icon name="checkCircle" size={13} className="text-blue-500" />
                    ผ่านเกณฑ์มาตรฐานบริษัท (Baseline Standard 5-6):
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">พร้อมปฏิบัติงานตามมาตรฐาน</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {standardPass.map(s => {
                    const disp = getStatDisplay(s.key, talentViewMode);
                    return (
                      <span key={s.key} className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium" title={disp.desc}>
                        <strong>{disp.code}</strong>: {s.val}/10
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Developmental Considerations (<= 4) */}
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 relative overflow-hidden mt-1">
              <strong className="text-amber-900 text-[13px] flex items-center mb-2">
                <Icon name="alertCircle" size={14} className="mr-1.5 text-amber-600"/> 
                {isCorporate ? 'สมรรถนะที่ควรพิจารณาและสนับสนุน (Developmental Considerations ≤ 4)' : 'จุดที่ควรพิจารณาและสนับสนุน (Developmental Considerations ≤ 4)'}
              </strong>
              {considerations.length > 0 ? (
                <ul className="space-y-3 relative z-10 pl-2 border-l-2 border-amber-300 ml-1">
                  {considerations.map(s => {
                    const disp = getStatDisplay(s.key, talentViewMode);
                    return (
                      <li key={s.key} className="text-slate-700 text-[12px] pb-2 border-b border-amber-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-[#0f2e4a]">{isCorporate ? disp.name : s.name} ({disp.code})</strong>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                              s.isCore 
                                ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                : 'bg-sky-100 text-sky-800 border-sky-200'
                            }`}>
                              {s.roleStatus}
                            </span>
                          </div>
                          <span className="font-bold text-amber-700">
                             {s.val}/10 <span className="text-slate-400 font-normal ml-1 text-[10px]">({getStatLevelText(s.val)})</span>
                          </span>
                        </div>
                        <div className="text-slate-600 leading-snug mb-1">
                          ▶ {getRubricText(s.key, s.val)}
                        </div>
                        <div className="text-[10.5px] text-amber-900 font-medium bg-white/80 p-1.5 rounded-lg border border-amber-200/60 inline-block mt-0.5">
                           💡 <strong>แนวทางสนับสนุน:</strong> {s.advice}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-[11px] text-emerald-700 font-medium relative z-10 ml-2">
                  ✅ ทุกสเตตัสผ่านเกณฑ์มาตรฐานบริษัท (≥ 5 ทุกค่า) ไม่พบจุดที่ต้องกังวล
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 relative z-10">
             <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
               <div>
                 <h4 className="font-bold text-[#0f2e4a] text-[13px] flex items-center">
                    <Icon name="layers" size={15} className="mr-1.5 text-indigo-600" />
                    6 แกนสมรรถนะผลงาน (The Outer Layer)
                 </h4>
                 <p className="text-[10px] text-slate-500 leading-snug">
                    * วิเคราะห์จากศักยภาพตั้งต้น (HOW) ปรับเพิ่ม/ลดผลลัพธ์หน้างานจริง (WHAT) พร้อมเกณฑ์มาตรฐานงานหมู่บ้านจัดสรร
                 </p>
               </div>
               <div className="flex items-center gap-1.5">
                 <button
                   type="button"
                   onClick={() => {
                     const resetScores = {};
                     OUTER_KEYS.forEach(k => { resetScores[k] = null; });
                     setTeamForm({ ...teamForm, ...resetScores });
                   }}
                   className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition flex items-center gap-1"
                   title="รีเซ็ตคะแนนทั้งหมดให้คำนวณจากสูตรศักยภาพตั้งต้น"
                 >
                   <Icon name="refresh-cw" size={11} />
                   <span>รีเซ็ตตาม HOW</span>
                 </button>
                 <button
                   type="button"
                   onClick={() => setAssessMode(true)}
                   className="text-[10px] font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-3 py-1 rounded shadow-xs transition flex items-center gap-1.5"
                 >
                   <Icon name="clipboard-check" size={13} />
                   <span>เปิดตัวช่วยประเมิน (Wizard)</span>
                 </button>
               </div>
             </div>

             <div className="flex flex-col gap-4">
                {OUTER_KEYS.map(k => {
                   const def = OUTER_DEFINITIONS[k];
                   const autoVal = def.calc(statsObj);
                   const actualVal = (u[k] !== null && u[k] !== undefined) ? u[k] : autoVal;
                   const isOverride = u[k] !== null && u[k] !== undefined && u[k] !== autoVal;
                   const gap = actualVal - autoVal;
                   const rubricText = getRubricText(k, actualVal);
                   const penalty = outerSummary.penaltiesByAxis?.[k] || 0;
                   const netVal = Math.max(1, Math.min(10, actualVal - penalty));
                   
                   return (
                     <div key={k} className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 ${isOverride ? 'border-indigo-300 bg-indigo-50/30 shadow-sm' : 'border-slate-200 bg-white shadow-sm'}`}>
                        {/* Title & Score */}
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-2 gap-2">
                           <div className="flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <strong className="text-[13px] text-slate-900 font-bold">{def.name}</strong>
                                <span className="text-[11px] text-slate-500 font-medium">({def.thai})</span>
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-1 leading-relaxed">{def.desc} • สูตร: {def.formulaDesc}</span>
                           </div>
                           <div className="flex flex-row sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 mt-1 sm:mt-0">
                             <div className="flex items-baseline gap-1">
                               <span className={`font-black text-lg leading-none ${isOverride ? 'text-indigo-600' : 'text-slate-700'}`}>
                                 {actualVal}
                               </span>
                               <span className="text-[11px] text-slate-400 font-normal">/10</span>
                             </div>
                             {isOverride && (
                               <button 
                                 type="button" 
                                 className="text-[10px] text-slate-400 hover:text-indigo-600 underline mt-0.5" 
                                 onClick={() => setTeamForm({...teamForm, [k]: null})}
                               >
                                 คืนค่า ({autoVal})
                               </button>
                             )}
                           </div>
                        </div>

                        {/* Quick Tier Selection Buttons */}
                        <div className="flex flex-wrap gap-2 mb-3 pt-2 border-t border-slate-100">
                          {[
                            { label: '1-3 เริ่มต้น', val: 2, active: actualVal <= 3 },
                            { label: '4-6 ปฏิบัติได้', val: 5, active: actualVal >= 4 && actualVal <= 6 },
                            { label: '7-8 ชำนาญ', val: 8, active: actualVal >= 7 && actualVal <= 8 },
                            { label: '9-10 เชี่ยวชาญ', val: 9, active: actualVal >= 9 }
                          ].map((tier, ti) => (
                            <button
                              key={ti}
                              type="button"
                              onClick={() => setTeamForm({ ...teamForm, [k]: tier.val })}
                              className={`flex-1 min-w-[80px] text-[11px] py-2 px-2 rounded-lg text-center font-bold border transition whitespace-nowrap ${
                                tier.active
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {tier.label}
                            </button>
                          ))}
                        </div>

                        {/* Slider for fine adjustment */}
                        <div className="flex items-center gap-2">
                           <input type="range" min="1" max="10" step="1" 
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                              value={actualVal} 
                              onChange={e => setTeamForm({...teamForm, [k]: Number(e.target.value)})} 
                           />
                        </div>

                        {/* Rubric Guidance Box */}
                        <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 leading-snug">
                           <strong className="text-slate-800 font-bold block mb-0.5">พฤติกรรมหน้างาน (เกณฑ์ระดับ {actualVal}/10):</strong>
                           <span>{rubricText}</span>
                        </div>

                        {/* Audit Penalty Notice */}
                        {penalty > 0 && (
                           <div className="mt-1.5 text-[9.5px] text-rose-800 bg-rose-50/90 p-2 rounded-lg font-medium leading-tight border border-rose-200 flex items-center justify-between shadow-2xs">
                              <span className="flex items-center gap-1">
                                 <span>⚠️</span>
                                 <span>มีแต้มหักวินัยจากห้องตัดสิน (Audit Penalty): -{penalty} แต้ม</span>
                              </span>
                              <span className="font-bold text-rose-900 bg-rose-200/80 px-2 py-0.5 rounded border border-rose-300">
                                 คะแนนสุทธิ: {netVal}/10
                              </span>
                           </div>
                        )}

                        {/* Gap Warning */}
                        {gap <= -2 && (
                           <div className="mt-1.5 text-[9.5px] text-rose-700 bg-rose-50 p-1.5 rounded font-medium leading-tight border border-rose-200">
                              ⚠️ ศักยภาพ {autoVal} แต่ผลงาน {actualVal} (Low Result) → ขาดประสบการณ์หน้างานหมู่บ้านจัดสรร ควรทำ OJT ด่วน
                           </div>
                        )}
                        {gap >= 2 && (
                           <div className="mt-1.5 text-[9.5px] text-emerald-700 bg-emerald-50 p-1.5 rounded font-medium leading-tight border border-emerald-200">
                              ⭐ ผลงาน {actualVal} แซงศักยภาพ {autoVal} → ค้นพบ Best Practice ในโครงการ ควรแชร์ให้ทีมเรียนรู้
                           </div>
                        )}
                     </div>
                   );
                })}
             </div>

              {/* Outer Layer Executive Performance Summary */}
              {(() => {
                const outerSummary = analyzeOuterLayer(teamForm, statsObj, { telemetry });
                if (!outerSummary.isAssessed) {
                  return (
                    <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                      <span className="text-xs font-bold text-slate-600 block">ยังไม่ได้ประเมิน 6 แกนสมรรถนะหน้างาน (WHAT)</span>
                      <p className="text-[10px] text-slate-400">พนักงานยังไม่มีผลการประเมินผลสัมฤทธิ์จริงหน้างาน</p>
                      <button
                        type="button"
                        onClick={() => setAssessMode(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Icon name="clipboard-check" size={13} />
                        <span>เปิดตัวช่วยประเมิน (Wizard)</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-indigo-900/5 via-slate-50 to-indigo-50/40 border border-indigo-200 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shadow-xs">
                          <Icon name="layers" size={15} />
                        </span>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Performance DNA Profile</span>
                          <strong className="text-xs text-indigo-950 font-black">{outerSummary.performanceDna.title}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {outerSummary.talentGrid && (
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${outerSummary.talentGrid.badge || 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            📦 {outerSummary.talentGrid.title}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${outerSummary.alignmentBadge}`}>
                          {outerSummary.alignmentTitle}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {outerSummary.performanceDna.desc}
                    </p>

                    {/* Operational Risk Alerts */}
                    {outerSummary.riskAlerts && outerSummary.riskAlerts.length > 0 && (
                      <div className="space-y-1.5">
                        {outerSummary.riskAlerts.map((r, i) => (
                          <div key={i} className="text-[10px] p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                            <Icon name="alert-triangle" size={14} className="text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-rose-900 font-bold block">{r.title}</strong>
                              <span>{r.desc} <strong className="text-rose-950 font-bold ml-1">💡 แนวทาง: {r.advice}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* HOW vs WHAT Synthesis Bar */}
                    <div className="p-3 rounded-lg bg-white/90 border border-indigo-100 text-[11px] space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pb-1.5 border-b border-slate-100">
                        <span>ศักยภาพตั้งต้น (HOW): <strong className="text-[#0f2e4a]">{outerSummary.avgInner}</strong> / 10</span>
                        <span>ผลงานจริง (WHAT): <strong className="text-indigo-600">{outerSummary.avgOuter}</strong> / 10</span>
                        <span className={outerSummary.gap >= 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                          Gap: {outerSummary.gap > 0 ? `+${outerSummary.gap}` : outerSummary.gap}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-snug">
                        {outerSummary.alignmentDesc}
                      </p>
                      {outerSummary.talentGrid && (
                        <div className="text-[10px] text-purple-950 bg-purple-50/80 p-2 rounded-lg border border-purple-100 font-medium leading-snug">
                          📦 <strong>แผนขับเคลื่อน (9-Box Grid - {outerSummary.talentGrid.title}):</strong> {outerSummary.talentGrid.action}
                        </div>
                      )}
                      {(outerSummary.bestFitAssignment || outerSummary.pairingRecommendation) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                          {outerSummary.bestFitAssignment && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 leading-snug">
                              <strong className="text-indigo-900 block mb-0.5">🎯 ภารกิจหลักที่เหมาะสม:</strong>
                              {outerSummary.bestFitAssignment}
                            </div>
                          )}
                          {outerSummary.pairingRecommendation && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700 leading-snug">
                              <strong className="text-purple-900 block mb-0.5">👥 การจับคู่คู่หู (Pairing):</strong>
                              {outerSummary.pairingRecommendation}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-[10px] text-indigo-950 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 font-medium leading-snug">
                        💡 <strong>คำแนะนำเชิงบริหารหน้างาน:</strong> {outerSummary.coachingAdvice}
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          )}
        </div>
      );
}
