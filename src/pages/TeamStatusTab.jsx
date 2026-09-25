import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import ClassEmblem from '../ClassEmblem';
import AssessmentModal from '../AssessmentModal';
import RadarChart from '../components/charts/RadarChart';
import StaffAssessmentReportModal from '../components/reports/StaffAssessmentReportModal';
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
  DATA_ANCHOR_GUIDE
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
  setAlert: _setAlert
}) {
  const [assessMode, setAssessMode] = useState(false);
  const [selectedRadarAxis, setSelectedRadarAxis] = useState(null);
  const [cinematicViewMode, setCinematicViewMode] = useState('avatar');
  const [staffReportModalOpen, setStaffReportModalOpen] = useState(false);
    if (!teamUnlk) return (<div className="bg-white p-8 rounded-xl shadow border text-center max-w-sm mx-auto mt-10"><h2 className="text-lg font-bold mb-4 text-[#0f2e4a]">เข้าสู่ระบบทีมงาน</h2><input type="password" placeholder="รหัสผ่าน" className="border p-3 rounded-lg w-full mb-4 text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-[#bca374]" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pwd==='1312'&&setTeamUnlk(true)} /><button type="button" onClick={()=>pwd==='1312'&&setTeamUnlk(true)} className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-4 py-2 rounded-lg w-full font-bold transition">ยืนยัน</button></div>);

    const sList = sets.staffStats || [];
    const classMap = (sets.staffClasses||[]).reduce((a,c)=>{a[c.id]=c; return a;},{});
    
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
      if (!u.id) return null;
      const role = classMap[u.classId];

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

      const bottomDescText = (
        <span className="flex flex-col gap-1.5 mt-2 bg-stone-900/40 p-2.5 rounded-lg border border-stone-800/50">
          {archObj.strengths && archObj.strengths !== '-' && (
            <span className="flex items-start"><span className="text-emerald-400 font-bold mr-1 shrink-0">จุดเด่นของสายอาชีพ:</span> <span>{archObj.strengths}</span></span>
          )}
          {archObj.weaknesses && archObj.weaknesses !== '-' && (
            <span className="flex items-start"><span className="text-rose-400 font-bold mr-1 shrink-0">จุดควรระวังประจำสาย:</span> <span>{archObj.weaknesses}</span></span>
          )}
          {archAnalysis.dynamicWeakness && (
            <span className="flex items-start"><span className={`font-bold mr-1 shrink-0 ${archAnalysis.weaknessColor || 'text-amber-400'}`}>{archAnalysis.weaknessLabel || 'ข้อเสนอแนะในการพัฒนา:'}</span> <span>{archAnalysis.dynamicWeakness}</span></span>
          )}
        </span>
      );

      const outers = [
        { k: 'cx', n: 'Customer Exp.', val: Math.round((statsObj.con + statsObj.sen)/2) },
        { k: 'tech', n: 'Tech. Expertise', val: Math.round((statsObj.int + statsObj.dex)/2) },
        { k: 'sla', n: 'Ops & SLA', val: Math.round((statsObj.agi + statsObj.dex)/2) },
        { k: 'crisis', n: 'Crisis Resolv.', val: Math.round((statsObj.str + statsObj.con)/2) },
        { k: 'resource', n: 'Resource Ctrl.', val: Math.round((statsObj.str + statsObj.sen)/2) },
        { k: 'innovation', n: 'Innovation', val: Math.round((statsObj.int + statsObj.sen)/2) }
      ].map(o => ({...o, finalVal: (u[o.k] !== null && u[o.k] !== undefined) ? u[o.k] : o.val}));

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
        <div key={u.id} className="animate-fade-in-up flex-1 w-full bg-[#08080c] relative overflow-y-auto custom-scrollbar flex flex-col md:flex-row shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] rounded-xl h-full min-h-[450px]">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#08080c] to-[#08080c] pointer-events-none"></div>
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#bca374] rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen translate-x-1/3 -translate-y-1/4"></div>

           <div className="w-full md:w-[55%] p-5 lg:p-8 z-10 flex flex-col border-r border-white/10 relative h-auto">
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setStaffReportModalOpen(true)} 
                    title="พิมพ์ / ส่งออกรายงานประเมินรายบุคคล (Character Sheet A4)" 
                    className="bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/30 text-sky-200 hover:text-white p-2 rounded-full backdrop-blur-sm transition shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center"
                  >
                    <Icon name="printer" size={18} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCinematicViewMode(cinematicViewMode === 'spider' ? 'avatar' : 'spider')} 
                    title={cinematicViewMode === 'spider' ? 'ดูภาพตัวละคร' : 'ดู Performance Spider Map'} 
                    className={`p-2 rounded-full backdrop-blur-sm transition border ${
                      cinematicViewMode === 'spider' 
                        ? 'bg-[#bca374] text-[#0f2e4a] border-[#e6d0a7] shadow-[0_0_15px_rgba(188,163,116,0.5)]' 
                        : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border-white/10'
                    }`}
                  >
                    <Icon name={cinematicViewMode === 'spider' ? 'user' : 'network'} size={18} />
                  </button>
                  <button type="button" onClick={() => setTeamEditMode(true)} title="ตั้งค่าข้อมูลพื้นฐาน" className="bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 rounded-full backdrop-blur-sm transition">
                    <Icon name="settings" size={18} />
                  </button>
                  <button type="button" onClick={() => setAssessMode(true)} title="ประเมินศักยภาพบุคลากร" className="bg-[#bca374]/20 hover:bg-[#bca374]/40 border border-[#bca374]/30 text-[#e6d0a7] hover:text-white p-2 rounded-full backdrop-blur-sm transition shadow-[0_0_15px_rgba(188,163,116,0.3)]">
                    <Icon name="clipboard-check" size={18} />
                  </button>
                </div>

              <div className="animate-in fade-in slide-in-from-left-8 duration-700 mt-auto mb-auto py-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-5 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] group">
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-full mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                    <ClassEmblem archetypeKey={archetypeKey} size="100%" className="text-white transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="flex flex-col">
                    <h5 className="text-[#bca374] text-[10px] sm:text-xs lg:text-sm font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md flex flex-wrap items-center gap-2">
                       <span>{role?.name || 'ไม่ระบุสายอาชีพ'}</span>
                       {prefixText && <span className="bg-[#bca374]/20 text-[#e6d0a7] px-2 py-0.5 rounded text-[9px] border border-[#bca374]/30">{prefixText}</span>}
                    </h5>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg" style={{textShadow: '0 4px 20px rgba(188,163,116,0.3)'}}>
                       {enTitle}
                    </h1>
                  </div>
                </div>
                <div className="mb-4 lg:mb-5 border-l-4 border-[#bca374] pl-3">
                  <p className="text-[11px] sm:text-xs lg:text-sm text-slate-300 font-light italic mb-1 lg:mb-2">
                     "{styleDesc}"
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-[#bca374] leading-relaxed font-bold mb-1">
                     อัตลักษณ์ศักยภาพ: <span className="text-[#e6d0a7]">{identityText}</span>
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-400 leading-relaxed font-bold mb-0.5">
                     สไตล์: <span className="text-[#e6d0a7]">{thTitle}</span> {flavorText && <span className="text-[9px] text-slate-500 font-normal ml-1">({flavorText})</span>}
                  </p>
                  <p className="text-[9px] sm:text-[10px] lg:text-[11px] text-slate-300 leading-relaxed drop-shadow-md">
                     {bottomDescText}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 2xl:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3 mb-4 lg:mb-5">
                   {[
                     { l: 'STR', val: statsObj.str, c: 'from-rose-600 to-rose-400' },
                     { l: 'AGI', val: statsObj.agi, c: 'from-emerald-600 to-emerald-400' },
                     { l: 'DEX', val: statsObj.dex, c: 'from-amber-600 to-amber-400' },
                     { l: 'INT', val: statsObj.int, c: 'from-blue-600 to-blue-400' },
                     { l: 'CON', val: statsObj.con, c: 'from-orange-600 to-orange-400' },
                     { l: 'SEN', val: statsObj.sen, c: 'from-purple-600 to-purple-400' }
                   ].map(s => (
                     <div key={s.l} className="flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-slate-400 tracking-wider">{s.l}</span>
                           <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-white">{s.val}</span>
                        </div>
                        <div className="w-full h-1 lg:h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                           <div className={`h-full bg-gradient-to-r ${s.c} rounded-full`} style={{width: `${(s.val/10)*100}%`, boxShadow: '0 0 10px currentColor'}}></div>
                        </div>
                     </div>
                   ))}
                </div>

                {/* The Outer Layer Performance Intelligence */}
                {(() => {
                  const outerSummary = analyzeOuterLayer(u, statsObj);
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
                          const def = OUTER_DEFINITIONS[o.k] || {};
                          return (
                            <div 
                              key={o.k} 
                              className={`rounded-md p-1.5 flex flex-col backdrop-blur-md border transition-all duration-200 ${
                                isHigh 
                                  ? 'bg-[#bca374]/15 border-[#bca374]/40 shadow-[0_0_10px_rgba(188,163,116,0.15)]' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                              title={def.desc || o.n}
                            >
                              <span className="text-[7.5px] sm:text-[8px] text-slate-400 uppercase tracking-tighter truncate">{def.short || o.n}</span>
                              <span className={`font-black text-[11px] sm:text-xs leading-tight mt-0.5 ${isHigh ? 'text-[#e6d0a7]' : 'text-white'}`}>
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
           </div>

           <div className="w-full md:w-[45%] min-h-[300px] h-full flex items-start justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none"></div>
              
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4 lg:p-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
                {cinematicViewMode === 'spider' ? (
                  <div className="w-full flex flex-col items-center justify-center max-w-[320px] bg-slate-900/85 p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-300">
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
                      const o = analyzeOuterLayer(u, statsObj);
                      return (
                        <div className="w-full mt-2 text-left space-y-1.5 text-[10px]">
                          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-[#e6d0a7] font-black text-xs">{o.performanceDna.title}</strong>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${o.alignmentBadge}`}>
                                {o.alignmentTitle.split(' (')[0]}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-snug">{m.shapeDesc}</p>
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
                     <img src={u.image} className="max-w-[85%] max-h-[90%] object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] transform scale-105" style={{maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'}} alt="Character" />
                  ) : (
                     <div className="w-64 h-64 bg-slate-800/50 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                       <Icon name="user" size={64} className="text-slate-600" />
                     </div>
                  )
                )}
              </div>
              
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#08080c] to-transparent pointer-events-none z-20"></div>
              
              <div className="absolute bottom-10 -right-10 text-[150px] font-black text-white/5 whitespace-nowrap pointer-events-none z-0 transform -rotate-12 select-none tracking-tighter mix-blend-overlay">
                 {u.name.split(' ')[0]}
                           </div>
           </div>
        </div>
      </>);
    };

    const renderAnalysis = () => {
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

      return (
        <div className="mt-6 pt-4 w-full text-left relative z-10 font-sans">
          <h4 className="font-bold text-[#0f2e4a] text-sm flex items-center mb-3">
            <Icon name="user" size={16} className="mr-2 text-[#bca374]" /> วิเคราะห์ศักยภาพ & เกณฑ์มาตรฐานตำแหน่ง (Talent & Benchmark)
          </h4>

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
              <span className="font-bold text-slate-600 mr-1">สเตตัสเป้าหมาย:</span>
              {Object.entries(profile.targetStats).map(([k, v]) => {
                const isCore = profile.coreFocus.includes(k);
                return (
                  <span 
                    key={k} 
                    className={`px-2 py-0.5 rounded font-bold border ${
                      isCore 
                        ? 'bg-sky-100 text-sky-800 border-sky-300' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {k.toUpperCase()}: {v} {isCore && '★'}
                  </span>
                );
              })}
              <span className="text-[9px] text-slate-400 ml-1">(*★ = ทักษะหลักประจำตำแหน่ง)</span>
            </div>
          </div>
          
          {/* Work Style Tendency */}
          <div className="mb-4 text-[12px] p-3 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 shadow-xs relative z-10">
             <strong className="block mb-1 text-[#0f2e4a] font-bold">▶ แนวโน้มการทำงาน (Work Style Tendency):</strong>
             <span className="font-bold text-[#0f2e4a] text-sm block ml-3 mb-1">{mainStyle}</span>
             <span className="block text-slate-600 leading-relaxed ml-3">{styleDesc}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-2 relative z-10">
            {/* Signature Strengths (>= 7) */}
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 relative overflow-hidden">
              <strong className="text-emerald-800 text-[13px] flex items-center mb-2">
                <Icon name="trendingUp" size={14} className="mr-1.5 text-emerald-600"/> 
                จุดเด่นประจำตัว (Signature Strengths ≥ 7)
              </strong>
              {signatureStrengths.length > 0 ? (
                <ul className="text-[12px] text-slate-700 space-y-2 relative z-10 pl-2 border-l-2 border-emerald-300 ml-1">
                  {signatureStrengths.map(s => {
                    const isCore = profile.coreFocus.includes(s.key);
                    return (
                      <li key={s.key} className="py-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#0f2e4a]">{s.name} ({s.key.toUpperCase()})</span>
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
                  {standardPass.map(s => (
                    <span key={s.key} className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
                      <strong>{s.key.toUpperCase()}</strong>: {s.val}/10
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Developmental Considerations (<= 4) */}
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 relative overflow-hidden mt-1">
              <strong className="text-amber-900 text-[13px] flex items-center mb-2">
                <Icon name="alertCircle" size={14} className="mr-1.5 text-amber-600"/> 
                จุดที่ควรพิจารณาและสนับสนุน (Developmental Considerations ≤ 4)
              </strong>
              {considerations.length > 0 ? (
                <ul className="space-y-3 relative z-10 pl-2 border-l-2 border-amber-300 ml-1">
                  {considerations.map(s => (
                    <li key={s.key} className="text-slate-700 text-[12px] pb-2 border-b border-amber-100 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#0f2e4a]">{s.name} ({s.key.toUpperCase()})</strong>
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
                  ))}
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
                const outerSummary = analyzeOuterLayer(teamForm, statsObj);
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
      );
    };

    return (
      <div className="flex flex-col md:flex-row gap-6 animate-in h-auto md:h-full pb-10">
        <div className="w-full md:w-72 bg-white border rounded-xl shadow-sm flex flex-col min-h-[300px] max-h-[350px] md:max-h-none md:h-full shrink-0">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
            <h3 className="font-bold text-[#0f2e4a]">รายชื่อทีมงาน</h3>
            <div className="flex gap-2">
               <label className="bg-indigo-600 text-white text-[11px] px-2 py-1 rounded hover:bg-indigo-700 cursor-pointer flex items-center transition shadow-sm">
                 <Icon name="upload" size={12} className="mr-1" /> Excel
                 <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
               </label>
               <button type="button" onClick={()=>{setSelTeam({isNew: true}); setTeamForm({id:'', name:'', classId:'', image:'', str:5, agi:5, dex:5, int:5, con:5, sen:5});}} className="bg-[#bca374] text-white text-[11px] px-2 py-1 rounded hover:bg-[#a38a5b] transition shadow-sm">+ เพิ่ม</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
            {sList.map(s => (
              <div key={s.id} onClick={()=>{setSelTeam(s); setTeamForm({...s});}} className={`flex items-center p-2 rounded-lg cursor-pointer transition ${selTeam?.id===s.id ? 'bg-[#0f2e4a] text-white' : 'hover:bg-blue-50 text-gray-700'}`}>
                {s.image ? <img src={s.image} className="w-8 h-8 rounded-full object-cover mr-3 border border-white/50" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-xs font-bold ${selTeam?.id===s.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{(s?.name || '').substring(0,2)}</div>}
                <div className="truncate flex-1">
                  <div className="font-bold text-sm truncate">{s.name}</div>
                  <div className={`text-[10px] ${selTeam?.id===s.id ? 'text-blue-200' : 'text-gray-400'}`}>{classMap[s.classId]?.name || 'ไม่ระบุคลาส'}</div>
                  <div className={`text-[9px] ${selTeam?.id===s.id ? 'text-[#e6d0a7]' : 'text-[#bca374]'} font-bold truncate mt-0.5`}>{getArchetypeIdentity(s) || s.potentialIdentity}</div>
                </div>
              </div>
            ))}
            {sList.length === 0 && <div className="text-center text-xs text-gray-400 p-4">ยังไม่มีรายชื่อทีมงาน<br/>กด "+ เพิ่ม" เพื่อสร้างใหม่</div>}
          </div>
        </div>

        <div className="flex-1 bg-white border rounded-xl shadow-sm flex flex-col h-auto md:h-full overflow-hidden">
          {(!selTeam && !teamForm.name && !teamForm.id) ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
               <Icon name="users" size={64} className="mb-4 opacity-50" />
               <p className="font-bold">เลือกทีมงานจากเมนูด้านซ้าย</p>
               <p className="text-xs mt-1">หรือกด "+ เพิ่ม" เพื่อสร้างโปรไฟล์ใหม่</p>
             </div>
          ) : ( (!teamEditMode && teamForm.id && !selTeam?.isNew) ? renderCinematicView() : (
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
               <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                 <div className="w-full lg:w-1/2 flex flex-col items-center bg-white/90 p-4 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-[#bca374] to-transparent opacity-30"></div>
                    <div className="relative group mb-6 mt-2">
                      <div className="w-32 h-32 rounded-full border-[3px] border-[#bca374] shadow-[0_0_20px_rgba(188,163,116,0.3)] overflow-hidden bg-[#0f2e4a] flex items-center justify-center relative z-10">
                        {teamForm.image ? <img src={teamForm.image} className="w-full h-full object-cover" /> : <Icon name="camera" size={32} className="text-[#bca374]/50"/>}
                      </div>
                      <div className="absolute -inset-2 border-2 border-dashed border-[#bca374]/30 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none"></div>
                      <label className="absolute bottom-0 right-0 bg-gradient-to-tr from-[#bca374] to-[#e6d0a7] text-[#0f2e4a] p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform z-20 border border-white/50">
                        <Icon name="upload" size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">ชื่อ - นามสกุล</label>
                        <input type="text" className="w-full border rounded-lg px-4 py-2 text-sm font-bold text-[#0f2e4a] focus:ring-2 focus:ring-[#bca374] outline-none" placeholder="ชื่อพนักงาน..." value={teamForm.name} onChange={e=>setTeamForm({...teamForm, name:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">คลาส (สายอาชีพ)</label>
                        <select className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#bca374] outline-none" value={teamForm.classId} onChange={e=>setTeamForm({...teamForm, classId:e.target.value})}>
                          <option value="">-- ไม่ระบุ --</option>
                          {(sets.staffClasses||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-4 border-t border-slate-100 mt-2">
                        {[{k:'str',l:'STR',f:'พลังขับเคลื่อน & ตัดสินใจ',c:'text-rose-600',bg:'bg-rose-50',b:'border-rose-200'},{k:'agi',l:'AGI',f:'ความรวดเร็ว & การปรับตัว',c:'text-emerald-600',bg:'bg-emerald-50',b:'border-emerald-200'},{k:'dex',l:'DEX',f:'ความแม่นยำ & คุณภาพ',c:'text-amber-600',bg:'bg-amber-50',b:'border-amber-200'},{k:'int',l:'INT',f:'ระบบเทคโนโลยี & จัดการ',c:'text-blue-600',bg:'bg-blue-50',b:'border-blue-200'},{k:'con',l:'CON',f:'ความทรหด & คุมอารมณ์',c:'text-orange-600',bg:'bg-orange-50',b:'border-orange-200'},{k:'sen',l:'SEN',f:'การเจรจา & เข้าใจผู้คน',c:'text-purple-600',bg:'bg-purple-50',b:'border-purple-200'}].map(s=>(
                          <div key={s.k} className={`flex items-center justify-between ${s.bg} p-2 rounded-lg border ${s.b} shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]`}>
                            <div className="flex flex-col">
                              <label className={`text-[12px] font-black ${s.c} leading-none`}>{s.l}</label>
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{s.f}</label>
                            </div>
                            <input type="number" min="1" max="10" className={`w-10 text-center text-[14px] font-black border-b-2 border-transparent focus:${s.b} bg-transparent outline-none ${s.c}`} value={teamForm[s.k]} onChange={e=>setTeamForm({...teamForm, [s.k]: Number(e.target.value)||1})} />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button type="button" onClick={saveTeam} className="flex-1 bg-[#0f2e4a] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-[#1a3f63] flex justify-center items-center"><Icon name="save" size={16} className="mr-2"/> บันทึกข้อมูล</button>
                        {teamForm.id && !selTeam?.isNew && (
                          <button 
                            type="button" 
                            onClick={() => setStaffReportModalOpen(true)} 
                            title="พิมพ์ / ส่งออกรายงานประเมินรายบุคคล (Character Sheet A4)" 
                            className="bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-2.5 rounded-lg font-bold border border-sky-200 flex items-center shadow-xs transition"
                          >
                            <Icon name="printer" size={16} className="mr-1.5" /> รายงาน A4
                          </button>
                        )}
                        {teamForm.id && !selTeam?.isNew && <button type="button" onClick={()=>{setTeamEditMode(false); setTeamForm({...selTeam});}} className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>}
                        {teamForm.id && <button type="button" onClick={()=>{if(confirm('ลบพนักงานคนนี้?')){ let ns=(sets.staffStats||[]).filter(x=>x.id!==teamForm.id); const newSets = {...sets, staffStats: ns}; setSets(newSets); saveD('settings', newSets); setSelTeam(null); setTeamForm({id:'', name:'', classId:'', image:'', str:5, agi:5, dex:5, int:5, con:5, sen:5}); }}} className="bg-red-50 text-red-500 p-2.5 rounded-lg border border-red-200 hover:bg-red-100"><Icon name="trash" size={16}/></button>}
                      </div>
                    </div>
                 </div>

                 <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-slate-100 relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0f2e4a] to-transparent opacity-20"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-100/50 via-transparent to-transparent pointer-events-none"></div>
                    <div className="w-full mt-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
                       <h4 className="font-bold text-[#0f2e4a] mb-1 text-center tracking-wider flex items-center justify-center text-sm">
                          <Icon name="swords" size={18} className="mr-2 text-[#bca374]"/> PERFORMANCE SPIDER MAP
                        </h4>
                        <p className="text-[10px] text-slate-400 text-center mb-4">
                          คลิกที่แกนสเตตัสเพื่อเจาะลึกคำอธิบายรายมิติ
                        </p>
                        <div className="w-full max-w-[280px] aspect-square">
                          <RadarChart 
                             userStats={[teamForm.str, teamForm.agi, teamForm.dex, teamForm.int, teamForm.con, teamForm.sen]}
                             selectedAxis={selectedRadarAxis}
                             onSelectAxis={(idx, key) => setSelectedRadarAxis(selectedRadarAxis === key ? null : key)}
                             showBaseline={true}
                             roleTargetStats={getRoleTargetProfile(classMap[teamForm.classId] || teamForm.classId || teamForm.potentialIdentity).targetStats}
                          />
                        </div>

                        {/* Radar Legend */}
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 mb-1 text-[10px] font-medium text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-2 rounded bg-gradient-to-r from-[#0f2e4a] to-[#1e3a8a]"></span>
                            <span>ประเมินจริง</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0 border-t-2 border-dashed border-[#bca374]"></span>
                            <span>ฐานมาตรฐาน (5)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0 border-t-2 border-dashed border-[#0284c7]"></span>
                            <span>เป้าหมาย ({getRoleTargetProfile(classMap[teamForm.classId] || teamForm.classId || teamForm.potentialIdentity).shortRole})</span>
                          </span>
                        </div>

                        {/* Radar Morphology Live Interpretation Card */}
                        {(() => {
                          const statsObj = { 
                            str: Number(teamForm.str) || 5, 
                            agi: Number(teamForm.agi) || 5, 
                            dex: Number(teamForm.dex) || 5, 
                            int: Number(teamForm.int) || 5, 
                            con: Number(teamForm.con) || 5, 
                            sen: Number(teamForm.sen) || 5 
                          };
                          const morph = analyzeRadarMorphology(statsObj);
                          
                          return (
                            <div className="w-full mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm text-left">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${morph.badgeColor}`}>
                                  {morph.shapeName}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  พื้นที่ครอบคลุม: <strong className="text-[#0f2e4a]">{morph.coveragePct}%</strong>
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                                {morph.shapeDesc}
                              </p>
                              <div className="text-[10px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 space-y-1">
                                <div><strong>🎯 จุดเน้นหลัก:</strong> {morph.topFocus}</div>
                                <div className="text-indigo-900"><strong>💡 การจัดสรรงาน:</strong> {morph.managementAdvice}</div>
                              </div>

                              {/* Interactive Axis Inspector Detail Box */}
                              {selectedRadarAxis && (() => {
                                const statKey = selectedRadarAxis.toLowerCase();
                                const statDef = STAT_DEFINITIONS[statKey];
                                const val = statsObj[statKey];
                                const lvlText = getStatLevelText(val);
                                const rubricText = getRubricText(statKey, val);
                                const anchorGuide = DATA_ANCHOR_GUIDE[statKey];
                                
                                return (
                                  <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
                                    <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-amber-200/60">
                                      <strong className="text-[#0f2e4a] flex items-center gap-1.5 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#bca374]"></span>
                                        {statDef.label} ({statDef.name}) : ระดับ {val}/10 ({lvlText})
                                      </strong>
                                      <button 
                                        type="button" 
                                        onClick={() => setSelectedRadarAxis(null)} 
                                        className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-amber-100 font-semibold"
                                      >
                                        ✕ ปิด
                                      </button>
                                    </div>
                                    <p className="text-slate-700 text-[10.5px] leading-relaxed mb-2">
                                      <strong className="text-slate-900">พฤติกรรมหน้างาน:</strong> {rubricText}
                                    </p>

                                    {/* LH Operational Data Grounding */}
                                    {anchorGuide && (
                                      <div className="mb-2 p-2 rounded-lg bg-white/90 border border-amber-200/70 space-y-1 text-[10px]">
                                        <div className="text-[#0f2e4a] flex items-start gap-1">
                                          <span className="font-bold shrink-0">📊 แหล่งข้อมูลอ้างอิง LH:</span>
                                          <span className="text-slate-700">{anchorGuide.lhSource}</span>
                                        </div>
                                        <div className="text-indigo-950 flex items-start gap-1">
                                          <span className="font-bold shrink-0">⚖️ เกณฑ์มาตรฐาน 5 คะแนน:</span>
                                          <span className="text-indigo-900 font-medium">{anchorGuide.level5Rule}</span>
                                        </div>
                                      </div>
                                    )}

                                    <div className="text-[9.5px] text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-100 font-medium">
                                      🚀 <strong>เกณฑ์สู่ระดับถัดไป:</strong> {val >= 9 ? 'รักษามาตรฐานระดับปรมาจารย์ และเป็นพี่เลี้ยงถ่ายทอดความรู้แก่ทีม' : 'พัฒนาความเร็วและความสม่ำเสมอในงานซ้ำซ้อน และลดข้อผิดพลาดหน้างาน'}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}

                        <div className="w-full mt-6 border-t border-slate-100"></div>
                        {renderAnalysis()}
                    </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
        <StaffAssessmentReportModal 
          isOpen={staffReportModalOpen} 
          onClose={() => setStaffReportModalOpen(false)} 
          staff={teamForm?.id ? teamForm : selTeam} 
          sets={sets} 
          Icon={Icon} 
        />
      </div>
    );
  };
