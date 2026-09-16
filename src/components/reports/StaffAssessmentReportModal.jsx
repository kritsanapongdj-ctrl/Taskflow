import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import ClassEmblem from '../../ClassEmblem';
import RadarChart from '../charts/RadarChart';
import archetypesData from '../../data/archetypes.json' with { type: 'json' };
import { 
  analyzeOuterLayer, 
  analyzeArchetype, 
  getArchetypeIdentity
} from '../../utils/archetypeEngine';

export default function StaffAssessmentReportModal({
  isOpen,
  onClose,
  staff,
  sets = {},
  Icon
}) {
  const reportRef = useRef(null);

  if (!isOpen || !staff) return null;
  if (typeof document === 'undefined') return null;

  const classMap = (sets.staffClasses || []).reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const role = classMap[staff.classId];
  const statsObj = {
    str: Number(staff.str) || 5,
    agi: Number(staff.agi) || 5,
    dex: Number(staff.dex) || 5,
    int: Number(staff.int) || 5,
    con: Number(staff.con) || 5,
    sen: Number(staff.sen) || 5
  };

  const userStats = [statsObj.str, statsObj.agi, statsObj.dex, statsObj.int, statsObj.con, statsObj.sen];

  // Archetype & Identity analysis
  const archAnalysis = analyzeArchetype(staff, sets, archetypesData) || {};
  const archetypeKey = archAnalysis.archetypeKey || 'novice';
  const enTitle = archAnalysis.mainStyle || 'Specialist';
  const identityText = staff.potentialIdentity || getArchetypeIdentity(statsObj, archetypesData);
  const styleDesc = archAnalysis.styleDesc || '';
  const weaknessText = archAnalysis.dynamicWeakness || '';

  // Outer Layer & 9-Box analysis
  const outerSummary = analyzeOuterLayer(staff, statsObj);

  const handlePrint = () => {
    document.body.classList.add('printing-staff-sheet');
    window.print();
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-staff-sheet');
    }, { once: true });
    setTimeout(() => {
      document.body.classList.remove('printing-staff-sheet');
    }, 2000);
  };

  const todayStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const modalContent = (
    <div 
      id="staff-report-modal-portal" 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center overflow-y-auto p-3 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible"
    >
      {/* Print Specific CSS to guarantee 100% clean 1-page A4 print without blank screen */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide application root and legacy print elements */
          #root, #app-main, #print-area {
            display: none !important;
          }
          #staff-report-modal-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #print-staff-sheet {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Action Toolbar (Screen Only) */}
      <div className="no-print w-full max-w-[210mm] mb-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-white/10 p-3 rounded-xl shadow-xl text-white">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#bca374]/20 text-[#e6d0a7] border border-[#bca374]/30">
            <Icon name="file-text" size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              ตัวอย่างรายงานผลการประเมินศักยภาพ (A4 Portrait)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bca374]/30 text-[#e6d0a7] font-normal">
                1 หน้ากระดาษ
              </span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              พนักงาน: <strong className="text-white">{staff.name}</strong> • RPG Character Sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#bca374] hover:bg-[#a38a5b] text-[#0f2e4a] font-black px-4 py-2 rounded-lg text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Icon name="printer" size={16} />
            <span>พิมพ์รายงาน / บันทึก PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>

      {/* The Printable A4 Sheet: Natural Height, Zero Artificial Gaps */}
      <div
        id="print-staff-sheet"
        ref={reportRef}
        className="w-full max-w-[210mm] bg-white text-slate-800 shadow-2xl rounded-xl p-5 sm:p-6 border border-slate-200 flex flex-col gap-2.5 select-text"
      >
        {/* Top Gold Accent Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0f2e4a] via-[#bca374] to-[#0f2e4a] rounded-t"></div>

        {/* 1. Header & Organization Branding */}
        <div className="flex items-start justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0f2e4a] text-[#e6d0a7] flex items-center justify-center font-black text-base shadow-sm border border-[#bca374]">
              LH
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#0f2e4a] leading-none">
                LH TASK-FLOW
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                ฝ่ายบริหารงานบริการชุมชนและจัดการสินทรัพย์ • การประเมินสมรรถนะบุคลากร
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 mb-0.5">
              RPG Character Assessment Sheet
            </span>
            <div className="text-[10px] text-slate-500">
              วันที่ประเมิน: <strong className="text-slate-700">{todayStr}</strong>
            </div>
          </div>
        </div>

        {/* 2. Main 2-Column Balanced Grid: Top-aligned, Natural Stacking */}
        <div className="grid grid-cols-12 gap-3.5 items-start">
          
          {/* LEFT COLUMN (5/12 Cols): Profile & Inner Potential (HOW) */}
          <div className="col-span-5 flex flex-col gap-2.5">
            
            {/* Box 1: Employee Hero Card */}
            <div className="p-2.5 rounded-xl border border-[#bca374]/40 bg-gradient-to-br from-slate-50 via-white to-[#bca374]/10 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {staff.image ? (
                    <img
                      src={staff.image}
                      alt={staff.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-[#bca374] shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#0f2e4a] text-[#e6d0a7] border-2 border-[#bca374] flex items-center justify-center font-black text-lg shadow-xs">
                      {(staff.name || 'TH').substring(0, 2)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0f2e4a] border border-[#bca374] flex items-center justify-center text-white shadow-xs">
                    <ClassEmblem archetypeKey={archetypeKey} size="12" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold text-[#bca374] tracking-wider uppercase block truncate">
                    {role?.name || 'ช่างเทคนิคปฏิบัติการ'}
                  </span>
                  <h2 className="text-sm font-black text-[#0f2e4a] truncate leading-tight">
                    {staff.name}
                  </h2>
                  <div className="text-[10px] font-black text-indigo-900 mt-0.5 leading-tight truncate">
                    {enTitle}
                  </div>
                  <span className="inline-block text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 mt-0.5">
                    {identityText}
                  </span>
                </div>
              </div>

              {styleDesc && (
                <p className="text-[8.5px] text-slate-600 font-light italic mt-2 pt-1.5 border-t border-slate-100 leading-snug">
                  "{styleDesc}"
                </p>
              )}
            </div>

            {/* Box 2: The Inner Potential (Radar & Stat Bars) */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1 text-[#0f2e4a] font-bold text-[11px]">
                  <Icon name="shield" size={13} className="text-[#bca374]" />
                  <span>6 แกนศักยภาพพื้นฐาน (HOW)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  เฉลี่ย {outerSummary.avgInner} / 10
                </span>
              </div>

              {/* Compact Vector Radar Chart */}
              <div className="w-full flex justify-center py-0.5">
                <div className="w-[140px] h-[140px]">
                  <RadarChart userStats={userStats} />
                </div>
              </div>

              {/* 6 Inner Stats Bars */}
              <div className="space-y-1">
                {[
                  { key: 'STR', val: statsObj.str, label: 'กำลังผลักดัน & ตัดสินใจ', color: 'bg-rose-500' },
                  { key: 'AGI', val: statsObj.agi, label: 'ความเร็ว & การปรับตัว', color: 'bg-emerald-500' },
                  { key: 'DEX', val: statsObj.dex, label: 'ความประณีต & ความปลอดภัย', color: 'bg-amber-500' },
                  { key: 'INT', val: statsObj.int, label: 'ทักษะเชิงช่าง & ดิจิทัล', color: 'bg-blue-500' },
                  { key: 'CON', val: statsObj.con, label: 'ความทนทาน & บริการด้วยใจ', color: 'bg-orange-500' },
                  { key: 'SEN', val: statsObj.sen, label: 'จิตวิทยา & สื่อสารลูกบ้าน', color: 'bg-purple-500' }
                ].map((s) => (
                  <div key={s.key} className="text-[8.5px]">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-slate-700">
                        {s.key} <span className="font-normal text-slate-400 text-[8px] ml-0.5">({s.label})</span>
                      </span>
                      <span className="font-bold text-[#0f2e4a]">{s.val}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full`}
                        style={{ width: `${(s.val / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {weaknessText && (
                <div className="mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[8.5px] text-slate-600 leading-snug">
                  <strong className="text-slate-800 block mb-0.5">💡 ข้อสังเกตเชิงพัฒนา:</strong>
                  {weaknessText}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (7/12 Cols): Field Performance & Intelligence (WHAT) */}
          <div className="col-span-7 flex flex-col gap-2.5">
            
            {/* Box 3: The Outer Layer Performance */}
            <div className="p-2.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 shadow-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-indigo-100/70">
                <div className="flex items-center gap-1 text-[#0f2e4a] font-bold text-[11px]">
                  <Icon name="layers" size={13} className="text-indigo-600" />
                  <span>6 แกนสมรรถนะผลงานหน้างาน (WHAT)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                  เฉลี่ย {outerSummary.avgOuter} / 10
                </span>
              </div>

              {/* Performance DNA Profile Banner */}
              <div className="p-2 rounded-lg bg-white border border-indigo-100">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <strong className="text-[10px] text-indigo-950 font-black">
                    ⭐ {outerSummary.performanceDna.title}
                  </strong>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {outerSummary.performanceDna.tag}
                  </span>
                </div>
                <p className="text-[8.5px] text-slate-600 leading-snug">
                  {outerSummary.performanceDna.desc}
                </p>
              </div>

              {/* 6 Outer Axes Grid */}
              <div className="grid grid-cols-3 gap-1.5 text-[8.5px]">
                {[
                  { key: 'cx', name: 'CX & บริการ', val: outerSummary.actualValues.cx },
                  { key: 'tech', name: 'วินิจฉัยเชิงช่าง', val: outerSummary.actualValues.tech },
                  { key: 'sla', name: 'วินัยเวลา SLA', val: outerSummary.actualValues.sla },
                  { key: 'crisis', name: 'กู้วิกฤตฉุกเฉิน', val: outerSummary.actualValues.crisis },
                  { key: 'resource', name: 'คุมงบ & ผู้รับเหมา', val: outerSummary.actualValues.resource },
                  { key: 'innovation', name: 'งาน PM & ดิจิทัล', val: outerSummary.actualValues.innovation }
                ].map((m) => (
                  <div key={m.key} className="p-1.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                    <div className="text-[8px] font-medium text-slate-500 truncate mb-0.5">
                      {m.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden mr-1">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(m.val / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-[#0f2e4a] text-[9px]">{m.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 4: HOW vs WHAT Gap & 9-Box Grid */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9.5px] pb-1 border-b border-slate-100">
                <span className="font-bold text-slate-700">
                  ศักยภาพตั้งต้น (HOW): <strong className="text-[#0f2e4a]">{outerSummary.avgInner}</strong>
                </span>
                <span className="font-bold text-slate-700">
                  ผลสัมฤทธิ์จริง (WHAT): <strong className="text-indigo-600">{outerSummary.avgOuter}</strong>
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[8.5px] ${
                  outerSummary.gap >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  Gap: {outerSummary.gap > 0 ? `+${outerSummary.gap}` : outerSummary.gap}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${outerSummary.talentGrid.badge}`}>
                  📦 {outerSummary.talentGrid.title}
                </span>
                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${outerSummary.alignmentBadge}`}>
                  {outerSummary.alignmentTitle}
                </span>
              </div>

              <p className="text-[8.5px] text-slate-600 leading-snug">
                {outerSummary.alignmentDesc}
              </p>

              <div className="p-1.5 rounded-lg bg-purple-50/60 border border-purple-100 text-[8.5px] text-purple-950 leading-snug">
                <strong>📦 แผนขับเคลื่อน 9-Box Grid:</strong> {outerSummary.talentGrid.action}
              </div>
            </div>

            {/* Box 5: Operational Risk Alerts (if any) */}
            {outerSummary.riskAlerts && outerSummary.riskAlerts.length > 0 && (
              <div className="space-y-1">
                {outerSummary.riskAlerts.map((r, i) => (
                  <div key={i} className="text-[8px] p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 leading-tight">
                    <strong className="text-rose-900 block font-bold mb-0.5">{r.title}</strong>
                    <span>{r.desc} <strong className="text-rose-950 font-bold ml-0.5">💡 แนวทาง: {r.advice}</strong></span>
                  </div>
                ))}
              </div>
            )}

            {/* Box 6: Operational Assignment & Strategic Pairing (Tight, Compact Layout) */}
            <div className="p-2.5 rounded-xl border border-[#bca374]/30 bg-gradient-to-br from-amber-50/20 via-white to-slate-50 shadow-xs flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-[#0f2e4a] flex items-center gap-1 pb-1 border-b border-slate-100">
                <Icon name="compass" size={13} className="text-[#bca374]" />
                <span>การมอบหมายภารกิจและการบริหารทีม (RPG Quest & Synergy)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[8.5px]">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 leading-snug">
                  <strong className="text-indigo-950 font-bold block mb-0.5 flex items-center gap-1">
                    <span>🎯</span> ภารกิจหลักที่เหมาะสม:
                  </strong>
                  <span className="text-slate-700">{outerSummary.bestFitAssignment}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 leading-snug">
                  <strong className="text-purple-950 font-bold block mb-0.5 flex items-center gap-1">
                    <span>👥</span> การจับคู่คู่หู (Pairing):
                  </strong>
                  <span className="text-slate-700">{outerSummary.pairingRecommendation}</span>
                </div>
              </div>

              <div className="p-1.5 rounded-lg bg-[#0f2e4a]/5 border border-[#bca374]/20 text-[8.5px] text-[#0f2e4a] leading-snug">
                <strong>💡 คำแนะนำเชิงบริหารหน้างาน:</strong> {outerSummary.coachingAdvice}
              </div>
            </div>

          </div>
        </div>

        {/* 3. Footer & Official 2-Party Sign-off Section */}
        <div className="pt-2 border-t border-slate-200 mt-1 flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-6 text-[8.5px] text-slate-700">
            <div className="border border-dashed border-slate-300 rounded-lg p-2 text-center">
              <span className="font-bold text-slate-500 block mb-2.5">ผู้รับการประเมิน (พนักงาน)</span>
              <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
              <span className="text-[8.5px] font-medium text-slate-600 block">({staff.name})</span>
              <span className="text-[7.5px] text-slate-400 block mt-0.5">วันที่: ........ / ........ / ................</span>
            </div>

            <div className="border border-dashed border-slate-300 rounded-lg p-2 text-center">
              <span className="font-bold text-slate-500 block mb-2.5">ผู้ประเมิน (หัวหน้างาน / ผู้จัดการโครงการ)</span>
              <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
              <span className="text-[8.5px] font-medium text-slate-600 block">(........................................................)</span>
              <span className="text-[7.5px] text-slate-400 block mt-0.5">วันที่: ........ / ........ / ................</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[7.5px] text-slate-400 px-1 pt-0.5 border-t border-slate-100">
            <span>LH Task-Flow RPG Performance Intelligence System • มาตรฐานการประเมินสมรรถนะองค์กร</span>
            <span>หน้า 1 จาก 1 • รับรองความถูกต้องสำหรับใช้ภายในองค์กร</span>
          </div>
        </div>

      </div>

    </div>
  );

  return createPortal(modalContent, document.body);
}
