import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import ClassEmblem from '../ClassEmblem';
import AssessmentModal from '../AssessmentModal';
import RadarChart from '../components/charts/RadarChart';
import StaffAssessmentReportModal from '../components/reports/StaffAssessmentReportModal';
import AITalentAdvisorModal from '../components/modals/AITalentAdvisorModal';
import TeamCalibrationModal from '../components/modals/TeamCalibrationModal';
import DiscrepancyAuditModal from '../components/modals/DiscrepancyAuditModal';
import archetypesData from '../data/archetypes.json';
import { 
  calculateArchetypeKey,
  getArchetypeIdentity, 
  getStatLevelText, 
  getRubricText, 
  analyzeArchetype, 
  analyzeRadarMorphology,
  analyzeOuterLayer,
  STAT_DEFINITIONS, 
  STAT_KEYS,
  OUTER_DEFINITIONS,
  OUTER_KEYS,
  UNIVERSAL_BASELINE,
  ROLE_TARGET_PROFILES,
  getRoleTargetProfile,
  DATA_ANCHOR_GUIDE,
  getStatDisplay,
  getCorporateArchetypePersona,
  generateHeuristicTalentDiagnostic,
  aggregateStaffTaskTelemetry,
  getStaffRoleType,
  getStaffAssignedProjects,
  NINE_BOX_DEFINITIONS,
  calculateBusinessRiskIndex,
  calculateSuccessionReadiness,
  doesDiscrepancyPenalizeStaff
} from '../utils/archetypeEngine';

export default function TeamStatusTab({
  teamUnlk,
  setTeamUnlk,
  pwd,
  setPwd,
  sets,
  setSets,
  saveD,
  teamForm,
  setTeamForm,
  selTeam,
  setSelTeam,
  teamEditMode,
  setTeamEditMode,
  setCropModal,
  setCropImg: _setCropImg,
  saveTeam,
  Icon,
  setAlert: _setAlert,
  tasks = [],
  getProjName: propGetProjName = null,
  isSupervisor = false,
  supervisorSession = null,
  onOpenSupervisorModal = null,
  initialFocusMode = false,
  currentMonth = null
}) {
  const getProjName = propGetProjName || ((str) => str ? String(str).split('|')[0] : '');
  const [subTabProjSearch, setSubTabProjSearch] = useState('');
  const [assessMode, setAssessMode] = useState(false);
  const [selectedRadarAxis, setSelectedRadarAxis] = useState(null);
  const [cinematicViewMode, setCinematicViewMode] = useState('avatar');
  const [talentViewMode, setTalentViewMode] = useState('rpg'); // 'rpg' | 'corporate'
  const [staffReportModalOpen, setStaffReportModalOpen] = useState(false);
  const [aiAdvisorModalOpen, setAiAdvisorModalOpen] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [discrepancyModalOpen, setDiscrepancyModalOpen] = useState(false);
  const [auditInitialTaskId, setAuditInitialTaskId] = useState(null);
  const [discrepancyViewFilter, setDiscrepancyViewFilter] = useState('affecting'); // 'affecting' | 'all' | 'waived' | 'history'
  const [activeSubTab, setActiveSubTab] = useState('performance'); // 'performance' | 'field_logs' | 'settings'
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(initialFocusMode);

  const now = new Date();
  const currentSystemMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [evalMonth, setEvalMonth] = useState(currentMonth || currentSystemMonth);

  const modalTelemetry = React.useMemo(() => {
    const targetStaff = teamForm?.id ? teamForm : selTeam;
    if (!targetStaff || !discrepancyModalOpen) return { discrepancyTasks: [], priorResolvedDiscrepancies: [] };
    return aggregateStaffTaskTelemetry(targetStaff, tasks, sets, evalMonth);
  }, [teamForm, selTeam, tasks, sets, evalMonth, discrepancyModalOpen]);

  useEffect(() => {
    if (currentMonth) setEvalMonth(currentMonth);
  }, [currentMonth]);

  const sList = sets?.staffStats || [];
  const classMap = (sets?.staffClasses || []).reduce((a, c) => { a[c.id] = c; return a; }, {});

  // Escape key exits Focus Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Lock body scroll during Focus Mode
  useEffect(() => {
    if (isFocusMode && typeof document !== 'undefined') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFocusMode]);

  // Deep link URL param effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('fullscreen') === 'true') {
        setIsFocusMode(true);
        if (setTeamUnlk) setTeamUnlk(true);
      }
      const paramStaffId = params.get('staffId');
      if (paramStaffId) {
        const found = (sets?.staffStats || []).find(s => String(s.id) === String(paramStaffId));
        if (found) {
          setSelTeam(found);
          const assigned = (found.assignedProjects && found.assignedProjects.length > 0) ? found.assignedProjects : getStaffAssignedProjects(found, sets);
          setTeamForm({ ...found, assignedProjects: assigned, email: found.email || '' });
        }
      }
    }
  }, [sets?.staffStats, setTeamUnlk]);

  // Auto-select first staff member if in Focus Mode with none selected
  useEffect(() => {
    if (isFocusMode && (!selTeam && !teamForm?.name && !teamForm?.id) && sList.length > 0) {
      const firstStaff = sList[0];
      setSelTeam(firstStaff);
      const assigned = (firstStaff.assignedProjects && firstStaff.assignedProjects.length > 0)
        ? firstStaff.assignedProjects
        : getStaffAssignedProjects(firstStaff, sets);
      setTeamForm({ ...firstStaff, assignedProjects: assigned, email: firstStaff.email || '' });
    }
  }, [isFocusMode, sList, selTeam, teamForm]);

  const currentStaffIndex = sList.findIndex(s => String(s.id) === String(teamForm?.id || selTeam?.id));
  const prevStaffMember = currentStaffIndex > 0 ? sList[currentStaffIndex - 1] : sList[sList.length - 1];
  const nextStaffMember = currentStaffIndex >= 0 && currentStaffIndex < sList.length - 1 ? sList[currentStaffIndex + 1] : sList[0];

  const handleSelectStaff = (targetStaff) => {
    if (!targetStaff) return;
    setSelTeam(targetStaff);
    const assigned = (targetStaff.assignedProjects && targetStaff.assignedProjects.length > 0)
      ? targetStaff.assignedProjects
      : getStaffAssignedProjects(targetStaff, sets);
    setTeamForm({ ...targetStaff, assignedProjects: assigned, email: targetStaff.email || '' });
  };

  const handleOpenInNewTab = (customStaffId = null) => {
    const staffId = customStaffId || teamForm?.id || selTeam?.id || '';
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'team');
      if (staffId) currentUrl.searchParams.set('staffId', staffId);
      currentUrl.searchParams.set('fullscreen', 'true');
      window.open(currentUrl.toString(), '_blank');
    }
  };

  if (!teamUnlk && !isSupervisor && !isFocusMode) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md mx-auto mt-12 animate-in zoom-in-95">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
          <Icon name="users" size={28} className="text-[#0f2e4a]" />
        </div>
        <h2 className="text-lg font-bold mb-1 text-[#0f2e4a]">ระบบสถานะและประเมินศักยภาพทีมงาน</h2>
        <p className="text-xs text-slate-500 mb-6">Talent Engine 2.0 & Competency Framework</p>
        
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTeamUnlk(true)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-slate-300 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Icon name="eye" size={15} />
            <span>เข้าชมในโหมดผู้ใช้งานทั่วไป (View Only)</span>
          </button>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase">หรือ</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            type="button"
            onClick={onOpenSupervisorModal || (() => {})}
            className="w-full bg-gradient-to-r from-[#0f2e4a] to-[#1a446c] hover:from-[#163a5d] hover:to-[#225686] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="shieldCheck" size={16} className="text-amber-400" />
            <span>ยืนยันตัวตนโหมดผู้ดูแล (Supervisor PIN + GPS)</span>
          </button>
        </div>
      </div>
    );
  }
    
    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (setCropModal) {
          setCropModal({ isOpen: true, imageSrc: ev.target.result, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });
        }
      };
      reader.readAsDataURL(file);
    };

    const handleExcelUpload = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames.includes('ประเมินผลทีม') ? 'ประเมินผลทีม' : workbook.SheetNames[1] || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let ns = [...(sets.staffStats||[])];
          let addedCount = 0;
          for(let i=2; i<rows.length; i++) {
            const row = rows[i];
            if(!row || !row[0] || row[0].toString().trim() === '') continue;
            
            const name = row[0].toString().trim();
            const avg = (arr) => {
               const valid = arr.filter(v => typeof v === 'number');
               if(valid.length === 0) return 5;
               const sum = valid.reduce((a,b)=>a+b,0);
               const rawAvg = sum/valid.length;
               const r1 = Math.round(rawAvg * 10) / 10;
               return Math.round(r1);
            };
            const str = avg([row[10], row[11], row[12]]);
            const agi = avg([row[13], row[14], row[15]]);
            const dex = avg([row[16], row[17], row[18]]);
            const int = avg([row[19], row[20], row[21], row[22], row[27], row[28]]);
            const con = avg([row[23], row[24], row[25]]);
            const sen = avg([row[26], row[29], row[30]]);
            
            const stats = { str, agi, dex, int, con, sen };
            const archetypeKey = calculateArchetypeKey(stats, archetypesData);
            const potentialIdentity = getArchetypeIdentity(stats, archetypesData);
            
            const parseScore = (v, fb = 5) => (typeof v === 'number' && v >= 1 && v <= 10) ? Math.round(v) : fb;
            const innerScores = {
              str: [parseScore(row[10], str), parseScore(row[11], str), parseScore(row[12], str)],
              agi: [parseScore(row[13], agi), parseScore(row[14], agi), parseScore(row[15], agi)],
              dex: [parseScore(row[16], dex), parseScore(row[17], dex), parseScore(row[18], dex)],
              int: [parseScore(row[19], int), parseScore(row[20], int), parseScore(row[21], int)],
              con: [parseScore(row[23], con), parseScore(row[24], con), parseScore(row[25], con)],
              sen: [parseScore(row[26], sen), parseScore(row[29], sen), parseScore(row[30], sen)]
            };

            const existingIdx = ns.findIndex(x => x.name === name);
            const newObj = {
              name: name, str, agi, dex, int, con, sen, archetypeKey, potentialIdentity, innerScores, subScores: innerScores
            };
            if(existingIdx > -1) {
              ns[existingIdx] = {...ns[existingIdx], ...newObj};
            } else {
              ns.push({ id: Date.now().toString() + i, classId: '', image: '', ...newObj });
            }
            addedCount++;
          }
          const newSets = {...sets, staffStats: ns};
          setSets(newSets);
          saveD('settings', newSets);
          alert(`นำเข้าข้อมูลพนักงานสำเร็จจำนวน ${addedCount} รายการ!`);
        } catch (err) {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบว่าเลือกไฟล์ที่ถูกต้อง');
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = null;
    };
    
    const renderCinematicView = () => {
      const u = teamForm;
      if (!u.id && !selTeam?.isNew && !u.name) return null;
      const role = classMap[u.classId];
      const telemetry = aggregateStaffTaskTelemetry(u, tasks, sets, evalMonth);

      const statsObj = { str: Number(u.str)||0, agi: Number(u.agi)||0, dex: Number(u.dex)||0, int: Number(u.int)||0, con: Number(u.con)||0, sen: Number(u.sen)||0 };
      const archAnalysis = analyzeArchetype(u, sets, archetypesData) || {};
      const archetypeKey = archAnalysis.archetypeKey || 'generalist';
      const archObj = archAnalysis.archObj || archetypesData.find(a => a.key === archetypeKey) || {};
      const enTitle = archAnalysis.enTitle || archObj.name || 'Specialist';
      const thTitle = archAnalysis.thTitle || archObj.thai || '';
      const identityText = archAnalysis.identityText || archObj.identity || '-';
      const styleDesc = archAnalysis.styleDesc || archObj.desc || '';
      const prefixText = archAnalysis.prefixText || '';
      const flavorMap = {
        'Master': 'ระดับปรมาจารย์',
        'Senior': 'ระดับอาวุโส',
        'Elite': 'ระดับผู้เชี่ยวชาญสูงสุด',
        'Expert': 'ระดับผู้เชี่ยวชาญ',
        'Veteran': 'ระดับชำนาญการ',
        'Adept': 'ระดับผู้มีความสามารถ',
        'Trainee': 'ระดับผู้ฝึกฝน'
      };
      const flavorText = flavorMap[prefixText] || '';

      const isCorporate = talentViewMode === 'corporate';
      const heuristic = generateHeuristicTalentDiagnostic(u, sets, archetypesData) || {};
      const corporatePersona = heuristic?.corporatePersona || getCorporateArchetypePersona(archetypeKey, enTitle);
      const corporateTierName = heuristic?.corporateTierName || (
        archAnalysis.competencyTier?.level === 4
          ? 'Tier 4: Benchmark Role Model (ระดับต้นแบบองค์กร)'
          : archAnalysis.competencyTier?.level === 3
          ? 'Tier 3: Advanced Professional (ระดับชำนาญการเฉพาะทาง)'
          : archAnalysis.competencyTier?.level === 2
          ? 'Tier 2: Standard Competent (ระดับมาตรฐานการทำงาน)'
          : 'Tier 1: Developing Associate (ระดับพัฒนาสมรรถนะ)'
      );

      const displayTitle = isCorporate ? corporatePersona.title : enTitle;
      const displaySubStyle = isCorporate ? corporatePersona.thai : (thTitle ? `${thTitle} ${flavorText ? `(${flavorText})` : ''}` : '');
      const displayTierBadge = isCorporate ? corporateTierName : `${archAnalysis.competencyTier?.name} (${archAnalysis.competencyTier?.thai || ''})`;

      const bottomDescText = (
        <span className="flex flex-col gap-2 mt-2 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800/80">
          {/* Tier & Assessment Badge */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-stone-800/60">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isCorporate ? 'text-sky-300 bg-sky-950/80 border-sky-700' : (archAnalysis.competencyTier?.badgeColor || 'text-sky-300 bg-sky-950/60 border-sky-800')}`}>
              {displayTierBadge}
            </span>
            <button
              type="button"
              onClick={() => setAiAdvisorModalOpen(true)}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 flex items-center gap-1 shadow-xs transition"
            >
              <Icon name="sparkles" size={11} />
              <span>วิเคราะห์เชิงลึก AI</span>
            </button>
          </div>

          {/* กล่องข้อความสีฟ้า: BARS Behavioral Rubric Spotlight จาก rubrics.json */}
          {heuristic?.primaryBarsStrength && (
            <div className="p-3 rounded-lg bg-sky-950/70 border border-sky-400/80 text-sky-100 shadow-[0_0_20px_rgba(14,165,233,0.25)] flex flex-col gap-2 my-1">
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-sky-800/80">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Icon name="award" size={14} className="text-sky-400 shrink-0" />
                  <span>
                    พฤติกรรมเชิงประจักษ์จริง (BARS Level {heuristic.primaryBarsStrength.level}): {isCorporate ? heuristic.primaryBarsStrength.corporateName : heuristic.primaryBarsStrength.statName}
                  </span>
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-sky-900/90 text-sky-200 border border-sky-600 font-mono shrink-0">
                  rubrics.json
                </span>
              </div>
              <div className="text-[10px] font-bold text-sky-300">
                หมวด: 「{heuristic.primaryBarsStrength.criterionLabel}」
              </div>
              <p className="text-[11px] text-sky-100 italic leading-relaxed bg-sky-900/40 p-2.5 rounded-md border border-sky-700/50">
                "{heuristic.primaryBarsStrength.behaviorText}"
              </p>
              {heuristic.primaryBarsNextMilestone?.behaviorText && (
                <div className="pt-1.5 border-t border-sky-800/70 flex items-start gap-1.5 text-[10px] text-sky-200">
                  <span className="text-amber-300 font-bold shrink-0 flex items-center gap-1">
                    <Icon name="target" size={13} className="text-amber-400" />
                    เป้าหมายถัดไป (Level {heuristic.primaryBarsNextMilestone.targetLevel}):
                  </span>
                  <span className="leading-snug text-slate-200">
                    "{heuristic.primaryBarsNextMilestone.behaviorText}"
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Strengths / Baseline Status */}
          <span className="flex items-start text-xs leading-relaxed">
            <span className={`${archAnalysis.dynamicStrengthColor || 'text-emerald-400'} font-bold mr-1 shrink-0`}>
              {isCorporate ? 'สมรรถนะเด่นที่ผ่านการพิสูจน์:' : (archAnalysis.dynamicStrengthLabel || 'จุดเด่นของสายอาชีพ:')}
            </span>
            <span className="text-stone-300">{archAnalysis.dynamicStrength || archObj.strengths}</span>
          </span>

          {/* Dynamic Weakness / Critical Deficit */}
          {archAnalysis.dynamicWeakness && (
            <span className="flex items-start text-xs leading-relaxed">
              <span className={`font-bold mr-1 shrink-0 ${archAnalysis.weaknessColor || 'text-amber-400'}`}>
                {isCorporate ? 'แผนพัฒนาสมรรถนะ:' : (archAnalysis.weaknessLabel || 'ข้อเสนอแนะในการพัฒนา:')}
              </span>
              <span className="text-stone-300">{archAnalysis.dynamicWeakness}</span>
            </span>
          )}

          {/* Action Playbook for Managers */}
          {archAnalysis.actionPlaybook && (
            <div className="mt-1 pt-1.5 border-t border-stone-800/60 flex items-center justify-between text-[10px]">
              <span className="text-stone-400 flex items-center gap-1">
                <span className="text-amber-400 font-bold">💡 คำแนะนำหัวหน้า:</span>
                <strong className="text-stone-200">{archAnalysis.actionPlaybook.title}</strong>
              </span>
              <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${archAnalysis.actionPlaybook.color}`}>
                {archAnalysis.actionPlaybook.tag}
              </span>
            </div>
          )}
        </span>
      );

      const outerSummary = analyzeOuterLayer(u, statsObj, { telemetry });
      const outers = [
        { k: 'cx', n: 'Customer Exp.' },
        { k: 'tech', n: 'Tech. Expertise' },
        { k: 'sla', n: 'Ops & SLA' },
        { k: 'crisis', n: 'Crisis Resolv.' },
        { k: 'resource', n: 'Resource Ctrl.' },
        { k: 'innovation', n: 'Innovation' }
      ].map(o => ({
        ...o,
        penalty: outerSummary.penaltiesByAxis?.[o.k] || 0,
        rawVal: outerSummary.rawValues?.[o.k],
        finalVal: outerSummary.isAssessed && outerSummary.actualValues[o.k] !== null && outerSummary.actualValues[o.k] !== undefined
          ? outerSummary.actualValues[o.k]
          : null
      }));

      return (
          <>
            <AssessmentModal 
               isOpen={assessMode} 
               onClose={() => setAssessMode(false)} 
               staff={teamForm?.id ? teamForm : selTeam} 
               onSave={(newStats) => {
                  const ns = [...(sets.staffStats||[])];
                  const currentTarget = (teamForm?.id ? teamForm : selTeam) || {};
                  const targetId = String(currentTarget.id || '');
                  const idx = ns.findIndex(x => String(x.id) === targetId);
                  let updatedStaff;
                  if (idx >= 0) {
                     updatedStaff = { ...ns[idx], ...newStats };
                     ns[idx] = updatedStaff;
                  } else {
                     updatedStaff = { ...currentTarget, ...newStats, id: targetId || Date.now().toString() };
                     ns.push(updatedStaff);
                  }
                  const newSets = { ...sets, staffStats: ns };
                  setSets(newSets);
                  saveD('settings', newSets);
                  setTeamForm(updatedStaff);
                  setSelTeam(updatedStaff);
                  setAssessMode(false);
                  alert('บันทึกผลการประเมินเรียบร้อยแล้ว!\n\nพนักงานได้รับการอัปเดตสเตตัสเรียบร้อย');
               }}
            />
        <div key={u.id || 'new'} className={`animate-fade-in-up flex-1 w-full bg-[#060A14] relative flex flex-col ${isFocusMode ? 'rounded-none h-screen' : 'rounded-xl h-full'} overflow-hidden shadow-2xl min-h-[450px]`}>
           {/* Ambient High Luxury Background Glow */}
           <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
              <div className="absolute -top-40 -right-40 w-[650px] h-[650px] bg-[#7A1C28]/10 rounded-full blur-[160px]"></div>
              <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-[#0F2E4A]/30 rounded-full blur-[160px]"></div>
              <div className="absolute bottom-0 right-1/3 w-[450px] h-[450px] bg-[#C5A059]/5 rounded-full blur-[140px]"></div>
           </div>

           {/* =========================================================================
               EXECUTIVE COMMAND HEADER (TOP NAVIGATION & CONTROLS)
               ========================================================================= */}
           <div className="bg-[#0A1222] border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-white z-20">
              {/* Left: Staff Identity Pill & Focus Mode Controls */}
              <div className="flex items-center gap-2.5 min-w-0">
                 {isFocusMode && (
                    <button
                       type="button"
                       onClick={() => setIsFocusMode(false)}
                       className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 transition flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-xs"
                       title="ย่อกลับสู่หน้าจอปกติ (หรือกดปุ่ม Esc)"
                    >
                       <Icon name="arrowLeft" size={13} className="text-amber-400" />
                       <span className="hidden sm:inline">ย่อหน้าจอ</span>
                       <kbd className="hidden lg:inline px-1 py-0.2 rounded bg-black/40 text-[9px] text-slate-400 font-mono">ESC</kbd>
                    </button>
                 )}

                 {isFocusMode && sList.length > 0 && (
                    <div className="flex items-center gap-0.5 bg-slate-900/90 border border-white/15 rounded-lg p-0.5 shrink-0 shadow-inner">
                       <button
                          type="button"
                          onClick={() => handleSelectStaff(prevStaffMember)}
                          className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition"
                          title={`ก่อนหน้า: ${prevStaffMember?.name || ''}`}
                       >
                          <Icon name="chevronLeft" size={15} />
                       </button>
                       <select
                          value={teamForm.id || selTeam?.id || ''}
                          onChange={(e) => {
                             const target = sList.find(s => String(s.id) === String(e.target.value));
                             if (target) handleSelectStaff(target);
                          }}
                          className="bg-transparent text-xs text-amber-200 font-bold px-1.5 py-1 focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[150px] truncate"
                       >
                          {sList.map(s => (
                             <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                                {s.name} ({classMap[s.classId]?.name || 'ทั่วไป'})
                             </option>
                          ))}
                       </select>
                       <button
                          type="button"
                          onClick={() => handleSelectStaff(nextStaffMember)}
                          className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition"
                          title={`ถัดไป: ${nextStaffMember?.name || ''}`}
                       >
                          <Icon name="chevronRight" size={15} />
                       </button>
                    </div>
                 )}

                 <div className="w-9 h-9 rounded-full border border-[#bca374] overflow-hidden bg-[#0f2e4a] flex items-center justify-center shrink-0 shadow-xs">
                    {u.image ? (
                       <img src={u.image} className="w-full h-full object-cover" alt={u.name} />
                    ) : (
                       <Icon name="user" size={18} className="text-[#bca374]" />
                    )}
                 </div>
                 <div className="truncate text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                       <h3 className="font-black text-sm text-white truncate">{u.name || 'พนักงานใหม่'}</h3>
                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${telemetry.badgeClass}`}>
                          {telemetry.roleTitle}
                       </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                       {role?.name || 'ไม่ระบุสายอาชีพ'} • {displayTitle}
                    </span>
                 </div>
              </div>

              {/* Center: 3 Segmented Sub-Tabs */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 shadow-inner">
                 <button
                    type="button"
                    onClick={() => setActiveSubTab('performance')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                       activeSubTab === 'performance'
                          ? 'bg-gradient-to-r from-[#7A1C28] to-[#55131C] text-white shadow-md border border-[#C5A059]/30'
                          : 'text-slate-400 hover:text-white'
                    }`}
                 >
                    <Icon name="award" size={14} className={activeSubTab === 'performance' ? 'text-[#C5A059]' : 'text-slate-400'} />
                    <span>1. สมรรถนะ &amp; ศักยภาพ</span>
                 </button>

                 <button
                    type="button"
                    onClick={() => setActiveSubTab('field_logs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                       activeSubTab === 'field_logs'
                          ? 'bg-gradient-to-r from-[#0F2E4A] to-[#1E3A5F] text-white shadow-md border border-sky-400/30'
                          : 'text-slate-400 hover:text-white'
                    }`}
                 >
                    <Icon name="clipboardList" size={14} className={activeSubTab === 'field_logs' ? 'text-sky-300' : 'text-slate-400'} />
                    <span>2. บันทึกงาน &amp; Telemetry</span>
                    {telemetry.discrepancyTasks && telemetry.discrepancyTasks.length > 0 && (
                       <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                          {telemetry.discrepancyTasks.length}
                       </span>
                    )}
                 </button>

                 <button
                    type="button"
                    onClick={() => setActiveSubTab('settings')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                       activeSubTab === 'settings'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                    }`}
                 >
                    <Icon name="settings" size={14} className={activeSubTab === 'settings' ? 'text-amber-300' : 'text-slate-400'} />
                    <span>3. ตั้งค่า &amp; ข้อมูล</span>
                 </button>
              </div>

              {/* Right: Mode & Quick Actions */}
              <div className="flex items-center gap-2">
                 {/* Dual Mode Switch */}
                 <div className="flex items-center bg-slate-950/90 p-0.5 rounded-full border border-white/20 text-[10px]">
                    <button
                       type="button"
                       onClick={() => setTalentViewMode('rpg')}
                       className={`px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1 ${
                          talentViewMode === 'rpg'
                             ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-xs'
                             : 'text-slate-400 hover:text-white'
                       }`}
                       title="มุมมองแบบจำลองเกม (RPG Mode)"
                    >
                       <span>🎮 RPG</span>
                    </button>
                    <button
                       type="button"
                       onClick={() => setTalentViewMode('corporate')}
                       className={`px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1 ${
                          talentViewMode === 'corporate'
                             ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                             : 'text-slate-400 hover:text-white'
                       }`}
                       title="มุมมองสมรรถนะองค์กรผู้บริหาร (Corporate Mode)"
                    >
                       <span>💼 Corporate</span>
                    </button>
                 </div>

                 {/* Fullscreen Theater Toggle Button */}
                 <button
                    type="button"
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition border ${
                       isFocusMode
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20 shadow-xs'
                    }`}
                    title={isFocusMode ? "ย่อหน้าจอสู่มุมมองปกติ (Esc)" : "ขยายห้องตัดสินเต็มจอ (Focus Theater Mode)"}
                 >
                    <Icon name={isFocusMode ? "minimize2" : "maximize2"} size={13} className="text-amber-400" />
                    <span className="hidden md:inline">{isFocusMode ? "ย่อหน้าจอ" : "ห้องตัดสินเต็มจอ"}</span>
                 </button>

                 {/* Open in New Tab Button */}
                 <button
                    type="button"
                    onClick={() => handleOpenInNewTab()}
                    className="px-2.5 py-1.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 hover:bg-sky-500/30 font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                    title="เปิดห้องตัดสินนี้ในหน้าต่างเว็บใหม่ (New Window / Tab) สำหรับเปิดเทียบ 2 หน้าจอ"
                 >
                    <Icon name="externalLink" size={13} className="text-sky-300" />
                    <span className="hidden md:inline">เปิดแท็บใหม่</span>
                 </button>

                 {/* Supervisor Status Button */}
                 <button
                    type="button"
                    onClick={() => {
                       if (!isSupervisor && onOpenSupervisorModal) onOpenSupervisorModal();
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition flex items-center gap-1 ${
                       isSupervisor
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                    title={isSupervisor ? `ผู้ดูแล: ${supervisorSession?.supervisorName || 'อนุมัติแล้ว'}` : 'คลิกเพื่อสลับเป็นโหมดผู้ดูแล (PIN)'}
                 >
                    <Icon name={isSupervisor ? 'shieldCheck' : 'user'} size={12} className={isSupervisor ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>{isSupervisor ? '🛡️ ผู้ดูแล' : '👤 ผู้ใช้งาน'}</span>
                 </button>

                 {/* AI Advisor Button */}
                 <button
                    type="button"
                    onClick={() => setAiAdvisorModalOpen(true)}
                    className="bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/40 hover:to-amber-600/50 border border-amber-400/40 text-amber-300 hover:text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs transition"
                    title="วิเคราะห์ศักยภาพด้วย AI"
                 >
                    <Icon name="sparkles" size={13} className="text-amber-300" />
                    <span className="hidden sm:inline">AI วิเคราะห์</span>
                 </button>

                 {/* More Actions Dropdown */}
                 <div className="relative">
                    <button
                       type="button"
                       onClick={() => setMoreActionsOpen(!moreActionsOpen)}
                       className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition"
                       title="การดำเนินการเพิ่มเติม"
                    >
                       <Icon name="moreVertical" size={15} />
                    </button>

                    {moreActionsOpen && (
                       <>
                          <div className="fixed inset-0 z-40" onClick={() => setMoreActionsOpen(false)}></div>
                          <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/15 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                             <button
                                type="button"
                                onClick={() => { setMoreActionsOpen(false); setAssessMode(true); }}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-slate-200"
                             >
                                <Icon name="clipboardCheck" size={14} className="text-indigo-400" />
                                <span>เปิดตัวช่วยประเมิน (Wizard)</span>
                             </button>
                             <button
                                type="button"
                                onClick={() => { setMoreActionsOpen(false); setStaffReportModalOpen(true); }}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-slate-200"
                             >
                                <Icon name="printer" size={14} className="text-sky-400" />
                                <span>พิมพ์รายงาน A4 (Character Sheet)</span>
                             </button>
                             <button
                                type="button"
                                onClick={() => {
                                   setMoreActionsOpen(false);
                                   if (!isSupervisor) {
                                      if (onOpenSupervisorModal) onOpenSupervisorModal();
                                      else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อตรวจสอบเทียบระดับศักยภาพทั้งทีม');
                                      return;
                                   }
                                   setCalibrationModalOpen(true);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-slate-200"
                             >
                                <Icon name="sliders" size={14} className="text-amber-400" />
                                <span>ตรวจสอบเทียบระดับทั้งทีม (Calibration)</span>
                             </button>
                             <div className="border-t border-white/10 my-1"></div>
                             <button
                                type="button"
                                onClick={() => { setMoreActionsOpen(false); setActiveSubTab('settings'); }}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-slate-200"
                             >
                                <Icon name="edit" size={14} className="text-slate-400" />
                                <span>แก้ไขข้อมูลพื้นฐาน &amp; สเตตัส</span>
                             </button>
                          </div>
                       </>
                    )}
                 </div>
              </div>
           </div>

           {/* =========================================================================
               SUB-TAB 1: CHARACTER & PERFORMANCE (HERO STAGE + ANALYSIS SUITE)
               ========================================================================= */}
           {activeSubTab === 'performance' && (
              <div className="flex-1 w-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative z-10 min-h-0 custom-scrollbar">
                 {/* Left Column (Scrollable Intelligence Suite) */}
                 <div className={`w-full ${isFocusMode ? 'md:w-[62%] lg:w-[64%] 2xl:w-[66%] p-6 lg:p-8 space-y-6' : 'md:w-[58%] lg:w-[60%] p-5 lg:p-7 space-y-5'} md:h-full md:overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/10 text-left min-h-0`}>

              <div className="animate-in fade-in slide-in-from-left-8 duration-700 mt-auto mb-auto py-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-5 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] group">
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-full mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                    <ClassEmblem archetypeKey={archetypeKey} size="100%" className="text-white transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="flex flex-col">
                    <h5 className="text-[#bca374] text-[10px] sm:text-xs lg:text-sm font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md flex flex-wrap items-center gap-2">
                       <span>{role?.name || 'ไม่ระบุสายอาชีพ'}</span>
                       {prefixText && !isCorporate && <span className="bg-[#bca374]/20 text-[#e6d0a7] px-2 py-0.5 rounded text-[9px] border border-[#bca374]/30">{prefixText}</span>}
                       {isCorporate && <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-[9px] border border-sky-400/30">Corporate Competency</span>}
                    </h5>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg" style={{textShadow: isCorporate ? '0 4px 20px rgba(56,189,248,0.3)' : '0 4px 20px rgba(188,163,116,0.3)'}}>
                       {displayTitle}
                    </h1>
                  </div>
                </div>
                <div className={`mb-4 lg:mb-5 border-l-2 ${isCorporate ? 'border-sky-400/80 bg-sky-950/20' : 'border-[#C5A059]/80 bg-[#C5A059]/5'} pl-3.5 py-1 rounded-r-xl`}>
                  <p className="text-[11px] sm:text-xs lg:text-sm text-slate-300 font-light italic mb-1.5 lg:mb-2 leading-relaxed">
                     "{styleDesc}"
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-400 leading-relaxed font-bold mb-1">
                     {isCorporate ? 'กลุ่มสมรรถนะเชิงวิชาชีพ:' : 'สไตล์และแนวทางการทำงาน:'} <span className={isCorporate ? 'text-sky-300 font-bold' : 'text-[#e6d0a7] font-bold'}>{displaySubStyle}</span>
                  </p>
                  <div className="text-[9px] sm:text-[10px] lg:text-[11px] text-slate-300 leading-relaxed drop-shadow-md">
                     {bottomDescText}
                  </div>
                </div>

                {/* Project Scope & TaskFlow Operational Telemetry Grounding */}
                {(() => {
                  const telemetry = aggregateStaffTaskTelemetry(u, tasks, sets, evalMonth);
                  return (
                    <div className="mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2 backdrop-blur-md">
                      {/* Role Classification & Project Scope Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${telemetry.badgeClass}`}>
                            {telemetry.roleBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Icon name="mapPin" size={12} className="text-[#bca374]" />
                          <span>ขอบเขต:</span>
                          {telemetry.assignedProjects.length > 0 ? (
                            <span className="text-[#e6d0a7] font-bold">
                              {telemetry.assignedProjects.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">ไม่ระบุโครงการ</span>
                          )}
                        </div>
                      </div>

                      {/* If Officer: Show clear Exemption Notice */}
                      {telemetry.isExempt ? (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-200 text-[11px] flex items-start gap-2">
                          <Icon name="shield" size={15} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-300 font-bold block">บทบาทผู้กำกับดูแลและประเมินโครงการ (Evaluator Role)</strong>
                            <span>{telemetry.reason}</span>
                          </div>
                        </div>
                      ) : (
                        /* If Foreman or Admin: Show Real TaskFlow KPI Telemetry */
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[9px] text-slate-400 block">งานในขอบเขต</span>
                              <strong className="text-xs text-white font-bold">{telemetry.totalTasks} งาน</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[9px] text-slate-400 block">ปิดงานสำเร็จ</span>
                              <strong className="text-xs text-emerald-400 font-bold">{telemetry.completedTasks} งาน</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[9px] text-slate-400 block">อัตราตรงเวลา (SLA)</span>
                              <strong className={`text-xs font-bold ${telemetry.slaRate >= 85 ? 'text-emerald-400' : telemetry.slaRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {telemetry.slaRate}%
                              </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-[9px] text-slate-400 block">งานค้างเกินกำหนด</span>
                              <strong className={`text-xs font-bold ${telemetry.activeOverdueTasks > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                                {telemetry.activeOverdueTasks} งาน
                              </strong>
                            </div>
                          </div>

                          {/* Operational RACI Flags / Penalty Breakdown */}
                          {telemetry.penalties && telemetry.penalties.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {telemetry.penalties.map((pen, pIdx) => (
                                <div key={pIdx} className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-[10px] flex items-start justify-between gap-2">
                                  <span className="leading-snug">⚠️ {pen.reason}</span>
                                  <span className="font-bold text-rose-400 font-mono shrink-0">-{pen.points} pt ({pen.axis.toUpperCase()})</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Disciplinary / Warning Alerts */}
                          {telemetry.alerts && telemetry.alerts.length > 0 && (
                            <div className="space-y-1">
                              {telemetry.alerts.map((alt, aIdx) => (
                                <div key={aIdx} className={`p-2 rounded-lg text-[10px] flex items-start gap-1.5 ${
                                  alt.type === 'danger' ? 'bg-rose-900/40 border border-rose-500/50 text-rose-200' : 'bg-amber-900/30 border border-amber-500/40 text-amber-200'
                                }`}>
                                  <Icon name={alt.type === 'danger' ? 'alertOctagon' : 'alertTriangle'} size={13} className="shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="block font-bold">{alt.title}</strong>
                                    <span>{alt.desc}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Discrepancy Audit Trigger Button */}
                          {telemetry.discrepancyTasks && telemetry.discrepancyTasks.length > 0 && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setDiscrepancyModalOpen(true)}
                                className="w-full py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition flex items-center justify-between gap-2 shadow-xs cursor-pointer group"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Icon name="scale" size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                  <span>ตรวจสอบงานผิดเงื่อนไข & วินิจฉัยความรับผิดชอบ</span>
                                </span>
                                <span className="bg-amber-500/30 text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                                  {telemetry.discrepancyTasks.length} รายการ
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="grid grid-cols-2 2xl:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3 mb-4 lg:mb-5">
                   {[
                     { k: 'str', c: 'from-rose-600 to-rose-400' },
                     { k: 'agi', c: 'from-emerald-600 to-emerald-400' },
                     { k: 'dex', c: 'from-amber-600 to-amber-400' },
                     { k: 'int', c: 'from-blue-600 to-blue-400' },
                     { k: 'con', c: 'from-orange-600 to-orange-400' },
                     { k: 'sen', c: 'from-purple-600 to-purple-400' }
                   ].map(s => {
                     const val = statsObj[s.k];
                     const disp = getStatDisplay(s.k, talentViewMode);
                     const labelText = isCorporate ? `${disp.code} (${disp.thai})` : `${disp.label} (${disp.thai})`;
                     return (
                       <div key={s.k} className="flex flex-col" title={`${disp.name}: ${disp.desc}`}>
                          <div className="flex justify-between items-end mb-1">
                             <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 tracking-wider truncate mr-1" title={disp.desc}>
                               {labelText}
                             </span>
                             <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-white shrink-0">{val}</span>
                          </div>
                          <div className="w-full h-1 lg:h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                             <div className={`h-full bg-gradient-to-r ${s.c} rounded-full`} style={{width: `${(val/10)*100}%`, boxShadow: '0 0 10px currentColor'}}></div>
                          </div>
                       </div>
                     );
                   })}
                </div>

                {/* The Outer Layer Performance Intelligence */}
                {(() => {
                  const outerSummary = analyzeOuterLayer(u, statsObj, { telemetry });
                  if (!outerSummary.isAssessed) {
                    return (
                      <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2.5">
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border border-dashed border-indigo-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                              <Icon name="layers" size={18} />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-xs sm:text-sm text-slate-200 font-bold">
                                  ยังไม่ได้ประเมิน 6 แกนสมรรถนะหน้างาน (WHAT)
                                </strong>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  รอการประเมิน
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                พนักงานได้รับการประเมินเฉพาะสเตตัสศักยภาพตั้งต้น (HOW) ประเมินผลงาน 6 แกนเพื่อสังเคราะห์ DNA และ 9-Box Grid
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssessMode(true)}
                            className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Icon name="clipboard-check" size={14} />
                            <span>+ ประเมินสมรรถนะ 6 แกนต่อ</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2.5">
                      {/* Header & Performance DNA Profile */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded bg-[#bca374]/20 text-[#e6d0a7] border border-[#bca374]/30 shadow-xs">
                            <Icon name="layers" size={13} />
                          </span>
                          <div>
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              6 แกนสมรรถนะผลงาน (The Outer Layer)
                            </span>
                            <strong className="text-xs sm:text-sm text-white font-black drop-shadow tracking-tight">
                              ⭐ {outerSummary.performanceDna.title}
                            </strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {outerSummary.talentGrid && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${
                              outerSummary.talentGrid.title.includes('🚨')
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : outerSummary.talentGrid.title.includes('🌱')
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : outerSummary.talentGrid.title.includes('🏆') || outerSummary.talentGrid.title.includes('🔥')
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : outerSummary.talentGrid.title.includes('💎')
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : outerSummary.talentGrid.title.includes('🔨')
                                ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                              📦 {outerSummary.talentGrid.title}
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${
                            outerSummary.alignmentKey === 'over_achiever'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : outerSummary.alignmentKey === 'under_leveraged'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}>
                            {outerSummary.alignmentTitle}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] sm:text-[11px] text-slate-300 font-light leading-snug">
                        {outerSummary.performanceDna.desc}
                      </p>

                      {/* Best Fit Assignment & Pairing Recommendation */}
                      {(outerSummary.bestFitAssignment || outerSummary.pairingRecommendation) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[9px] sm:text-[10px]">
                          {outerSummary.bestFitAssignment && (
                            <div className="p-1.5 rounded bg-white/5 border border-white/10 text-slate-300 leading-snug">
                              <span className="text-[#e6d0a7] font-bold mr-1">🎯 ภารกิจหลักที่เหมาะสม:</span>
                              {outerSummary.bestFitAssignment}
                            </div>
                          )}
                          {outerSummary.pairingRecommendation && (
                            <div className="p-1.5 rounded bg-white/5 border border-white/10 text-slate-300 leading-snug">
                              <span className="text-purple-300 font-bold mr-1">👥 การจับคู่คู่หู (Pairing):</span>
                              {outerSummary.pairingRecommendation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Operational Risk Alerts */}
                      {outerSummary.riskAlerts && outerSummary.riskAlerts.length > 0 && (
                        <div className="space-y-1">
                          {outerSummary.riskAlerts.map((r, i) => (
                            <div key={i} className="text-[9px] sm:text-[10px] p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-1.5">
                              <Icon name="alert-triangle" size={13} className="text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-rose-300 font-bold block">{r.title}</strong>
                                <span>{r.desc} <strong className="text-rose-200 ml-1">💡 แนวทาง: {r.advice}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* HOW vs WHAT Synthesis Bar */}
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-slate-400 border-b border-white/5 pb-1">
                          <span>ศักยภาพตั้งต้น (HOW): <strong className="text-[#e6d0a7]">{outerSummary.avgInner}</strong> / 10</span>
                          <span>ผลสัมฤทธิ์จริง (WHAT): <strong className="text-white">{outerSummary.avgOuter}</strong> / 10</span>
                          <span className={outerSummary.gap >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            Gap: {outerSummary.gap > 0 ? `+${outerSummary.gap}` : outerSummary.gap}
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-slate-300 leading-tight">
                          {outerSummary.alignmentDesc}
                        </p>
                        {outerSummary.coachingAdvice && (
                          <div className="text-[8.5px] sm:text-[9.5px] text-[#e6d0a7] bg-[#bca374]/10 p-1.5 rounded border border-[#bca374]/20 leading-tight">
                            📢 <strong>โค้ชชิ่งประจำวัน (Standup):</strong> {outerSummary.coachingAdvice}
                          </div>
                        )}
                      </div>

                      {/* 6 Competency Micro-Cards */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
                        {outers.map(o => {
                          const isHigh = o.finalVal >= 8;
                          const hasPenalty = (o.penalty || 0) > 0;
                          const def = OUTER_DEFINITIONS[o.k] || {};
                          return (
                            <div 
                              key={o.k} 
                              className={`rounded-md p-1.5 flex flex-col backdrop-blur-md border transition-all duration-200 relative ${
                                hasPenalty
                                  ? 'bg-rose-950/25 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                                  : isHigh 
                                  ? 'bg-[#bca374]/15 border-[#bca374]/40 shadow-[0_0_10px_rgba(188,163,116,0.15)]' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                              title={hasPenalty ? `${def.desc || o.n} (คะแนนประเมิน ${o.rawVal} - แต้มหักวินัยห้องตัดสิน ${o.penalty})` : (def.desc || o.n)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[7.5px] sm:text-[8px] text-slate-400 uppercase tracking-tighter truncate">{def.short || o.n}</span>
                                {hasPenalty && (
                                  <span className="text-[7px] font-bold px-1 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50">
                                    -{o.penalty}
                                  </span>
                                )}
                              </div>
                              <span className={`font-black text-[11px] sm:text-xs leading-tight mt-0.5 ${hasPenalty ? 'text-rose-200' : isHigh ? 'text-[#e6d0a7]' : 'text-white'}`}>
                                {o.finalVal} <span className="text-slate-500 text-[8px] font-normal">/10</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Full Intelligence Suite Analysis (Corporate / RPG) */}
              {renderAnalysis()}
           </div>

           {/* Right Column: Hero Stage (Stationary & Always Centered, Top on Mobile) */}
           <div className={`order-first md:order-last w-full ${isFocusMode ? 'md:w-[38%] lg:w-[36%] 2xl:w-[34%]' : 'md:w-[42%] lg:w-[40%]'} md:h-full min-h-[340px] sm:min-h-[380px] md:min-h-0 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#0B1528] via-[#070D18] to-[#04070D] shrink-0 border-b md:border-b-0 md:border-l border-white/10`}>
              {/* View Mode Switcher for Hero Stage */}
              <div className="absolute top-3 z-30 flex items-center bg-black/60 p-1 rounded-full border border-white/15 backdrop-blur-md shadow-lg">
                 <button
                    type="button"
                    onClick={() => setCinematicViewMode('avatar')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                       cinematicViewMode === 'avatar' ? 'bg-[#7A1C28] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                 >
                    <Icon name="user" size={12} />
                    <span>Avatar</span>
                 </button>
                 <button
                    type="button"
                    onClick={() => setCinematicViewMode('spider')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                       cinematicViewMode === 'spider' ? 'bg-[#7A1C28] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                 >
                    <Icon name="swords" size={12} />
                    <span>Radar</span>
                 </button>
                 <button
                    type="button"
                    onClick={() => setCinematicViewMode('ninebox')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                       cinematicViewMode === 'ninebox' ? 'bg-[#7A1C28] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                 >
                    <Icon name="grid" size={12} />
                    <span>9-Box</span>
                 </button>
              </div>

              {/* High Luxury Studio Ambient Keylight */}
              <div className="absolute inset-0 bg-radial-[at_50%_45%] from-[#C5A059]/10 via-[#0F2E4A]/20 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 lg:p-6 pt-16 animate-in fade-in slide-in-from-right-8 duration-700 min-h-0 overflow-hidden select-none">
                {cinematicViewMode === 'ninebox' ? (
                  <div className="w-full flex flex-col items-center justify-center max-w-[340px] max-h-[90%] overflow-y-auto custom-scrollbar bg-slate-900/90 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="w-full flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider flex items-center gap-1">
                        <Icon name="grid" size={13} /> MCKINSEY 9-BOX MATRIX
                      </span>
                      {outerSummary.isAssessed ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ประเมินแล้ว
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          รอประเมิน WHAT
                        </span>
                      )}
                    </div>

                    {/* 3x3 Grid */}
                    <div className="w-full grid grid-cols-3 gap-1.5 my-1">
                      {NINE_BOX_DEFINITIONS.map(cell => {
                        const isMatched = outerSummary.isAssessed && outerSummary.talentGrid?.key === cell.code;
                        const isPotentialRow = !outerSummary.isAssessed && outerSummary.talentGrid?.howLevel === cell.howLevel;
                        return (
                          <div
                            key={cell.code}
                            className={`p-2 rounded-lg border flex flex-col justify-between min-h-[56px] text-center transition-all ${
                              isMatched
                                ? 'bg-sky-500/30 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] ring-2 ring-sky-300'
                                : isPotentialRow
                                ? 'bg-amber-500/10 border-amber-400/40 text-amber-200'
                                : 'bg-white/5 border-white/5 text-slate-400'
                            }`}
                          >
                            <span className={`text-[8.5px] font-bold leading-tight ${isMatched ? 'text-white font-black' : ''}`}>
                              {cell.title}
                            </span>
                            {isMatched && (
                              <span className="text-[7.5px] font-black text-sky-300 uppercase mt-0.5">
                                ● พนักงาน
                              </span>
                            )}
                            {isPotentialRow && !outerSummary.isAssessed && cell.whatLevel === 'med' && (
                              <span className="text-[7px] text-amber-300 font-bold leading-none mt-0.5">
                                แถว HOW
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-full mt-2 p-2.5 rounded-lg bg-white/5 border border-white/10 text-[9.5px] text-slate-300 leading-snug">
                      {outerSummary.isAssessed ? (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <strong className="text-sky-300 font-bold">{outerSummary.talentGrid?.title}</strong>
                            <span className="text-[8.5px] text-slate-400 font-mono">
                              HOW: {outerSummary.avgInner} | WHAT: {outerSummary.avgOuter}
                            </span>
                          </div>
                          <p className="text-[8.5px] text-slate-400">{outerSummary.talentGrid?.action}</p>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1 text-center">
                          <span className="text-amber-300 font-bold">
                            ⏳ ระบุศักยภาพแล้ว (HOW: {outerSummary.avgInner}/10)
                          </span>
                          <span className="text-[8px] text-slate-400">
                            ยังไม่ได้ประเมินผลงาน 6 แกน (WHAT) เพื่อระบุตำแหน่งใน Matrix
                          </span>
                          <button
                            type="button"
                            onClick={() => setAssessMode(true)}
                            className="mt-1 py-1 px-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9.5px] transition shadow-xs"
                          >
                            + บันทึกผลงาน 6 แกน
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : cinematicViewMode === 'spider' ? (
                  <div className="w-full flex flex-col items-center justify-center max-w-[320px] max-h-[90%] overflow-y-auto custom-scrollbar bg-slate-900/85 p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="w-full flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold text-[#bca374] tracking-wider flex items-center">
                        <Icon name="swords" size={14} className="mr-1.5" /> SPIDER PERFORMANCE MAP
                      </span>
                      {(() => {
                        const m = analyzeRadarMorphology(statsObj);
                        return (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                            {m.shapeName.split(' (')[0]}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="w-full max-w-[240px] aspect-square my-1">
                      <RadarChart 
                        userStats={[statsObj.str, statsObj.agi, statsObj.dex, statsObj.int, statsObj.con, statsObj.sen]}
                        selectedAxis={selectedRadarAxis}
                        onSelectAxis={(idx, key) => setSelectedRadarAxis(selectedRadarAxis === key ? null : key)}
                        showBaseline={true}
                        roleTargetStats={getRoleTargetProfile(role || u.classId || u.potentialIdentity).targetStats}
                      />
                    </div>
                    {(() => {
                      const m = analyzeRadarMorphology(statsObj);
                      const o = analyzeOuterLayer(u, statsObj, { telemetry });
                      return (
                        <div className="w-full mt-2 text-left space-y-1.5 text-[10px]">
                          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-[#e6d0a7] font-black text-xs">
                                {o.isAssessed ? o.performanceDna.title : 'สเตตัสศักยภาพตั้งต้น (HOW)'}
                              </strong>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                                o.isAssessed ? o.alignmentBadge : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {o.isAssessed ? o.alignmentTitle.split(' (')[0] : 'ยังไม่ประเมิน 6 แกน'}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-snug">
                              {o.isAssessed ? o.performanceDna.desc : `${m.shapeDesc} — ${m.managementAdvice}`}
                            </p>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-400 px-1 pt-0.5">
                            <span>พื้นที่ครอบคลุม: <strong className="text-[#e6d0a7]">{m.coveragePct}%</strong></span>
                            <span>{m.topFocus}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  u.image ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center py-2 group min-h-0">
                      {/* Studio Radial Keylight */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-[80px] pointer-events-none"></div>

                      {/* Luxury Smoked-Glass Base Pedestal */}
                      <div className="absolute bottom-4 w-3/4 max-w-[280px] h-11 bg-gradient-to-t from-black/85 via-white/5 to-transparent rounded-[50%] border-t border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.9)] pointer-events-none"></div>
                      <div className="absolute bottom-5 w-2/3 max-w-[240px] h-2.5 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent rounded-full blur-[2px] pointer-events-none"></div>
                      <div className="absolute bottom-6 w-1/2 max-w-[190px] h-4 bg-black/80 blur-md rounded-full pointer-events-none"></div>
                      
                      <img
                        src={u.image}
                        className="max-w-[90%] max-h-[85%] object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] drop-shadow-[0_0_20px_rgba(197,160,89,0.2)] transition-transform duration-700 hover:scale-[1.02] relative z-10 select-none pointer-events-none"
                        alt={u.name}
                      />
                    </div>
                  ) : (
                    <div className="w-56 h-56 bg-slate-800/40 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-md shadow-2xl">
                      <Icon name="user" size={64} className="text-slate-500" />
                    </div>
                  )
                )}
              </div>
              
              {/* Subtle watermarked name in background */}
              <div className="absolute bottom-8 -right-8 text-[130px] font-black text-white/5 whitespace-nowrap pointer-events-none z-0 transform -rotate-12 select-none tracking-tighter mix-blend-overlay">
                 {u.name.split(' ')[0]}
              </div>
           </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: OPERATIONAL LOGS & AUDIT TELEMETRY
          ========================================================================= */}
      {activeSubTab === 'field_logs' && (() => {
         const telemetry = aggregateStaffTaskTelemetry(u, tasks, sets, evalMonth);
         const totalPenaltyPts = (telemetry.penalties || []).reduce((sum, p) => sum + (p.points || 0), 0);

         return (
            <div className={`flex-1 w-full overflow-y-auto custom-scrollbar ${isFocusMode ? 'p-6 lg:p-10 max-w-7xl mx-auto' : 'p-5 lg:p-7'} space-y-6 text-left relative z-10`}>
               {/* Officer Exemption Notice or Role Telemetry Status */}
               {telemetry.isExempt ? (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-600/15 border border-amber-400/40 flex items-start gap-3 shadow-sm">
                     <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0 mt-0.5">
                        <Icon name="shieldCheck" size={20} />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                           <h4 className="font-bold text-amber-300 text-sm">{telemetry.roleTitle}</h4>
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                              EXEMPT FROM SLA PENALTIES
                           </span>
                        </div>
                        <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                           {telemetry.reason || 'เจ้าหน้าที่บริหารโครงการ / ผจก. LH มีบทบาทเป็นผู้กำกับดูแล (Supervisor & Approver) จึงได้รับการยกเว้นจากการนำสถิติงานภาคสนามรายใบงานมาหักคะแนน'}
                        </p>
                        <div className="mt-2 text-[11px] text-amber-200/80 flex items-center gap-2">
                           <span>โครงการในความดูแล:</span>
                           <strong className="text-white">
                              {telemetry.assignedProjects.length > 0 ? telemetry.assignedProjects.join(', ') : 'ทุกโครงการ'}
                           </strong>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                           <Icon name="clipboardList" size={20} />
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{telemetry.roleTitle}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${telemetry.badgeClass}`}>
                                 Active Telemetry
                              </span>
                           </div>
                           <span className="text-xs text-slate-400 mt-0.5 block">
                              ขอบเขตโครงการที่รับผิดชอบ: <strong className="text-slate-200">{telemetry.assignedProjects.length > 0 ? telemetry.assignedProjects.join(', ') : 'ทั้งหมด'}</strong>
                           </span>
                        </div>
                     </div>
                     <button
                        type="button"
                        onClick={() => setDiscrepancyModalOpen(true)}
                        className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                     >
                        <Icon name="scale" size={14} className="text-amber-300" />
                        <span>เปิดห้องตัดสินข้อขัดแย้ง (Audit Modal)</span>
                     </button>
                  </div>
               )}

               {/* 4 KPI Telemetry Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Workload */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ภาระงานในมือทั้งหมด</span>
                        <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                           <Icon name="briefcase" size={16} />
                        </span>
                     </div>
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-white">{telemetry.totalTasks}</span>
                        <span className="text-xs text-slate-400">งาน</span>
                     </div>
                     <div className="text-[10px] text-slate-400 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span>ปิดแล้ว: <strong className="text-emerald-400">{telemetry.completedTasks}</strong></span>
                        <span>กำลังทำ: <strong className="text-sky-300">{telemetry.activeTasks}</strong></span>
                        <span>ติดปัญหา: <strong className="text-amber-400">{telemetry.issueTasks}</strong></span>
                     </div>
                  </div>

                  {/* Card 2: On-Time SLA Rate */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">อัตราส่งมอบตรงเวลา (SLA)</span>
                        <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                           <Icon name="clock" size={16} />
                        </span>
                     </div>
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-3xl font-black ${
                           telemetry.slaRate >= 90 ? 'text-emerald-400' :
                           telemetry.slaRate >= 75 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                           {telemetry.slaRate}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                           {telemetry.slaRate >= 90 ? 'ดีเยี่ยม' : telemetry.slaRate >= 75 ? 'มาตรฐาน' : 'ต้องปรับปรุง'}
                        </span>
                     </div>
                     <div className="text-[10px] text-slate-400 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span>จบช้า: <strong className="text-rose-400">{telemetry.lateFinishedTasks}</strong></span>
                        <span>เกินกำหนดปัจจุบัน: <strong className="text-amber-400">{telemetry.activeOverdueTasks}</strong></span>
                     </div>
                  </div>

                  {/* Card 3: Disciplinary Penalties */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 shadow-sm relative overflow-hidden group hover:border-rose-500/50 transition">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">แต้มหักวินัยสะสม</span>
                        <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                           <Icon name="shieldAlert" size={16} />
                        </span>
                     </div>
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-3xl font-black ${totalPenaltyPts > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                           {totalPenaltyPts > 0 ? `-${totalPenaltyPts}` : '0'}
                        </span>
                        <span className="text-xs text-slate-400">แต้ม</span>
                     </div>
                     <div className="text-[10px] text-slate-400 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span>รายการผิดกฎ: <strong className={totalPenaltyPts > 0 ? 'text-rose-400' : 'text-emerald-400'}>{telemetry.penalties.length} ข้อ</strong></span>
                        <span>สถานะ: <strong className={totalPenaltyPts === 0 ? 'text-emerald-300' : 'text-amber-300'}>{totalPenaltyPts === 0 ? 'ไร้ข้อหัก' : 'ถูกตัดแต้ม'}</strong></span>
                     </div>
                  </div>

                  {/* Card 4: Discrepancy Tasks */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">งานขัดแย้งรอตัดสิน</span>
                        <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                           <Icon name="scale" size={16} />
                        </span>
                     </div>
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-amber-400">
                           {telemetry.discrepancyTasks?.length || 0}
                        </span>
                        <span className="text-xs text-slate-400">รายการ</span>
                     </div>
                     <div className="text-[10px] text-slate-400 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span>รออะไหล่ &gt;45 วัน: <strong className="text-amber-300">{telemetry.sparePartsOver45Days}</strong></span>
                        <span>WO ช้า &gt;3 วัน: <strong className="text-sky-300">{telemetry.lateWOTasks}</strong></span>
                     </div>
                  </div>
               </div>

               {/* Alerts & RACI Disciplinary Breakdown */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Box 1: RACI Penalties */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm space-y-3">
                     <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                           <Icon name="alertOctagon" size={16} className="text-rose-400" />
                           <span>สรุปการตัดแต้มตาม 7 กฎกติกา SLA (RACI Attribution)</span>
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                           {telemetry.penalties.length} รายการ
                        </span>
                     </div>

                     {telemetry.penalties.length === 0 ? (
                        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-1">
                           <span className="text-xs font-bold text-emerald-300 block">✅ ไม่พบการทำผิดกฎกติกา SLA</span>
                           <p className="text-[11px] text-slate-400">พนักงานมีวินัยการทำงานและปฏิบัติตามมาตรฐานกระบวนการของโครงการอย่างสมบูรณ์</p>
                        </div>
                     ) : (
                        <div className="space-y-2">
                           {telemetry.penalties.map((pen, pIdx) => (
                              <div key={pIdx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3 text-xs">
                                 <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                       <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                          แกน {pen.axis.toUpperCase()}
                                       </span>
                                       <strong className="text-slate-200">{pen.reason}</strong>
                                    </div>
                                 </div>
                                 <span className="text-xs font-black text-rose-400 shrink-0 font-mono">
                                    -{pen.points} แต้ม
                                 </span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Box 2: 45-day Spare Parts Ceiling & Disciplinary Revocation */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm space-y-3">
                     <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                           <Icon name="package" size={16} className="text-amber-400" />
                           <span>เพดานอนุโลมรออะไหล่ 45 วัน &amp; การระงับสิทธิ์</span>
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                           telemetry.sparePartsOver45Days > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                           {telemetry.sparePartsOver45Days > 0 ? `เกินเพดาน ${telemetry.sparePartsOver45Days} งาน` : 'อยู่ในเกณฑ์'}
                        </span>
                     </div>

                     <p className="text-[11px] text-slate-400 leading-relaxed">
                        กฎข้อที่ 6: งานที่ติดปัญหารออะไหล่จะได้รับการอนุโลมไม่นำมาคิดเป็นงานค้างได้สูงสุด <strong>45 วัน</strong> หากเกินกว่านั้นระบบจะดึงเข้าสู่ตารางตรวจสอบทันที และหากตรวจสอบพบว่าอะไหล่มาถึงแล้วแต่ไม่ดำเนินการ จะถูกสั่งระงับสิทธิ์และประทับตราตัดคะแนนวินัย
                     </p>

                     {telemetry.penaltySparePartsTasks > 0 && (
                        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
                           <Icon name="shieldAlert" size={16} className="text-rose-400 shrink-0 mt-0.5" />
                           <div>
                              <strong className="font-black text-rose-300 block">🚨 พบงานที่ถูกประทับตรา "ผิดเงื่อนไขรออะไหล่" ({telemetry.penaltySparePartsTasks} รายการ)</strong>
                              <span>มีคำสั่งวินัยจากผู้ดูแลระงับสิทธิ์การอนุโลม เนื่องจากอะไหล่ถึงหน้างานแล้วแต่งานไม่คืบหน้า</span>
                           </div>
                        </div>
                     )}

                     {telemetry.alerts && telemetry.alerts.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                           {telemetry.alerts.map((al, aIdx) => (
                              <div key={aIdx} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-[11px] text-amber-200 flex items-start gap-2">
                                 <Icon name="alertTriangle" size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                 <div>
                                    <strong className="block text-amber-300 font-bold">{al.title}</strong>
                                    <span className="text-slate-300">{al.desc}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               {/* Discrepancy Tasks Audit Table */}
               {(() => {
                  const allDiscrepancies = telemetry.discrepancyTasks || [];
                  const affectingDiscrepancies = allDiscrepancies.filter(item => doesDiscrepancyPenalizeStaff(item, telemetry.roleType));
                  const waivedDiscrepancies = allDiscrepancies.filter(item => item.attribution?.role === 'waived');
                  const priorResolvedDiscrepancies = telemetry.priorResolvedDiscrepancies || [];

                  const displayedDiscrepancies = discrepancyViewFilter === 'affecting'
                     ? affectingDiscrepancies
                     : discrepancyViewFilter === 'waived'
                     ? waivedDiscrepancies
                     : discrepancyViewFilter === 'history'
                     ? priorResolvedDiscrepancies
                     : allDiscrepancies;

                  return (
                     <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm space-y-4">
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                           <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                 <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                    <Icon name="scale" size={17} className="text-[#C5A059]" />
                                    <span>ระบบตรวจสอบงานข้อขัดแย้ง &amp; วินิจฉัยความรับผิดชอบ (Discrepancy Audit &amp; RACI)</span>
                                 </h4>
                                 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300">
                                    รอบ: {evalMonth}
                                 </span>
                                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                                    ✓ ก.ย. 2569 เป็นต้นไป (Go-Live)
                                 </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                 ตรวจสอบรายการผิดกติกา SLA พร้อมระบุ RACI Attribution เพื่อให้หัวหน้างาน/ผู้ดูแลตรวจสอบและตัดสินใจ (งานที่ตัดสินแล้วในเดือนก่อนหน้าจะไม่นำมาแสดงซ้ำ)
                              </p>
                           </div>
                           <div className="flex items-center gap-2">
                              <input
                                 type="month"
                                 value={evalMonth}
                                 onChange={e => setEvalMonth(e.target.value)}
                                 className="border border-white/15 bg-black/40 hover:bg-black/60 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                                 title="เลือกรอบเดือนที่ต้องการประเมิน"
                              />
                              <button
                                 type="button"
                                 onClick={() => {
                                    setAuditInitialTaskId(null);
                                    setDiscrepancyModalOpen(true);
                                 }}
                                 className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7A1C28] to-[#5A141E] hover:from-[#8F2230] hover:to-[#6E1824] text-white font-bold text-xs flex items-center gap-1.5 shadow-md border border-[#C5A059]/30 transition cursor-pointer"
                              >
                                 <Icon name="gavel" size={13} className="text-[#C5A059]" />
                                 <span>เปิดห้องตัดสินเต็มรูปแบบ</span>
                              </button>
                           </div>
                        </div>

                        {/* Executive RACI Explainer Callout Box */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950/90 to-[#0F2E4A]/30 border border-white/10 text-xs space-y-2 text-slate-300">
                           <div className="flex items-center gap-2 text-white font-bold">
                              <Icon name="info" size={15} className="text-[#C5A059]" />
                              <span>หลักเกณฑ์การหักคะแนนตามความรับผิดชอบ (RACI Allocation Rule)</span>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 leading-relaxed">
                              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                                 <span className="text-amber-300 font-bold block mb-1">🛠️ ฝ่ายโฟร์แมน/วิศวกร (Foreman)</span>
                                 รับผิดชอบ: จบงานล่าช้ากว่ากำหนด (SLA), เลื่อนวันเริ่ม/จบย้อนหลัง, งานค้างหน้างานเกิน 7 วัน (70%), ติดปัญหารออะไหล่เกินเพดาน 45 วัน
                              </div>
                              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                                 <span className="text-sky-300 font-bold block mb-1">📋 ฝ่ายธุรการโครงการ (Admin)</span>
                                 รับผิดชอบ: ออกใบงานช้าเกิน 3 วัน (กฎข้อ 4), หลุดรอบส่งเบิกเงินวันที่ 15, เปิดใบงานซ้ำซ้อนจนยกเลิก <br/>
                                 <strong className="text-emerald-300 text-[10px]">*งานที่ระบุว่า "ธุรการ (Admin)" จะไม่ถูกนำมาหักคะแนนโฟร์แมน*</strong>
                              </div>
                           </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
                           <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs flex-wrap">
                              <button
                                 type="button"
                                 onClick={() => setDiscrepancyViewFilter('affecting')}
                                 className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    discrepancyViewFilter === 'affecting'
                                       ? 'bg-gradient-to-r from-[#7A1C28] to-[#55131C] text-white shadow-md border border-[#C5A059]/40'
                                       : 'text-slate-400 hover:text-white'
                                 }`}
                              >
                                 <Icon name="target" size={13} className={discrepancyViewFilter === 'affecting' ? 'text-[#C5A059]' : 'text-slate-400'} />
                                 <span>เฉพาะที่หักคะแนน {u?.name || 'พนักงาน'}</span>
                                 <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    affectingDiscrepancies.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500/25 text-emerald-300'
                                 }`}>
                                    {affectingDiscrepancies.length}
                                 </span>
                              </button>

                              <button
                                 type="button"
                                 onClick={() => setDiscrepancyViewFilter('all')}
                                 className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    discrepancyViewFilter === 'all'
                                       ? 'bg-slate-700 text-white shadow-md border border-white/20'
                                       : 'text-slate-400 hover:text-white'
                                 }`}
                              >
                                 <Icon name="layers" size={13} className="text-slate-400" />
                                 <span>งานขัดแย้งทั้งหมดรอบเดือนนี้</span>
                                 <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                                    {allDiscrepancies.length}
                                 </span>
                              </button>

                              <button
                                 type="button"
                                 onClick={() => setDiscrepancyViewFilter('waived')}
                                 className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    discrepancyViewFilter === 'waived'
                                       ? 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/50'
                                       : 'text-slate-400 hover:text-white'
                                 }`}
                              >
                                 <Icon name="shieldCheck" size={13} className="text-emerald-400" />
                                 <span>ยกเว้นแล้ว (Waived)</span>
                                 <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/60 text-emerald-300">
                                    {waivedDiscrepancies.length}
                                 </span>
                              </button>

                              {priorResolvedDiscrepancies.length > 0 && (
                                 <button
                                    type="button"
                                    onClick={() => setDiscrepancyViewFilter('history')}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                       discrepancyViewFilter === 'history'
                                          ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-500/50'
                                          : 'text-slate-400 hover:text-white'
                                    }`}
                                 >
                                    <Icon name="history" size={13} className="text-indigo-400" />
                                    <span>ประวัติตัดสินแล้วในเดือนก่อนหน้า</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900/60 text-indigo-300">
                                       {priorResolvedDiscrepancies.length}
                                    </span>
                                 </button>
                              )}
                           </div>

                           <span className="text-[11px] text-slate-400">
                              แสดง <strong>{displayedDiscrepancies.length}</strong> จาก {discrepancyViewFilter === 'history' ? priorResolvedDiscrepancies.length : allDiscrepancies.length} รายการ
                           </span>
                        </div>

                        {/* Table */}
                        {displayedDiscrepancies.length === 0 ? (
                           <div className="p-8 rounded-xl bg-white/5 border border-dashed border-white/10 text-center space-y-1.5">
                              <Icon name="checkCircle" size={32} className="text-emerald-400 mx-auto opacity-80" />
                              <span className="text-xs font-bold text-slate-200 block">
                                 {discrepancyViewFilter === 'affecting' 
                                    ? `✨ ไม่พบงานผิดเงื่อนไขที่มีผลหักคะแนน ${u?.name || 'พนักงาน'} ในรอบเดือนนี้`
                                    : discrepancyViewFilter === 'waived'
                                    ? 'ยังไม่มีรายการที่ได้รับการยกเว้น'
                                    : discrepancyViewFilter === 'history'
                                    ? 'ไม่มีประวัติงานที่ตัดสินเสร็จสิ้นในเดือนก่อนหน้า'
                                    : '✨ ไม่พบงานที่เข้าข่ายข้อขัดแย้งในรอบเดือนนี้'}
                              </span>
                              <p className="text-[11px] text-slate-400">
                                 {discrepancyViewFilter === 'affecting'
                                    ? 'งานอื่นๆ ในโครงการที่ตรวจพบเป็นความรับผิดชอบของฝ่ายธุรการหรือได้รับการยกเว้นแล้ว จึงไม่ถูกนำมาหักคะแนน'
                                    : 'ข้อมูลยึดตามวันที่เริ่มใช้งานจริงตั้งแต่ 1 กันยายน 2569 เป็นต้นไป'}
                              </p>
                           </div>
                        ) : (
                           <div className="overflow-x-auto rounded-xl border border-white/10">
                              <table className="w-full text-left text-xs border-collapse">
                                 <thead>
                                    <tr className="bg-slate-950/80 text-slate-400 border-b border-white/10">
                                       <th className="py-2.5 px-3 font-bold">#</th>
                                       <th className="py-2.5 px-3 font-bold">ใบงาน / โครงการ</th>
                                       <th className="py-2.5 px-3 font-bold">ประเภทข้อขัดแย้ง</th>
                                       <th className="py-2.5 px-3 font-bold">คำอธิบายหน้างาน</th>
                                       <th className="py-2.5 px-3 font-bold">RACI Attribution &amp; ผลกระทบ</th>
                                       <th className="py-2.5 px-3 font-bold text-center">การตัดสิน</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/5 text-slate-300">
                                    {displayedDiscrepancies.map((item, idx) => {
                                       const t = item.task || {};
                                       const attrRole = item.attribution?.role || 'foreman';
                                       const doesPenalize = doesDiscrepancyPenalizeStaff(item, telemetry.roleType);
                                       const isExplicit = item.attribution?.isExplicit;

                                       return (
                                          <tr 
                                             key={`${t.id || idx}-${idx}`} 
                                             onClick={() => {
                                                if (!isSupervisor) {
                                                   if (onOpenSupervisorModal) onOpenSupervisorModal();
                                                   else alert('กรุณาเข้าสู่โหมดผู้ดูแลเพื่อทำการตัดสินข้อขัดแย้ง');
                                                   return;
                                                }
                                                setAuditInitialTaskId(item.task.id);
                                                setDiscrepancyModalOpen(true);
                                             }}
                                             className="hover:bg-white/10 transition-colors cursor-pointer group"
                                             title="คลิกที่แถวเพื่อเปิดวินิจฉัย/ปรับสิทธิ์งานนี้"
                                          >
                                             <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{`${idx + 1}`}</td>
                                             <td className="py-2.5 px-3">
                                                <div className="font-bold text-white group-hover:text-amber-300 transition-colors truncate max-w-[190px]">{t.title || 'ไม่ระบุชื่อ'}</div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[190px]">{t.project || '-'} • แปลง/บ้าน: {t.houseNo || '-'}</div>
                                             </td>
                                             <td className="py-2.5 px-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                   item.ruleNo === 1 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                                   item.ruleNo === 4 ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                                                   item.ruleNo === 5 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                                   item.ruleNo === 6 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                                   item.ruleNo === 6.5 ? 'bg-rose-500/30 text-rose-300 border-rose-500/40' :
                                                   item.ruleNo === 0 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                                   'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                }`}>
                                                   {item.ruleNo > 0 ? `กฎข้อ ${item.ruleNo}: ${item.title}` : item.title}
                                                </span>
                                             </td>
                                             <td className="py-2.5 px-3 text-[11px] text-slate-300 max-w-[240px]">
                                                {item.desc}
                                             </td>
                                             <td className="py-2.5 px-3">
                                                <div className="space-y-1">
                                                   <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                         attrRole === 'admin' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' :
                                                         attrRole === 'foreman' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' :
                                                         attrRole === 'waived' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                                                         'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                                      }`}>
                                                         {attrRole === 'admin' ? '📋 ธุรการ (Admin)' :
                                                          attrRole === 'foreman' ? '🛠️ โฟร์แมน (Foreman)' :
                                                          attrRole === 'waived' ? '🛡️ ยกเว้น (Waived)' :
                                                          '🤝 รับผิดชอบร่วม (70/30)'}
                                                      </span>
                                                      {isExplicit && (
                                                         <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1 rounded border border-emerald-800">
                                                            ✓ ตัดสินแล้ว
                                                         </span>
                                                      )}
                                                   </div>

                                                   {/* Explicit Penalty Impact Indicator */}
                                                   <div>
                                                      {doesPenalize ? (
                                                         <span className="inline-block text-[9.5px] font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/30">
                                                            ⚠️ มีผลหักคะแนน {u?.name || 'พนักงาน'}
                                                         </span>
                                                      ) : attrRole === 'waived' ? (
                                                         <span className="inline-block text-[9.5px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                                            ✅ ยกเว้น • ไม่หักคะแนนใคร
                                                         </span>
                                                      ) : item.type === 'RESOLVED_PRIOR_MONTH' ? (
                                                         <span className="inline-block text-[9.5px] font-medium text-indigo-300 bg-indigo-950/50 px-1.5 py-0.2 rounded border border-indigo-500/30">
                                                            🏛️ ตัดสินเสร็จสิ้นในเดือนก่อนหน้า
                                                         </span>
                                                      ) : (
                                                         <span className="inline-block text-[9.5px] font-medium text-slate-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                                                            🛡️ งานของธุรการ • ไม่หักคะแนน {u?.name || 'พนักงาน'}
                                                         </span>
                                                      )}
                                                   </div>
                                                </div>
                                             </td>
                                             <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      if (!isSupervisor) {
                                                         if (onOpenSupervisorModal) onOpenSupervisorModal();
                                                         else alert('กรุณาเข้าสู่โหมดผู้ดูแลเพื่อทำการตัดสินข้อขัดแย้ง');
                                                         return;
                                                      }
                                                      setAuditInitialTaskId(item.task.id);
                                                      setDiscrepancyModalOpen(true);
                                                   }}
                                                   className="px-2.5 py-1 rounded bg-[#7A1C28]/80 hover:bg-[#7A1C28] text-white border border-[#C5A059]/40 text-[10.5px] font-bold transition shadow-xs flex items-center gap-1 mx-auto cursor-pointer"
                                                   title={isSupervisor ? "วินิจฉัย/ปรับสิทธิ์ความรับผิดชอบงานนี้" : "เข้าสู่โหมดผู้ดูแลเพื่อตัดสิน"}
                                                >
                                                   <Icon name="scale" size={11} className="text-[#C5A059]" />
                                                   <span>⚖️ ตัดสิน</span>
                                                </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </div>
                  );
               })()}
            </div>
         );
      })()}

      {/* =========================================================================
          SUB-TAB 3: TEAM ROSTER & SETTINGS
          ========================================================================= */}
      {activeSubTab === 'settings' && (
         <div className={`flex-1 w-full overflow-y-auto custom-scrollbar ${isFocusMode ? 'p-6 lg:p-10 max-w-7xl mx-auto' : 'p-5 lg:p-7'} space-y-6 text-left relative z-10`}>
            {/* Header Title */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
               <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                     <Icon name="settings" size={18} className="text-[#bca374]" />
                     <span>ตั้งค่าโปรไฟล์และข้อมูลศักยภาพพนักงาน</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                     แก้ไขข้อมูลพื้นฐาน คลาสสายอาชีพ สเตตัสศักยภาพ 6 มิติ และจัดการฐานข้อมูลทีม
                  </p>
               </div>
               <div className="flex items-center gap-2">
                  {teamForm.id && !selTeam?.isNew && (
                     <button
                        type="button"
                        onClick={() => setStaffReportModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                     >
                        <Icon name="printer" size={14} />
                        <span>รายงาน A4</span>
                     </button>
                  )}
                  <button
                     type="button"
                     onClick={saveTeam}
                     className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                  >
                     <Icon name="save" size={14} />
                     <span>บันทึกข้อมูล</span>
                  </button>
               </div>
            </div>

            {/* 2-Column Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               {/* Left: Complete Profile Editing Form */}
               <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-white/10 shadow-sm space-y-5 text-white">
                  {/* Avatar & Photo Upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-white/10">
                     <div className="relative group shrink-0">
                        <div className="w-24 h-24 rounded-full border-[3px] border-[#bca374] shadow-[0_0_20px_rgba(188,163,116,0.25)] overflow-hidden bg-[#0f2e4a] flex items-center justify-center relative z-10">
                           {teamForm.image ? (
                              <img src={teamForm.image} className="w-full h-full object-cover" alt={teamForm.name} />
                           ) : (
                              <Icon name="camera" size={28} className="text-[#bca374]/50" />
                           )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-gradient-to-tr from-[#bca374] to-[#e6d0a7] text-[#0f2e4a] p-2 rounded-full cursor-pointer shadow-md hover:scale-110 transition-transform z-20 border border-white">
                           <Icon name="upload" size={14} />
                           <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                     </div>
                     <div className="text-center sm:text-left">
                        <h4 className="font-bold text-sm text-white">รูปประจำตัวพนักงาน</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                           อัปโหลดภาพถ่ายตัวเต็มหรือครึ่งตัว ระบบรองรับการครอบตัดและปรับขนาดอัตโนมัติ
                        </p>
                        {teamForm.image && (
                           <button
                              type="button"
                              onClick={() => setTeamForm({ ...teamForm, image: '' })}
                              className="text-[10px] text-rose-400 hover:underline mt-1 inline-block"
                           >
                              ลบรูปภาพ
                           </button>
                        )}
                     </div>
                  </div>

                  {/* Name, Class & Email Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     <div>
                        <label className="text-xs font-bold text-slate-300 mb-1 block">ชื่อ - นามสกุล</label>
                        <input
                           type="text"
                           className="w-full border border-white/15 bg-slate-950/80 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-[#bca374] outline-none transition placeholder-slate-500"
                           placeholder="ชื่อพนักงาน..."
                           value={teamForm.name || ''}
                           onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-300 mb-1 block">คลาส (สายอาชีพ)</label>
                        <select
                           className="w-full border border-white/15 bg-slate-950/80 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-[#bca374] outline-none transition"
                           value={teamForm.classId || ''}
                           onChange={e => setTeamForm({ ...teamForm, classId: e.target.value })}
                        >
                           <option value="" className="bg-slate-900 text-slate-300">-- ไม่ระบุ --</option>
                           {(sets.staffClasses || []).map(c => (
                              <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                           ))}
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-300 mb-1 block">
                           อีเมล <span className="text-slate-500 font-normal">(@lh.co.th)</span>
                        </label>
                        <input
                           type="email"
                           className="w-full border border-white/15 bg-slate-950/80 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-[#bca374] outline-none transition placeholder-slate-500"
                           placeholder="username@lh.co.th"
                           value={teamForm.email || ''}
                           onChange={e => setTeamForm({ ...teamForm, email: e.target.value })}
                        />
                     </div>
                  </div>

                  {/* Assigned Projects Scope Section */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                     <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                           <label className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Icon name="mapPin" size={14} className="text-[#bca374]" />
                              <span>โครงการที่รับผิดชอบ (Assigned Projects Scope)</span>
                           </label>
                           <p className="text-[10px] text-slate-400 mt-0.5">
                              ผูกโยงสถิติงานภาคสนาม อัตรา SLA และรอบเบิกจ่ายสำหรับ Foreman และ Admin
                           </p>
                        </div>
                        <div className="flex items-center gap-2">
                           <button
                              type="button"
                              onClick={() => {
                                 const current = teamForm.assignedProjects || [];
                                 if (current.includes('ทั้งหมด')) {
                                    setTeamForm({ ...teamForm, assignedProjects: [] });
                                 } else {
                                    setTeamForm({ ...teamForm, assignedProjects: ['ทั้งหมด'] });
                                 }
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                                 (teamForm.assignedProjects || []).includes('ทั้งหมด')
                                    ? 'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-sm'
                                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                              }`}
                           >
                              <span>🌟 ทุกโครงการ (ทั้งหมด)</span>
                           </button>
                           {(teamForm.assignedProjects || []).length > 0 && !(teamForm.assignedProjects || []).includes('ทั้งหมด') && (
                              <button
                                 type="button"
                                 onClick={() => setTeamForm({ ...teamForm, assignedProjects: [] })}
                                 className="px-2 py-1 rounded-lg text-[10px] text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                              >
                                 ล้างการเลือก
                              </button>
                           )}
                        </div>
                     </div>

                     {/* Current Scope Status Banner */}
                     <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 text-[11px]">สถานะขอบเขตงาน:</span>
                        <div className="font-bold">
                           {(teamForm.assignedProjects || []).includes('ทั้งหมด') ? (
                              <span className="text-amber-300 flex items-center gap-1">
                                 🌟 ดูแลและผูกโยงทุกโครงการในระบบ (ทั้งหมด)
                              </span>
                           ) : (teamForm.assignedProjects || []).length > 0 ? (
                              <span className="text-[#e6d0a7]">
                                 ผูกโยงแล้ว {(teamForm.assignedProjects || []).length} โครงการ: {(teamForm.assignedProjects || []).join(', ')}
                              </span>
                           ) : (
                              <span className="text-rose-400 italic flex items-center gap-1">
                                 ⚠️ ยังไม่ได้ระบุโครงการ (สถิติงานภาคสนามและ SLA จะเป็น 0)
                              </span>
                           )}
                        </div>
                     </div>

                     {/* Project Selector Chips with Fast Search */}
                     {!(teamForm.assignedProjects || []).includes('ทั้งหมด') && (
                        <div className="space-y-2">
                           <input
                              type="text"
                              placeholder="พิมพ์ค้นหาโครงการเพื่อเลือก..."
                              className="w-full bg-slate-950/80 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#bca374] transition"
                              value={subTabProjSearch}
                              onChange={e => setSubTabProjSearch(e.target.value)}
                           />
                           <div className="max-h-48 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-slate-950/60 border border-white/10 flex flex-wrap gap-1.5">
                              {(sets.projects || [])
                                 .map(p => getProjName(p))
                                 .filter(pName => pName && pName.toLowerCase().includes(subTabProjSearch.toLowerCase()))
                                 .map(pName => {
                                    const isSelected = (teamForm.assignedProjects || []).includes(pName);
                                    return (
                                       <button
                                          key={pName}
                                          type="button"
                                          onClick={() => {
                                             const cur = (teamForm.assignedProjects || []).filter(x => x !== 'ทั้งหมด');
                                             const next = isSelected ? cur.filter(x => x !== pName) : [...cur, pName];
                                             setTeamForm({ ...teamForm, assignedProjects: next });
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                                             isSelected
                                                ? 'bg-[#bca374]/25 border-[#bca374] text-amber-200 shadow-xs'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                                          }`}
                                       >
                                          <span>{isSelected ? '✓' : '+'}</span>
                                          <span>{pName}</span>
                                       </button>
                                    );
                                 })}
                              {(sets.projects || []).length === 0 && (
                                 <span className="text-slate-500 text-xs p-2">ไม่มีรายชื่อโครงการในระบบ (กรุณาเพิ่มโครงการที่แท็บตั้งค่า)</span>
                              )}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* 6 Inner Stats */}
                  <div className="pt-3 border-t border-white/10">
                     <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-200">สเตตัสศักยภาพ 6 มิติ (Inner Stats - HOW)</label>
                        <span className="text-[10px] text-slate-400">เกณฑ์ 1 - 10 คะแนน</span>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                           { k: 'str', l: 'STR', f: 'พลังขับเคลื่อน & ตัดสินใจ', c: 'text-rose-400', bg: 'bg-rose-950/30', b: 'border-rose-500/30' },
                           { k: 'agi', l: 'AGI', f: 'ความรวดเร็ว & การปรับตัว', c: 'text-emerald-400', bg: 'bg-emerald-950/30', b: 'border-emerald-500/30' },
                           { k: 'dex', l: 'DEX', f: 'ความแม่นยำ & คุณภาพ', c: 'text-amber-400', bg: 'bg-amber-950/30', b: 'border-amber-500/30' },
                           { k: 'int', l: 'INT', f: 'ระบบเทคโนโลยี & จัดการ', c: 'text-sky-400', bg: 'bg-sky-950/30', b: 'border-sky-500/30' },
                           { k: 'con', l: 'CON', f: 'ความทรหด & คุมอารมณ์', c: 'text-orange-400', bg: 'bg-orange-950/30', b: 'border-orange-500/30' },
                           { k: 'sen', l: 'SEN', f: 'การเจรจา & เข้าใจผู้คน', c: 'text-purple-400', bg: 'bg-purple-950/30', b: 'border-purple-500/30' }
                        ].map(s => (
                           <div key={s.k} className={`p-2.5 rounded-xl border ${s.b} ${s.bg} flex items-center justify-between gap-2 shadow-2xs`}>
                              <div className="flex flex-col">
                                 <span className={`text-xs font-black ${s.c}`}>{s.l}</span>
                                 <span className="text-[9px] font-bold text-slate-400">{s.f}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#bca374]"
                                    value={Number(teamForm[s.k]) || 5}
                                    onChange={e => setTeamForm({ ...teamForm, [s.k]: Number(e.target.value) || 1 })}
                                 />
                                 <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className={`w-9 text-center text-sm font-black bg-slate-950 rounded border border-white/20 py-0.5 outline-none ${s.c}`}
                                    value={Number(teamForm[s.k]) || 5}
                                    onChange={e => setTeamForm({ ...teamForm, [s.k]: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
                                 />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Save & Action Buttons */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2.5">
                     <button
                        type="button"
                        onClick={saveTeam}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                     >
                        <Icon name="save" size={15} />
                        <span>บันทึกข้อมูลพนักงาน</span>
                     </button>

                     {teamForm.id && !selTeam?.isNew && (
                        <button
                           type="button"
                           onClick={() => {
                              setTeamForm({ ...selTeam });
                              setActiveSubTab('performance');
                           }}
                           className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition border border-white/10"
                        >
                           ยกเลิก
                        </button>
                     )}

                     {teamForm.id && (
                        <button
                           type="button"
                           onClick={() => {
                              if (!isSupervisor) {
                                 if (onOpenSupervisorModal) onOpenSupervisorModal();
                                 else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อลบพนักงาน');
                                 return;
                              }
                              if (confirm('ยืนยันการลบพนักงานคนนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                                 let ns = (sets.staffStats || []).filter(x => x.id !== teamForm.id);
                                 const newSets = { ...sets, staffStats: ns };
                                 setSets(newSets);
                                 saveD('settings', newSets);
                                 setSelTeam(null);
                                 setTeamForm({ id: '', name: '', classId: '', image: '', str: 5, agi: 5, dex: 5, int: 5, con: 5, sen: 5 });
                                 setActiveSubTab('performance');
                              }
                           }}
                           className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition"
                           title="ลบพนักงาน"
                        >
                           <Icon name="trash" size={16} />
                        </button>
                     )}
                  </div>
               </div>

               {/* Right: Management & Calibration Tools */}
               <div className="lg:col-span-5 space-y-4">
                  {/* Calibration Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-white/10 shadow-sm text-white space-y-3">
                     <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                           <Icon name="sliders" size={18} />
                        </span>
                        <div>
                           <h4 className="font-bold text-sm text-white">ตรวจสอบเทียบระดับทั้งทีม (Calibration)</h4>
                           <span className="text-[10px] text-slate-400">ป้องกันเกรดเฟ้อและปรับสมดุล Bell Curve</span>
                        </div>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed">
                        ระบบเปรียบเทียบสเตตัสพนักงานทั้งทีมเพื่อจัดกลุ่มตามเกณฑ์มาตรฐานองค์กร LH ควบคุมการกระจายตัวของความสามารถในแต่ละสายอาชีพ
                     </p>
                     <button
                        type="button"
                        onClick={() => {
                           if (!isSupervisor) {
                              if (onOpenSupervisorModal) onOpenSupervisorModal();
                              else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อตรวจสอบเทียบระดับศักยภาพทั้งทีม');
                              return;
                           }
                           setCalibrationModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                     >
                        <Icon name="sliders" size={14} />
                        <span>เปิดระบบ Talent Calibration ทั้งทีม</span>
                     </button>
                  </div>

                  {/* Excel Bulk Upload Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm text-white space-y-3">
                     <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                           <Icon name="upload" size={18} />
                        </span>
                        <div>
                           <h4 className="font-bold text-sm text-white">นำเข้าข้อมูลผ่าน Excel</h4>
                           <span className="text-[10px] text-slate-400">อัปเดตสเตตัสและผลประเมินแบบกลุ่ม</span>
                        </div>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed">
                        อัปโหลดแบบประเมินผลทีม (.xlsx, .xls) ระบบจะคำนวณสเตตัส 6 มิติและระบุ Archetype Identity ให้โดยอัตโนมัติ
                     </p>
                     <label className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                        <Icon name="fileSpreadsheet" size={15} />
                        <span>เลือกไฟล์ Excel (.xlsx, .xls)</span>
                        <input
                           type="file"
                           accept=".xlsx, .xls"
                           className="hidden"
                           onChange={e => {
                              if (!isSupervisor) {
                                 if (onOpenSupervisorModal) onOpenSupervisorModal();
                                 else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อนำเข้าไฟล์ Excel');
                                 return;
                              }
                              handleExcelUpload(e);
                           }}
                        />
                     </label>
                  </div>
               </div>
            </div>
         </div>
      )}

      </div>
   </>
);
};

function renderAnalysis() {
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
             <span className="block text-slate-600 leading-relaxed ml-3">{styleDesc}</span>
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
    };

    return (
      <div className="flex flex-col md:flex-row gap-6 animate-in h-auto md:h-full pb-10">
        <div className="w-full md:w-72 bg-white border rounded-xl shadow-sm flex flex-col min-h-[300px] max-h-[350px] md:max-h-none md:h-full shrink-0">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl gap-1">
            <h3 className="font-bold text-[#0f2e4a] text-sm truncate">รายชื่อทีมงาน</h3>
            <div className="flex items-center gap-1.5 shrink-0">
               <button 
                 type="button" 
                 onClick={() => {
                   if (!isSupervisor) {
                     if (onOpenSupervisorModal) onOpenSupervisorModal();
                     else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อตรวจสอบเทียบระดับศักยภาพทั้งทีม');
                     return;
                   }
                   setCalibrationModalOpen(true);
                 }} 
                 title="ตรวจสอบและเทียบระดับศักยภาพทั้งทีม (Talent Calibration)"
                 className="bg-slate-800 hover:bg-slate-900 text-amber-300 text-[11px] px-2 py-1 rounded flex items-center transition shadow-xs font-bold border border-slate-700 cursor-pointer"
               >
                 <Icon name="sliders" size={11} className="mr-1 text-amber-400" /> ตรวจสอบทีม
               </button>
               <button type="button" onClick={() => { if (!selTeam && !teamForm.id && sList.length > 0) handleSelectStaff(sList[0]); setIsFocusMode(true); }} title="เปิดห้องตัดสินเต็มจอ (Focus Theater Mode)" className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-[11px] px-2 py-1 rounded flex items-center transition shadow-xs font-bold cursor-pointer"><Icon name="maximize2" size={11} className="mr-1 text-amber-200" /> ห้องตัดสิน</button>
               <label className="bg-indigo-600 text-white text-[11px] px-2 py-1 rounded hover:bg-indigo-700 cursor-pointer flex items-center transition shadow-sm">
                 <Icon name="upload" size={12} className="mr-1" /> Excel
                 <input 
                   type="file" 
                   accept=".xlsx, .xls" 
                   className="hidden" 
                   onChange={(e) => {
                     if (!isSupervisor) {
                       if (onOpenSupervisorModal) onOpenSupervisorModal();
                       else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อนำเข้าไฟล์ Excel');
                       return;
                     }
                     handleExcelUpload(e);
                   }} 
                 />
               </label>
               <button 
                 type="button" 
                 onClick={() => {
                   if (!isSupervisor) {
                     if (onOpenSupervisorModal) onOpenSupervisorModal();
                     else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อเพิ่มพนักงานใหม่');
                     return;
                   }
                   setSelTeam({isNew: true}); 
                   setTeamForm({id:'', name:'', classId:'', image:'', assignedProjects: [], email: '', str:5, agi:5, dex:5, int:5, con:5, sen:5});
                   setActiveSubTab('settings');
                 }} 
                 className="bg-[#bca374] text-white text-[11px] px-2 py-1 rounded hover:bg-[#a38a5b] transition shadow-sm cursor-pointer"
               >
                 + เพิ่ม
               </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
            {sList.map(s => (
              <div key={s.id} onClick={() => {
                setSelTeam(s);
                const assigned = (s.assignedProjects && s.assignedProjects.length > 0) ? s.assignedProjects : getStaffAssignedProjects(s, sets);
                setTeamForm({ ...s, assignedProjects: assigned, email: s.email || '' });
              }} className={`flex items-center p-2 rounded-lg cursor-pointer transition ${selTeam?.id===s.id ? 'bg-[#0f2e4a] text-white' : 'hover:bg-blue-50 text-gray-700'}`}>
                {s.image ? <img src={s.image} className="w-8 h-8 rounded-full object-cover mr-3 border border-white/50" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-xs font-bold ${selTeam?.id===s.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{(s?.name || '').substring(0,2)}</div>}
                <div className="truncate flex-1">
                  <div className="font-bold text-sm truncate">{s.name}</div>
                  <div className={`text-[10px] ${selTeam?.id===s.id ? 'text-blue-200' : 'text-gray-400'}`}>{classMap[s.classId]?.name || 'ไม่ระบุคลาส'}</div>
                  <div className={`text-[9px] ${selTeam?.id===s.id ? 'text-[#e6d0a7]' : 'text-[#bca374]'} font-bold truncate mt-0.5`}>{getArchetypeIdentity(s) || s.potentialIdentity}</div>
                </div>
                {selTeam?.id === s.id && (
                  <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { handleSelectStaff(s); setIsFocusMode(true); }} title="เปิดห้องตัดสินเต็มจอ (Focus Mode)" className="p-1 rounded bg-white/20 hover:bg-white/30 text-amber-300 transition"><Icon name="maximize2" size={11} /></button>
                    <button type="button" onClick={() => handleOpenInNewTab(s.id)} title="เปิดในแท็บใหม่" className="p-1 rounded bg-white/20 hover:bg-white/30 text-sky-200 transition"><Icon name="externalLink" size={11} /></button>
                  </div>
                )}
              </div>
            ))}
            {sList.length === 0 && <div className="text-center text-xs text-gray-400 p-4">ยังไม่มีรายชื่อทีมงาน<br/>กด "+ เพิ่ม" เพื่อสร้างใหม่</div>}
          </div>
        </div>

        {/* Fullscreen Focus Theater Portal */}
        {isFocusMode && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9990] w-screen h-screen m-0 p-0 rounded-none border-0 bg-[#060A14] overflow-hidden flex flex-col font-sans select-none animate-in fade-in duration-200">
            {renderCinematicView()}
          </div>,
          document.body
        )}

        {/* Regular In-page Container */}
        <div className="flex-1 bg-white border border-slate-200/80 flex flex-col rounded-xl shadow-card h-auto md:h-full overflow-hidden">
          {(!selTeam && !teamForm.name && !teamForm.id) ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
               <Icon name="users" size={64} className="mb-4 opacity-40 text-slate-300" />
               <p className="font-bold text-slate-600">เลือกทีมงานจากเมนูด้านซ้าย</p>
               <p className="text-xs text-slate-400 mt-1">หรือกด "+ เพิ่ม" เพื่อสร้างโปรไฟล์ใหม่</p>
             </div>
          ) : (
             !isFocusMode && renderCinematicView()
          )}
        </div>
        <StaffAssessmentReportModal 
          isOpen={staffReportModalOpen} 
          onClose={() => setStaffReportModalOpen(false)} 
          staff={teamForm?.id ? teamForm : selTeam} 
          sets={sets} 
          tasks={tasks}
          evalMonth={evalMonth}
          Icon={Icon} 
        />
        <AITalentAdvisorModal
          isOpen={aiAdvisorModalOpen}
          onClose={() => setAiAdvisorModalOpen(false)}
          staff={teamForm?.id ? teamForm : selTeam}
          sets={sets}
          tasks={tasks}
          evalMonth={evalMonth}
          archetypesData={archetypesData}
          initialViewMode={talentViewMode}
        />
        <TeamCalibrationModal
          isOpen={calibrationModalOpen}
          onClose={() => setCalibrationModalOpen(false)}
          staffList={sList}
          sets={sets}
          archetypesData={archetypesData}
          onSelectStaff={(staff) => {
            setSelTeam(staff);
            const assigned = (staff.assignedProjects && staff.assignedProjects.length > 0) ? staff.assignedProjects : getStaffAssignedProjects(staff, sets);
            setTeamForm({ ...staff, assignedProjects: assigned, email: staff.email || '' });
          }}
        />
        <DiscrepancyAuditModal
          isOpen={discrepancyModalOpen}
          onClose={() => {
            setDiscrepancyModalOpen(false);
            setAuditInitialTaskId(null);
          }}
          staff={teamForm?.id ? teamForm : selTeam}
          tasks={tasks}
          discrepancyTasks={modalTelemetry.discrepancyTasks || []}
          priorResolvedTasks={modalTelemetry.priorResolvedDiscrepancies || []}
          currentMonth={evalMonth}
          initialTaskId={auditInitialTaskId}
          saveD={saveD}
          isSupervisor={isSupervisor}
          supervisorSession={supervisorSession}
          onOpenSupervisorModal={onOpenSupervisorModal}
          Icon={Icon}
        />
      </div>
    );
  };
